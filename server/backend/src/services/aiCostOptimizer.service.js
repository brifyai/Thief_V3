// ========================================
// AI COST OPTIMIZER SERVICE
// Optimización de costos para llamadas a IA
// ========================================

const crypto = require('crypto');
const { getRedisClient } = require('../utils/redisSingleton');
const { AppError } = require('../utils/AppError');

class AICostOptimizer {
  constructor() {
    this.redisClient = null;
    this.cacheEnabled = true;
    this.cacheTTL = {
      sentiment: 3600, // 1 hora
      categorization: 7200, // 2 horas
      search: 1800, // 30 minutos
      clustering: 3600 // 1 hora
    };
    this.costThresholds = {
      maxTokensPerRequest: 4000,
      maxRetries: 2,
      minConfidenceForCache: 0.7
    };
  }

  /**
   * Inicializa el servicio
   */
  async initialize() {
    try {
      this.redisClient = await getRedisClient();
      console.log('🤖 AI Cost Optimizer inicializado');
    } catch (error) {
      console.warn('⚠️ AI Cost Optimizer sin Redis, cache deshabilitado');
      this.cacheEnabled = false;
    }
  }

  /**
   * Genera un hash para el cache basado en el contenido
   */
  generateCacheKey(type, content, options = {}) {
    const hashInput = `${type}:${JSON.stringify(content)}:${JSON.stringify(options)}`;
    return `ai_cache:${type}:${crypto.createHash('md5').update(hashInput).digest('hex')}`;
  }

