const { supabase } = require('../config/database');
const Groq = require('groq-sdk');
const config = require('../config/env');
const { trackAICallSimple } = require('../utils/aiWrapper');

const groq = new Groq({ apiKey: config.chutesApiKey });

/**
 * 🔍 SERVICIO DE MONITOREO DE ENTIDADES - FASE 3 OPTIMIZADO
 * Detecta menciones y analiza sentimiento en noticias
 *
 * Mejoras FASE 3:
 * - Cache de usuarios por dominio (evita N+1 queries)
 * - Batch processing para análisis de sentimiento
 * - Rate limiting para llamadas a IA
 */
class EntityMonitorService {
  
  constructor() {
    // Cache de usuarios por dominio para evitar N+1 queries
    this.domainUsersCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    
    // Cache de entidades por usuario
    this.userEntitiesCache = new Map();
    this.entitiesCacheTimeout = 10 * 60 * 1000; // 10 minutos
    
    // Rate limiting para IA
    this.lastAIRequest = 0;
    this.aiRequestDelay = 1000; // 1 segundo entre llamadas
  }
  
  /**
   * Obtiene usuarios por dominio con cache
   * @param {string} domain - Dominio a buscar
   * @returns {Promise<Array>} Lista de user_ids
   */
  async getUsersByDomain(domain) {
    const cacheKey = `domain:${domain}`;
    const cached = this.domainUsersCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`📦 Cache hit para dominio: ${domain}`);
      return cached.userIds;
    }
    
    console.log(`🔍 Consultando usuarios para dominio: ${domain}`);
    const usersWithDomain = await prisma.userUrlSelection.findMany({
      where: {
        public_url: {
          domain: domain
        }
      },
      select: {
        user_id: true
      }
    });
    
    const userIds = usersWithDomain.map(u => u.user_id);
    
    // Guardar en cache
    this.domainUsersCache.set(cacheKey, {
      userIds,
      timestamp: Date.now()
    });
    
    console.log(`✅ Cache guardado para dominio ${domain}: ${userIds.length} usuarios`);
    return userIds;
  }
  
  /**
   * Obtiene entidades de usuario con cache
   * @param {Array} userIds - IDs de usuarios
   * @returns {Promise<Array>} Lista de entidades
   */
  async getEntitiesByUsers(userIds) {
    const cacheKey = `users:${userIds.sort().join(',')}`;
    const cached = this.userEntitiesCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.entitiesCacheTimeout) {
      console.log(`📦 Cache hit para entidades de ${userIds.length} usuarios`);
      return cached.entities;
    }
    
    console.log(`🔍 Consultando entidades para ${userIds.length} usuarios`);
    const entities = await prisma.entity.findMany({
      where: {
        user_id: { in: userIds },
        is_active: true
      },
      select: {
        id: true,
        user_id: true,
        name: true,
        aliases: true,
        case_sensitive: true,
        exact_match: true,
        type: true
      }
    });
    
    // Guardar en cache
    this.userEntitiesCache.set(cacheKey, {
      entities,
      timestamp: Date.now()
    });
    
    console.log(`✅ Cache guardado: ${entities.length} entidades`);
    return entities;
  }
  
  /**
   * Analiza sentimiento en batch para reducir llamadas a IA
   * @param {Array} mentions - Menciones a analizar
   * @returns {Promise<Array>} Menciones con análisis de sentimiento
   */
  async analyzeSentimentBatch(mentions) {
    const batchSize = 5;
    const results = [];
    
    console.log(`🤖 Analizando sentimiento en batch: ${mentions.length} menciones`);
    
    for (let i = 0; i < mentions.length; i += batchSize) {
      const batch = mentions.slice(i, i + batchSize);
      
      try {
        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastAIRequest;
        if (timeSinceLastRequest < this.aiRequestDelay) {
          await new Promise(resolve => setTimeout(resolve, this.aiRequestDelay - timeSinceLastRequest));
        }
        
        const batchResults = await Promise.allSettled(
          batch.map(mention => this.analyzeSentiment(
            mention.entity.name,
            mention.context,
            mention.scrapingResult
          ))
        );
        
        results.push(...batchResults.map((result, index) => ({
          ...batch[index],
          sentiment: result.value?.sentiment || 'NEUTRAL',
          sentiment_score: result.value?.sentiment_score || 0.0,
          sentiment_confidence: result.value?.sentiment_confidence || 0.5,
          keywords: result.value?.keywords || [],
          topics: result.value?.topics || [],
          tone: result.value?.tone || null,
          error: result.status === 'rejected' ? result.reason : null
        })));
        
        this.lastAIRequest = Date.now();
        
        // Pausa entre batches para evitar rate limiting
        if (i + batchSize < mentions.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error('❌ Error en batch de sentimiento:', error);
        // Fallback a análisis básico
        results.push(...batch.map(mention => ({
          ...mention,
          sentiment: 'NEUTRAL',
          sentiment_score: 0.0,
          sentiment_confidence: 0.5,
          keywords: [],
          topics: [],
          tone: null,
          error: 'Batch processing failed'
        })));
      }
    }
    
    console.log(`✅ Análisis completado: ${results.length} menciones`);
    return results;
  }
  
  /**
   * Limpia cache antiguo
   */
  cleanCache() {
    const now = Date.now();
    
    // Limpiar cache de dominios
    for (const [key, value] of this.domainUsersCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.domainUsersCache.delete(key);
      }
    }
    
    // Limpiar cache de entidades
    for (const [key, value] of this.userEntitiesCache.entries()) {
      if (now - value.timestamp > this.entitiesCacheTimeout) {
        this.userEntitiesCache.delete(key);
      }
    }
    
    console.log('🧹 Cache limpiado');
  }
  
  /**
   * Detecta menciones de todas las entidades activas en un artículo (OPTIMIZADO)
   * @param {Object} scrapingResult - Resultado de scraping
   * @returns {Promise<Array>} Menciones detectadas
   */
  async detectMentions(scrapingResult) {
    try {
      const { id, title, cleaned_content, content, domain, user_id } = scrapingResult;
      
      // 🔹 FASE 3: Obtener entidades con cache optimizado
      let entities = [];
      
      if (user_id) {
        // Noticia privada: solo entidades del usuario dueño
        entities = await this.getEntitiesByUsers([user_id]);
      } else {
        // Noticia pública: usar cache de usuarios por dominio
        const userIds = await this.getUsersByDomain(domain);
        
        if (userIds.length > 0) {
          entities = await this.getEntitiesByUsers(userIds);
        }
      }
      
      if (entities.length === 0) {
        return [];
      }
      
      const fullText = `${title || ''} ${cleaned_content || content || ''}`;
      const mentions = [];
      
      // Detectar menciones para cada entidad (sin análisis de sentimiento aún)
      for (const entity of entities) {
        const mention = await this.detectEntityInText(
          entity,
          fullText,
          title || '',
          scrapingResult,
          false // No analizar sentimiento aún
        );
        
        if (mention) {
          mentions.push(mention);
        }
      }
      
      // 🔹 FASE 3: Análisis de sentimiento en batch
      if (mentions.length > 0) {
        const mentionsWithSentiment = await this.analyzeSentimentBatch(mentions);
        console.log(`🔍 Detectadas ${mentionsWithSentiment.length} menciones en artículo ${id}`);
        return mentionsWithSentiment;
      }
      
      console.log(`🔍 Detectadas ${mentions.length} menciones en artículo ${id}`);
      return mentions;
      
    } catch (error) {
      console.error('❌ Error detectando menciones:', error);
      return []; // No fallar, retornar array vacío
    }
  }
  
  /**
   * Detecta si una entidad específica está mencionada en el texto (OPTIMIZADO)
   * @param {Object} entity - Entidad a buscar
   * @param {string} fullText - Texto completo
   * @param {string} title - Título del artículo
   * @param {Object} scrapingResult - Resultado completo
   * @param {boolean} analyzeSentiment - Si debe analizar sentimiento
   * @returns {Promise<Object|null>} Mención detectada o null
   */
  async detectEntityInText(entity, fullText, title, scrapingResult, analyzeSentiment = true) {
    try {
      // Construir lista de términos a buscar
      const searchTerms = [entity.name, ...entity.aliases];
      
      // Detectar mención
      let found = false;
      let matchedTerm = null;
      let context = null;
      let position = 0;
      let prominence = 0.5;
      
      for (const term of searchTerms) {
        const regex = this.buildSearchRegex(term, entity.case_sensitive, entity.exact_match);
        const match = fullText.match(regex);
        
        if (match) {
          found = true;
          matchedTerm = term;
          
          // Extraer contexto (150 chars antes y después)
          const matchIndex = match.index;
          const start = Math.max(0, matchIndex - 150);
          const end = Math.min(fullText.length, matchIndex + term.length + 150);
          context = fullText.substring(start, end).trim();
          
          // Calcular posición relativa (0-100%)
          position = fullText.length > 0 
            ? Math.min(100, Math.max(0, Math.round((matchIndex / fullText.length) * 100)))
            : 0;
          
          // Calcular prominencia (0.0-1.0)
          if (title && title.match(regex)) {
            prominence = 1.0; // Mención en título = máxima prominencia
          } else if (position < 10) {
            prominence = 0.9; // Primeros 10%
          } else if (position < 30) {
            prominence = 0.7; // Primeros 30%
          } else if (position < 70) {
            prominence = 0.5; // Medio
          } else {
            prominence = 0.3; // Final
          }
          
          // Asegurar que prominence esté en rango 0.0-1.0
          prominence = Math.min(1.0, Math.max(0.0, prominence));
          
          break;
        }
      }
      
      if (!found) {
        return null;
      }
      
      const mention = {
        entity_id: entity.id,
        scraping_result_id: scrapingResult.id,
        context,
        position,
        prominence,
        entity, // Guardar referencia para análisis batch
        scrapingResult // Guardar referencia para análisis batch
      };
      
      // Analizar sentimiento si se solicita
      if (analyzeSentiment) {
        const sentimentAnalysis = await this.analyzeSentiment(
          entity.name,
          context,
          scrapingResult
        );
        
        return {
          ...mention,
          ...sentimentAnalysis
        };
      }
      
      return mention;
      
    } catch (error) {
      console.error(`❌ Error detectando entidad ${entity.name}:`, error);
      return null;
    }
  }
  
  /**
   * Construye regex para búsqueda de entidad
   * @param {string} term - Término a buscar
   * @param {boolean} caseSensitive - Sensibilidad a mayúsculas
   * @param {boolean} exactMatch - Coincidencia exacta
   * @returns {RegExp} Expresión regular
   */
  buildSearchRegex(term, caseSensitive, exactMatch) {
    // Escapar caracteres especiales
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    let pattern;
    if (exactMatch) {
      // Coincidencia exacta con límites de palabra
      pattern = `\\b${escaped}\\b`;
    } else {
      // Coincidencia parcial
      pattern = escaped;
    }
    
    const flags = caseSensitive ? 'g' : 'gi';
    return new RegExp(pattern, flags);
  }
  
  /**
   * Analiza el sentimiento de una mención específica con IA
   * @param {string} entityName - Nombre de la entidad
   * @param {string} context - Contexto de la mención
   * @param {Object} scrapingResult - Resultado de scraping
   * @returns {Promise<Object>} Análisis de sentimiento
   */
  async analyzeSentiment(entityName, context, scrapingResult) {
    try {
      const prompt = `Analiza el sentimiento hacia "${entityName}" en este texto:

CONTEXTO:
${context}

${scrapingResult.domain ? `FUENTE: ${scrapingResult.domain}` : ''}
${scrapingResult.category ? `CATEGORÍA: ${scrapingResult.category}` : ''}

Responde en JSON:
{
  "sentiment": "POSITIVE|NEGATIVE|NEUTRAL|MIXED",
  "sentiment_score": -1.0 a 1.0,
  "sentiment_confidence": 0.0 a 1.0,
  "keywords": ["palabra1", "palabra2"],
  "topics": ["tema1", "tema2"],
  "tone": "crítico|elogioso|neutral|etc"
}`;
      
      console.log(`🤖 Analizando sentimiento para: ${entityName}`);
      
      const completion = await trackAICallSimple('entity', async () => {
        return await groq.chat.completions.create({
          model: config.aiModel,
          messages: [
            {
              role: 'system',
              content: 'Eres un experto analista de sentimiento. Analiza objetivamente.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 300,
          response_format: { type: 'json_object' }
        });
      }, {
        model: config.aiModel,
        promptLength: prompt.length
      });
      
      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('Respuesta vacía de la IA');
      }
      
      const analysis = JSON.parse(response);
      
      return {
        sentiment: this.normalizeSentiment(analysis.sentiment),
        sentiment_score: this.normalizeScore(analysis.sentiment_score),
        sentiment_confidence: analysis.sentiment_confidence || 0.7,
        keywords: analysis.keywords || [],
        topics: analysis.topics || [],
        tone: analysis.tone || null,
        analyzed_at: new Date(),
        tokens_used: completion.usage?.total_tokens || null
      };
      
    } catch (error) {
      console.error('❌ Error analizando sentimiento con IA:', error);
      
      // Fallback a análisis básico
      return this.basicSentimentAnalysis(context);
    }
  }
  
  /**
   * Normaliza el sentimiento a valores válidos
   * @param {string} sentiment - Sentimiento raw
   * @returns {string} Sentimiento normalizado
   */
  normalizeSentiment(sentiment) {
    const normalized = sentiment?.toUpperCase();
    const valid = ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED'];
    
    if (valid.includes(normalized)) {
      return normalized;
    }
    
    return 'NEUTRAL';
  }
  
  /**
   * Normaliza el score a rango -1.0 a 1.0
   * @param {number} score - Score raw
   * @returns {number} Score normalizado
   */
  normalizeScore(score) {
    const num = parseFloat(score);
    
    if (isNaN(num)) {
      return 0.0;
    }
    
    return Math.max(-1.0, Math.min(1.0, num));
  }
  
  /**
   * Análisis de sentimiento básico (fallback sin IA)
   * @param {string} text - Texto a analizar
   * @returns {Object} Análisis básico
   */
  basicSentimentAnalysis(text) {
    const positiveWords = ['excelente', 'bueno', 'éxito', 'logro', 'positivo', 'mejor', 'ganó', 'aprobó', 'destacado', 'líder'];
    const negativeWords = ['malo', 'fracaso', 'problema', 'crisis', 'negativo', 'peor', 'perdió', 'rechazó', 'crítica', 'escándalo'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.2;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.2;
    });
    
    score = Math.max(-1, Math.min(1, score));
    
    let sentiment = 'NEUTRAL';
    if (score > 0.2) sentiment = 'POSITIVE';
    else if (score < -0.2) sentiment = 'NEGATIVE';
    
    return {
      sentiment,
      sentiment_score: score,
      sentiment_confidence: 0.5,
      keywords: [],
      topics: [],
      tone: null,
      analyzed_at: new Date(),
      tokens_used: null
    };
  }
  
  /**
   * Guarda menciones en la base de datos
   * @param {Array} mentions - Menciones detectadas
   * @returns {Promise<Array>} Menciones guardadas
   */
  async saveMentions(mentions) {
    try {
      const saved = [];
      
      for (const mention of mentions) {
        try {
          // Verificar si ya existe (evitar duplicados)
          const existing = await prisma.entityMention.findUnique({
            where: {
              entity_id_scraping_result_id: {
                entity_id: mention.entity_id,
                scraping_result_id: mention.scraping_result_id
              }
            }
          });
          
          if (existing) {
            console.log(`⚠️  Mención ya existe: ${mention.entity_id} en ${mention.scraping_result_id}`);
            continue;
          }
          
          // Limpiar campos que no deben guardarse en BD
          const { entity, scrapingResult, error, ...mentionData } = mention;
          
          // Validar y limpiar datos
          const cleanedData = {
            ...mentionData,
            position: isNaN(mentionData.position) ? 0 : Math.round(mentionData.position),
            prominence: isNaN(mentionData.prominence) ? 0.5 : mentionData.prominence,
            sentiment_score: isNaN(mentionData.sentiment_score) ? 0 : mentionData.sentiment_score,
            sentiment_confidence: isNaN(mentionData.sentiment_confidence) ? 0.5 : mentionData.sentiment_confidence
          };
          
          // Guardar nueva mención
          const savedMention = await prisma.entityMention.create({
            data: cleanedData
          });
          
          saved.push(savedMention);
          
          // Actualizar last_analyzed de la entidad
          await prisma.entity.update({
            where: { id: mention.entity_id },
            data: { last_analyzed: new Date() }
          });
          
        } catch (error) {
          if (error.code !== 'P2002') { // Ignorar duplicados
            console.error('❌ Error guardando mención:', error);
          }
        }
      }
      
      console.log(`✅ Guardadas ${saved.length} menciones nuevas`);
      return saved;
      
    } catch (error) {
      console.error('❌ Error guardando menciones:', error);
      return [];
    }
  }
  
  /**
   * Procesa un batch de artículos para detectar menciones
   * @param {Array} scrapingResults - Resultados de scraping
   * @returns {Promise<Object>} Estadísticas del proceso
   */
  async processBatch(scrapingResults) {
    const startTime = Date.now();
    let totalMentions = 0;
    let processedArticles = 0;
    let errors = 0;
    
    try {
      console.log(`📦 Procesando batch de ${scrapingResults.length} artículos`);
      
      for (const result of scrapingResults) {
        try {
          const mentions = await this.detectMentions(result);
          
          if (mentions.length > 0) {
            await this.saveMentions(mentions);
            totalMentions += mentions.length;
          }
          
          processedArticles++;
          
        } catch (error) {
          console.error(`❌ Error procesando artículo ${result.id}:`, error);
          errors++;
        }
      }
      
      const duration = Date.now() - startTime;
      
      const stats = {
        processed: processedArticles,
        mentions_found: totalMentions,
        errors,
        duration_ms: duration,
        avg_time_per_article: Math.round(duration / scrapingResults.length)
      };
      
      console.log('📊 Batch procesado:', stats);
      return stats;
      
    } catch (error) {
      console.error('❌ Error procesando batch:', error);
      throw error;
    }
  }
}

module.exports = new EntityMonitorService();
