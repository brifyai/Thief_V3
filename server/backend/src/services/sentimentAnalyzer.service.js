// ========================================
// SENTIMENT ANALYZER SERVICE
// Análisis de sentimiento y agrupación por temas
// ========================================

const Groq = require('groq-sdk');
const config = require('../config/env');
const { aiCostOptimizer } = require('./aiCostOptimizer.service');
const { AppError } = require('../utils/AppError');
const { trackAICallSimple } = require('../utils/aiWrapper');

const groq = new Groq({ apiKey: config.chutesApiKey });

// Inicializar el optimizador de costos
aiCostOptimizer.initialize().catch(console.warn);

/**
 * Analiza el sentimiento de un texto
 * @param {string} text - Texto a analizar
 * @returns {Promise<Object>} { sentiment: 'positive'|'negative'|'neutral', score: 0-1, keywords: [] }
 */
async function analyzeSentiment(text) {
  try {
    return await aiCostOptimizer.executeWithOptimization(
      'sentiment',
      text,
      async (optimizedText) => {
        const promptOptimization = aiCostOptimizer.optimizePrompt('', 'sentiment');
        
        const completion = await trackAICallSimple('sentiment', async () => {
          return await groq.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: promptOptimization.prompt
              },
              {
                role: 'user',
                content: `Analiza: ${optimizedText}`
              }
            ],
            model: config.aiModel,
            temperature: 0.3,
            max_tokens: promptOptimization.maxTokens
          });
        }, {
          model: config.aiModel,
          promptLength: optimizedText.length
        });

        const response = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(response);
        
        return {
          sentiment: result.sentiment || 'neutral',
          score: result.score || 0.5,
          keywords: result.keywords || [],
          reason: result.reason || '',
          confidence: result.score || 0.5
        };
      },
      {
        maxLength: 800, // Reducido para optimizar
        fallback: () => basicSentimentAnalysis(text)
      }
    );
    
  } catch (error) {
    console.error('Error en análisis de sentimiento:', error);
    // Fallback: análisis básico por palabras clave
    return basicSentimentAnalysis(text);
  }
}

/**
 * Análisis de sentimiento básico (fallback sin IA)
 */
function basicSentimentAnalysis(text) {
  const lowerText = text.toLowerCase();
  
  const positiveWords = ['éxito', 'logro', 'victoria', 'crecimiento', 'mejora', 'avance', 'positivo', 'bueno', 'excelente', 'feliz', 'alegría'];
  const negativeWords = ['crisis', 'problema', 'fracaso', 'pérdida', 'caída', 'negativo', 'malo', 'terrible', 'triste', 'preocupación', 'conflicto'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });
  
  let sentiment = 'neutral';
  let score = 0.5;
  
  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    score = Math.min(0.5 + (positiveCount * 0.1), 1.0);
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    score = Math.max(0.5 - (negativeCount * 0.1), 0.0);
  }
  
  return {
    sentiment,
    score,
    keywords: [],
    reason: 'Análisis básico por palabras clave'
  };
}

/**
 * Agrupa artículos por temas similares usando IA
 * @param {Array} articles - Array de artículos con { id, title, content }
 * @returns {Promise<Object>} { clusters: [{ theme: '', articles: [], keywords: [] }] }
 */
async function clusterByTheme(articles) {
  try {
    if (!articles || articles.length === 0) {
      return { clusters: [] };
    }
    
    // Limitar a 15 artículos para no saturar la IA (reducido de 20)
    const limitedArticles = articles.slice(0, 15);
    
    // Crear resumen optimizado de títulos
    const titlesSummary = limitedArticles.map((a, i) =>
      `${i + 1}. ${aiCostOptimizer.optimizeContent(a.title || 'Sin título', 60)}`
    ).join('\n');
    
    return await aiCostOptimizer.executeWithOptimization(
      'clustering',
      titlesSummary,
      async (optimizedContent) => {
        const promptOptimization = aiCostOptimizer.optimizePrompt('', 'clustering');
        
        const completion = await trackAICallSimple('clustering', async () => {
          return await groq.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: promptOptimization.prompt
              },
              {
                role: 'user',
                content: `Artículos:\n${optimizedContent}`
              }
            ],
            model: config.aiModel,
            temperature: 0.4,
            max_tokens: promptOptimization.maxTokens
          });
        }, {
          model: config.aiModel,
          promptLength: optimizedContent.length
        });

        const response = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(response);
        
        // Mapear IDs de vuelta a los artículos originales
        const clusters = (result.clusters || []).map(cluster => ({
          theme: cluster.theme || 'Sin tema',
          articles: (cluster.article_ids || [])
            .map(id => limitedArticles[id - 1])
            .filter(Boolean),
          keywords: cluster.keywords || [],
          description: cluster.description || ''
        }));
        
        return { clusters, confidence: 0.8 };
      },
      {
        maxLength: 1500, // Limitar el contenido para clustering
        fallback: () => basicClusterByCategory(articles)
      }
    );
    
  } catch (error) {
    console.error('Error en agrupación por temas:', error);
    // Fallback: agrupación básica por categoría
    return basicClusterByCategory(articles);
  }
}

