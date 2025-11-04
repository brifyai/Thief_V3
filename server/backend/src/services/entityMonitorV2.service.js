const prisma = require('../config/database');
const entityAnalyzer = require('./entityAnalyzer.service');

/**
 * 🔍 SERVICIO DE MONITOREO DE ENTIDADES V2
 * Adaptador que integra el nuevo EntityAnalyzer con el sistema existente
 * Mantiene compatibilidad con el código actual
 */
class EntityMonitorV2Service {
  
  constructor() {
    // Cache de usuarios por dominio (mantener del sistema anterior)
    this.domainUsersCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    
    // Cache de entidades por usuario
    this.userEntitiesCache = new Map();
    this.entitiesCacheTimeout = 10 * 60 * 1000; // 10 minutos
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
   * Obtiene entidades de usuario con cache (INCLUYE CONFIGURACIÓN V2)
   * @param {Array} userIds - IDs de usuarios
   * @returns {Promise<Array>} Lista de entidades con configuración
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
        type: true,
        // 🆕 Campos V2
        analysis_context: true,
        positive_phrases: true,
        negative_phrases: true
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
   * Detecta menciones de todas las entidades activas en un artículo
   * @param {Object} scrapingResult - Resultado de scraping
   * @returns {Promise<Array>} Menciones detectadas con análisis V2
   */
  async detectMentions(scrapingResult) {
    try {
      const { id, title, cleaned_content, content, domain, user_id } = scrapingResult;
      
      // Obtener entidades con cache optimizado
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
      
      // Detectar menciones para cada entidad
      for (const entity of entities) {
        const mention = await this.detectEntityInText(
          entity,
          fullText,
          title || '',
          scrapingResult
        );
        
        if (mention) {
          mentions.push(mention);
        }
      }
      
      console.log(`🔍 Detectadas ${mentions.length} menciones en artículo ${id}`);
      return mentions;
      
    } catch (error) {
      console.error('❌ Error detectando menciones:', error);
      return [];
    }
  }
  
  /**
   * Detecta si una entidad específica está mencionada en el texto
   * y analiza el sentimiento usando EntityAnalyzer V2
   * @param {Object} entity - Entidad a buscar (con config V2)
   * @param {string} fullText - Texto completo
   * @param {string} title - Título del artículo
   * @param {Object} scrapingResult - Resultado completo
   * @returns {Promise<Object|null>} Mención detectada con análisis
   */
  async detectEntityInText(entity, fullText, title, scrapingResult) {
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
          
          // Extraer contexto (150 chars antes y después para detección)
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
      
      // 🆕 ANALIZAR SENTIMIENTO CON ENTITY ANALYZER V2
      console.log(`🤖 Analizando sentimiento V2 para: ${entity.name}`);
      
      const sentimentAnalysis = await entityAnalyzer.analyzeSentiment({
        entityName: entity.name,
        fullText: fullText,
        title: title,
        scrapingResult: scrapingResult,
        entityConfig: {
          analysis_context: entity.analysis_context,
          positive_phrases: entity.positive_phrases,
          negative_phrases: entity.negative_phrases
        }
      });
      
      // Construir mención completa
      return {
        entity_id: entity.id,
        scraping_result_id: scrapingResult.id,
        context,
        position,
        prominence,
        // Datos del análisis V2
        sentiment: sentimentAnalysis.sentiment,
        sentiment_score: sentimentAnalysis.sentiment_score,
        sentiment_confidence: sentimentAnalysis.sentiment_confidence,
        keywords: sentimentAnalysis.keywords,
        topics: sentimentAnalysis.topics,
        tone: sentimentAnalysis.tone,
        // 🆕 Campos nuevos V2
        reason: sentimentAnalysis.reason,
        summary: sentimentAnalysis.summary,
        analysis_method: sentimentAnalysis.analysis_method,
        analyzed_at: sentimentAnalysis.analyzed_at,
        tokens_used: sentimentAnalysis.tokens_used
      };
      
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
            console.log(`⏭️  Mención ya existe: ${mention.entity_id} en ${mention.scraping_result_id}`);
            continue;
          }
          
          // 🔹 VALIDACIÓN DE FOREIGN KEYS
          console.log(`🔍 Validando FKs para mención: entity_id=${mention.entity_id}, scraping_result_id=${mention.scraping_result_id}`);
          
          // Verificar que la entidad existe
          const entityExists = await prisma.entity.findUnique({
            where: { id: mention.entity_id },
            select: { id: true, name: true }
          });
          
          if (!entityExists) {
            console.error(`❌ FK Error: Entidad ${mention.entity_id} no existe`);
            continue;
          }
          
          // Verificar que el scraping_result existe
          const scrapingResultExists = await prisma.scraping_results.findUnique({
            where: { id: mention.scraping_result_id },
            select: { id: true, title: true }
          });
          
          if (!scrapingResultExists) {
            console.error(`❌ FK Error: Scraping result ${mention.scraping_result_id} no existe`);
            continue;
          }
          
          console.log(`✅ FKs válidos: entidad="${entityExists.name}", scraping_result="${scrapingResultExists.title?.substring(0, 50)}..."`);
          
          // Validar y limpiar datos
          const cleanedData = {
            entity_id: mention.entity_id,
            scraping_result_id: mention.scraping_result_id,
            context: mention.context,
            position: isNaN(mention.position) ? 0 : Math.round(mention.position),
            prominence: isNaN(mention.prominence) ? 0.5 : mention.prominence,
            sentiment: mention.sentiment,
            sentiment_score: isNaN(mention.sentiment_score) ? 0 : mention.sentiment_score,
            sentiment_confidence: isNaN(mention.sentiment_confidence) ? 0.5 : mention.sentiment_confidence,
            keywords: mention.keywords || [],
            topics: mention.topics || [],
            tone: mention.tone,
            // 🆕 Campos V2
            reason: mention.reason,
            summary: mention.summary,
            analysis_method: mention.analysis_method,
            analyzed_at: mention.analyzed_at || new Date(),
            tokens_used: mention.tokens_used
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
          if (error.code === 'P2002') {
            console.log(`⏭️  Mención duplicada: ${mention.entity_id} en ${mention.scraping_result_id}`);
          } else if (error.code === 'P2003') {
            console.error(`❌ FK Constraint Error - entity_id: ${mention.entity_id}, scraping_result_id: ${mention.scraping_result_id}`);
            console.error(`❌ Detalles completos del error:`, {
              code: error.code,
              meta: error.meta,
              message: error.message
            });
          } else {
            console.error('❌ Error guardando mención:', {
              code: error.code,
              message: error.message,
              entity_id: mention.entity_id,
              scraping_result_id: mention.scraping_result_id,
              mention: mention
            });
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
      console.log(`📦 Procesando batch de ${scrapingResults.length} artículos con Analyzer V2`);
      
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
      
      // Obtener estadísticas del analyzer
      const analyzerStats = entityAnalyzer.getStats();
      
      const stats = {
        processed: processedArticles,
        mentions_found: totalMentions,
        errors,
        duration_ms: duration,
        avg_time_per_article: Math.round(duration / scrapingResults.length),
        analyzer_stats: analyzerStats
      };
      
      console.log('📊 Batch procesado con Analyzer V2:', stats);
      return stats;
      
    } catch (error) {
      console.error('❌ Error procesando batch:', error);
      throw error;
    }
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
}

// Exportar instancia singleton
module.exports = new EntityMonitorV2Service();