  /**
   * Verifica si hay una respuesta en cache
   */
  async getCachedResponse(type, content, options = {}) {
    if (!this.cacheEnabled || !this.redisClient) {
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(type, content, options);
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        console.log(`💾 Cache HIT para ${type}: ${cacheKey.substring(0, 20)}...`);
        return data;
      }
      
      console.log(`🔍 Cache MISS para ${type}: ${cacheKey.substring(0, 20)}...`);
      return null;
    } catch (error) {
      console.warn('⚠️ Error al leer cache:', error.message);
      return null;
    }
  }

  /**
   * Almacena una respuesta en cache
   */
  async setCachedResponse(type, content, response, options = {}) {
    if (!this.cacheEnabled || !this.redisClient) {
      return;
    }

    try {
      // Solo cachear respuestas con alta confianza
      if (response.confidence && response.confidence < this.costThresholds.minConfidenceForCache) {
        console.log(`⚠️ Respuesta con baja confianza (${response.confidence}), no se cachea`);
        return;
      }

      const cacheKey = this.generateCacheKey(type, content, options);
      const ttl = this.cacheTTL[type] || 3600;
      
      await this.redisClient.setex(cacheKey, ttl, JSON.stringify(response));
      console.log(`💾 Cache SET para ${type}: ${cacheKey.substring(0, 20)}... (TTL: ${ttl}s)`);
    } catch (error) {
      console.warn('⚠️ Error al escribir cache:', error.message);
    }
  }

  /**
   * Optimiza el contenido para reducir tokens
   */
  optimizeContent(content, maxLength = 1000) {
    if (!content) return '';
    
    // Eliminar espacios extras y caracteres innecesarios
    let optimized = content
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, ' ')
      .trim();

    // Truncar si es muy largo
    if (optimized.length > maxLength) {
      optimized = optimized.substring(0, maxLength) + '...';
    }

    return optimized;
  }

  /**
   * Optimiza prompts para reducir tokens manteniendo efectividad
   */
  optimizePrompt(originalPrompt, type) {
    const optimizations = {
      sentiment: {
        system: `Analiza sentimiento. Responde JSON: {"sentiment":"positive|negative|neutral","score":0.0-1.0,"keywords":[],"reason":""}`,
        maxTokens: 150
      },
      categorization: {
        system: `Categoriza noticia. Categorías: política,economía,deportes,tecnología,salud,educación,entretenimiento,seguridad,medio ambiente,internacional,sociedad,general. Responde JSON: {"category":"","region":null,"confidence":0.0}`,
        maxTokens: 100
      },
      search: {
        system: `Eres un experto en análisis semántico de búsquedas de noticias. Interpreta la consulta del usuario y extrae conceptos significativos.

REGLAS IMPORTANTES:
1. Para búsquedas simples (1-2 palabras), sé CONSERVADOR con los filtros
2. Solo asigna categoría/region si es 100% evidente y específico
3. Prioriza conceptos semánticos sobre filtros estrictos
4. Para nombres propios, genera variantes y conceptos relacionados

CATEGORÍAS DISPONIBLES: política,economía,deportes,tecnología,salud,educación,entretenimiento,seguridad,medio ambiente,internacional,sociedad,general
REGIONES: Nacional, Metropolitana, etc. (solo si se menciona explícitamente)

RESPONDE EN JSON EXACTAMENTE ASÍ:
{
  "searchTerms": ["término1", "término2"],
  "semanticConcepts": ["concepto_específico1", "concepto_específico2"],
  "category": null, // Solo si es evidente
  "region": null,  // Solo si se menciona explícitamente
  "explanation": "Búsqueda interpretada",
  "confidence": 0.9

EJEMPLOS:
- "jara" → searchTerms: ["jara"], semanticConcepts: ["jara", "jeannette_jara"], category: null, region: null
- "Jeannette Jara" → semanticConcepts: ["jeannette_jara", "candidata_presidencial"], category: "política"
- "Deportes destacados" → semanticConcepts: ["deportes", "fútbol", "competiciones"], category: "deportes"
- "politica internacional" → semanticConcepts: ["politica", "internacional", "relaciones"], category: "política"

IMPORTANTE: Para búsquedas cortas como "jara", NO apliques filtros de región. Usa conceptos semánticos en su lugar.`,
        maxTokens: 300
      },
      clustering: {
        system: `Agrupa artículos por temas. Máximo 5 clusters. Responde JSON: {"clusters":[{"theme":"","article_ids":[],"keywords":[]}]}`,
        maxTokens: 400
      }
    };

    const optimization = optimizations[type];
    if (!optimization) {
      return { prompt: originalPrompt, maxTokens: 500 };
    }

    return {
      prompt: optimization.system,
      maxTokens: optimization.maxTokens
    };
  }

  /**
   * Ejecuta una llamada a IA con optimización de costos
   */
  async executeWithOptimization(type, content, aiFunction, options = {}) {
    const startTime = Date.now();
    let cacheHit = false;
    
    try {
      // 1. Verificar cache primero
      const cached = await this.getCachedResponse(type, content, options);
      if (cached) {
        cacheHit = true;
        return {
          ...cached,
          cached: true,
          executionTime: Date.now() - startTime
        };
      }

      // 2. Optimizar contenido
      const optimizedContent = this.optimizeContent(content, options.maxLength || 1000);
      
      // 3. Ejecutar función de IA
      console.log(`🤖 Ejecutando ${type} con contenido optimizado (${optimizedContent.length} chars)`);
      const response = await aiFunction(optimizedContent, options);
      
      // 4. Almacenar en cache si es apropiado
      await this.setCachedResponse(type, content, response, options);
      
      return {
        ...response,
        cached: false,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      console.error(`❌ Error en ${type} con optimización:`, error.message);
      
      // Fallback a método básico si existe
      if (options.fallback) {
        console.log(`🔄 Usando fallback para ${type}`);
        const fallbackResponse = await options.fallback(content);
        return {
          ...fallbackResponse,
          cached: false,
          fallback: true,
          executionTime: Date.now() - startTime
        };
      }
      
      throw error;
    }
  }

  /**
   * Procesamiento batch optimizado
   */
  async executeBatchOptimized(items, type, aiFunction, options = {}) {
    const { batchSize = 3, delay = 500, useCache = true } = options;
    const results = [];
    
    console.log(`📦 Procesando batch de ${items.length} items (${type})`);

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Procesar batch en paralelo
      const batchPromises = batch.map(async (item, index) => {
        const globalIndex = i + index;
        
        // Verificar cache si está habilitado
        if (useCache) {
          const cached = await this.getCachedResponse(type, item.content || item, options);
          if (cached) {
            return {
              index: globalIndex,
              ...cached,
              cached: true
            };
          }
        }
        
        // Ejecutar función de IA
        try {
          const response = await aiFunction(item, options);
          
          // Almacenar en cache
          if (useCache) {
            await this.setCachedResponse(type, item.content || item, response, options);
          }
          
          return {
            index: globalIndex,
            ...response,
            cached: false
          };
        } catch (error) {
          console.error(`❌ Error en item ${globalIndex}:`, error.message);
          
          // Usar fallback si está disponible
          if (options.fallback) {
            const fallbackResponse = await options.fallback(item);
            return {
              index: globalIndex,
              ...fallbackResponse,
              cached: false,
              fallback: true
            };
          }
          
          return {
            index: globalIndex,
            error: error.message,
            cached: false
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Pausa entre batches para evitar rate limiting
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Ordenar resultados por índice original
    results.sort((a, b) => a.index - b.index);
    
    const cacheHits = results.filter(r => r.cached).length;
    console.log(`✅ Batch completado: ${cacheHits}/${results.length} desde cache`);
    
    return results;
  }

  /**
   * Limpia cache antiguo
   */
  async cleanupCache() {
    if (!this.cacheEnabled || !this.redisClient) {
      return;
    }

    try {
      const pattern = 'ai_cache:*';
      const keys = await this.redisClient.keys(pattern);
      
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        console.log(`🧹 Limpiados ${keys.length} entradas de cache de IA`);
      }
    } catch (error) {
      console.warn('⚠️ Error al limpiar cache:', error.message);
    }
  }

  /**
   * Obtiene estadísticas del cache
   */
  async getCacheStats() {
    if (!this.cacheEnabled || !this.redisClient) {
      return { enabled: false };
    }

    try {
      const patterns = ['ai_cache:sentiment:*', 'ai_cache:categorization:*', 'ai_cache:search:*', 'ai_cache:clustering:*'];
      const stats = { enabled: true };
      
      for (const pattern of patterns) {
        const type = pattern.split(':')[1];
        const keys = await this.redisClient.keys(pattern);
        stats[type] = keys.length;
      }
      
      stats.total = Object.values(stats).reduce((sum, count) => sum + (typeof count === 'number' ? count : 0), 0);
      
      return stats;
    } catch (error) {
      console.warn('⚠️ Error al obtener estadísticas de cache:', error.message);
      return { enabled: true, error: error.message };
    }
  }
}

// Instancia singleton
const aiCostOptimizer = new AICostOptimizer();

module.exports = {
  aiCostOptimizer,
  AICostOptimizer
};