/**
 * Agrupación básica por categoría (fallback sin IA)
 */
function basicClusterByCategory(articles) {
  const clusters = {};
  
  articles.forEach(article => {
    const category = article.category || 'Sin categoría';
    
    if (!clusters[category]) {
      clusters[category] = {
        theme: category,
        articles: [],
        keywords: [],
        description: `Artículos de ${category}`
      };
    }
    
    clusters[category].articles.push(article);
  });
  
  return {
    clusters: Object.values(clusters).filter(c => c.articles.length >= 2)
  };
}

/**
 * Analiza múltiples artículos en batch
 * @param {Array} articles - Array de artículos con { id, title, content }
 * @returns {Promise<Array>} Array de artículos con sentiment agregado
 */
async function analyzeBatch(articles, options = {}) {
  const {
    includeSentiment = true,
    includeClustering = true,
    maxConcurrent = 5, // Aumentado para mejor rendimiento
    useCache = true
  } = options;
  
  console.log(`📊 Analizando ${articles.length} artículos con optimización de costos...`);
  
  let articlesWithSentiment = articles;
  
  // Análisis de sentimiento optimizado con batch processing
  if (includeSentiment) {
    const sentimentResults = await aiCostOptimizer.executeBatchOptimized(
      articles,
      'sentiment',
      async (article) => {
        const sentiment = await analyzeSentiment(article.content || article.title || '');
        return {
          ...article,
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
          sentimentKeywords: sentiment.keywords,
          sentimentReason: sentiment.reason,
          cached: sentiment.cached
        };
      },
      {
        batchSize: maxConcurrent,
        delay: 300, // Reducido para mejor rendimiento
        useCache: useCache,
        fallback: async (article) => {
          const fallback = basicSentimentAnalysis(article.content || article.title || '');
          return {
            ...article,
            sentiment: fallback.sentiment,
            sentimentScore: fallback.score,
            sentimentKeywords: fallback.keywords,
            sentimentReason: fallback.reason,
            fallback: true
          };
        }
      }
    );
    
    articlesWithSentiment = sentimentResults;
    
    // Estadísticas de cache
    const cacheHits = sentimentResults.filter(r => r.cached).length;
    const fallbacks = sentimentResults.filter(r => r.fallback).length;
    console.log(`📊 Sentimiento: ${cacheHits} desde cache, ${fallbacks} fallback, ${sentimentResults.length - cacheHits - fallbacks} nuevos`);
  }
  
  // Agrupación por temas
  let clusters = null;
  if (includeClustering) {
    const clusterResult = await clusterByTheme(articlesWithSentiment);
    clusters = clusterResult.clusters;
    
    if (clusterResult.cached) {
      console.log(`📚 Clustering desde cache: ${clusters.length} temas`);
    } else {
      console.log(`📚 Clustering nuevo: ${clusters.length} temas`);
    }
  }
  
  console.log(`✅ Análisis completado: ${articlesWithSentiment.length} artículos`);
  
  return {
    articles: articlesWithSentiment,
    clusters: clusters || [],
    stats: {
      total: articles.length,
      processed: articlesWithSentiment.length,
      cacheHits: articlesWithSentiment.filter(a => a.cached).length,
      fallbacks: articlesWithSentiment.filter(a => a.fallback).length
    }
  };
}

/**
 * Obtiene estadísticas de sentimiento
 */
function getSentimentStats(articles) {
  const stats = {
    total: articles.length,
    positive: 0,
    negative: 0,
    neutral: 0,
    averageScore: 0
  };
  
  let totalScore = 0;
  
  articles.forEach(article => {
    if (article.sentiment === 'positive') stats.positive++;
    else if (article.sentiment === 'negative') stats.negative++;
    else stats.neutral++;
    
    totalScore += article.sentimentScore || 0.5;
  });
  
  stats.averageScore = articles.length > 0 ? totalScore / articles.length : 0.5;
  
  return stats;
}

module.exports = {
  analyzeSentiment,
  clusterByTheme,
  analyzeBatch,
  getSentimentStats,
  basicSentimentAnalysis,
  basicClusterByCategory,
  aiCostOptimizer // Exportar para acceso a estadísticas
};
