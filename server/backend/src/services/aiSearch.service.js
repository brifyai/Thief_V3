// ========================================
// AI SEARCH SERVICE
// Búsqueda inteligente con IA
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
 * Procesa una consulta de búsqueda con IA
 * @param {string} query - Consulta del usuario
 * @returns {Promise<Object>} Interpretación de la IA
 */
async function intelligentSearch(query) {
  try {
    return await aiCostOptimizer.executeWithOptimization(
      'search',
      query,
      async (optimizedQuery) => {
        const promptOptimization = aiCostOptimizer.optimizePrompt('', 'search');
        
        const completion = await trackAICallSimple('search', async () => {
          return await groq.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: promptOptimization.prompt + ` Categorías: política,economía,deportes,tecnología,salud,educación,entretenimiento,seguridad,medio ambiente,internacional,sociedad,general.`
              },
              {
                role: 'user',
                content: `Interpreta: "${optimizedQuery}"`
              }
            ],
            model: config.aiModel,
            temperature: 0.3,
            max_tokens: promptOptimization.maxTokens
          });
        }, {
          model: config.aiModel,
          promptLength: optimizedQuery.length,
          endpoint: '/api/search/ai'
        });

        const response = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(response);
        
        return {
          explanation: result.explanation || 'Búsqueda general',
          searchTerms: result.searchTerms || [query],
          semanticConcepts: result.semanticConcepts || [],
          category: result.category || null,
          region: result.region || null,
          domain: result.domain || null,
          confidence: result.confidence || 0.7
        };
      },
      {
        maxLength: 150, // Optimizado para consultas de búsqueda
        fallback: () => ({
          explanation: `Búsqueda de: ${query}`,
          searchTerms: query.split(' ').filter(t => t.length > 2).slice(0, 5),
          semanticConcepts: [],
          category: null,
          region: null,
          domain: null,
          confidence: 0.5,
          fallback: true
        })
      }
    );
    
  } catch (error) {
    console.error('Error en interpretación con IA:', error);
    // Fallback: búsqueda básica
    return {
      explanation: `Búsqueda de: ${query}`,
      searchTerms: query.split(' ').filter(t => t.length > 2).slice(0, 5),
      semanticConcepts: [],
      category: null,
      region: null,
      domain: null,
      confidence: 0.5,
      fallback: true
    };
  }
}

/**
 * Genera un preview del contenido resaltando términos de búsqueda
 * @param {string} content - Contenido completo
 * @param {Array<string>} searchTerms - Términos de búsqueda
 * @returns {string} Preview del contenido
 */
function generateContentPreview(content, searchTerms) {
  if (!content) return '';
  
  const maxLength = 300;
  
  if (!searchTerms || searchTerms.length === 0) {
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;
  }

  // Buscar la primera ocurrencia de cualquier término
  const lowerContent = content.toLowerCase();
  let bestIndex = -1;
  let bestTerm = '';
  
  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase();
    const index = lowerContent.indexOf(lowerTerm);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
      bestTerm = term;
    }
  }
  
  if (bestIndex === -1) {
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;
  }

  // Extraer contexto alrededor del término
  const start = Math.max(0, bestIndex - 100);
  const end = Math.min(content.length, bestIndex + bestTerm.length + 200);
  
  let preview = content.substring(start, end);
  
  if (start > 0) preview = '...' + preview;
  if (end < content.length) preview = preview + '...';
  
  return preview;
}

module.exports = {
  intelligentSearch,
  generateContentPreview
};
