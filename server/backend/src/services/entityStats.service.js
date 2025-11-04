const prisma = require('../config/database');

/**
 * 📊 SERVICIO DE ESTADÍSTICAS DE ENTIDADES
 * Calcula métricas, tendencias y snapshots diarios
 */
class EntityStatsService {
  
  /**
   * Calcula snapshot diario de una entidad
   * @param {string} entityId - ID de la entidad
   * @param {Date} date - Fecha del snapshot
   * @returns {Promise<Object>} Snapshot calculado
   */
  async calculateDailySnapshot(entityId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Obtener todas las menciones del día
      const mentions = await prisma.entityMention.findMany({
        where: {
          entity_id: entityId,
          analyzed_at: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          scraping_result: {
            select: {
              domain: true,
              category: true
            }
          }
        }
      });
      
      const totalMentions = mentions.length;
      
      if (totalMentions === 0) {
        return null; // No hay menciones este día
      }
      
      // Calcular distribución de sentimiento
      const positive = mentions.filter(m => m.sentiment === 'POSITIVE').length;
      const negative = mentions.filter(m => m.sentiment === 'NEGATIVE').length;
      const neutral = mentions.filter(m => m.sentiment === 'NEUTRAL').length;
      
      // Calcular promedios
      const avgSentiment = mentions.reduce((sum, m) => sum + m.sentiment_score, 0) / totalMentions;
      const avgConfidence = mentions.reduce((sum, m) => sum + m.sentiment_confidence, 0) / totalMentions;
      
      // Top keywords
      const keywordCounts = {};
      mentions.forEach(m => {
        m.keywords.forEach(keyword => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
      });
      
      const topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }));
      
      // Top sources
      const sourceCounts = {};
      const sourceSentiments = {};
      
      mentions.forEach(m => {
        const domain = m.scraping_result?.domain || 'unknown';
        sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
        
        if (!sourceSentiments[domain]) {
          sourceSentiments[domain] = [];
        }
        sourceSentiments[domain].push(m.sentiment_score);
      });
      
      const topSources = Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([domain, count]) => ({
          domain,
          count,
          avg_sentiment: sourceSentiments[domain].reduce((a, b) => a + b, 0) / sourceSentiments[domain].length
        }));
      
      // Detectar tendencia (comparar con día anterior)
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const yesterdaySnapshot = await prisma.entitySnapshot.findUnique({
        where: {
          entity_id_date: {
            entity_id: entityId,
            date: yesterday
          }
        }
      });
      
      let trendDirection = 'STABLE';
      if (yesterdaySnapshot) {
        const sentimentChange = avgSentiment - yesterdaySnapshot.avg_sentiment;
        if (sentimentChange > 0.1) trendDirection = 'UP';
        else if (sentimentChange < -0.1) trendDirection = 'DOWN';
      }
      
      // Crear o actualizar snapshot
      const snapshot = await prisma.entitySnapshot.upsert({
        where: {
          entity_id_date: {
            entity_id: entityId,
            date: startOfDay
          }
        },
        update: {
          total_mentions: totalMentions,
          new_mentions: totalMentions,
          positive_count: positive,
          negative_count: negative,
          neutral_count: neutral,
          avg_sentiment: avgSentiment,
          avg_confidence: avgConfidence,
          top_keywords: topKeywords,
          top_sources: topSources,
          trend_direction: trendDirection,
          calculated_at: new Date()
        },
        create: {
          entity_id: entityId,
          date: startOfDay,
          total_mentions: totalMentions,
          new_mentions: totalMentions,
          positive_count: positive,
          negative_count: negative,
          neutral_count: neutral,
          avg_sentiment: avgSentiment,
          avg_confidence: avgConfidence,
          top_keywords: topKeywords,
          top_sources: topSources,
          trend_direction: trendDirection
        }
      });
      
      console.log(`📊 Snapshot calculado para entidad ${entityId} (${date.toISOString().split('T')[0]})`);
      return snapshot;
      
    } catch (error) {
      console.error('❌ Error calculando snapshot:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene timeline de sentimiento de una entidad
   * @param {string} entityId - ID de la entidad
   * @param {Date} dateFrom - Fecha inicio
   * @param {Date} dateTo - Fecha fin
   * @returns {Promise<Array>} Timeline de snapshots
   */
  async getEntityTimeline(entityId, dateFrom, dateTo) {
    try {
      const snapshots = await prisma.entitySnapshot.findMany({
        where: {
          entity_id: entityId,
          date: {
            gte: dateFrom,
            lte: dateTo
          }
        },
        orderBy: {
          date: 'asc'
        }
      });
      
      return snapshots;
      
    } catch (error) {
      console.error('❌ Error obteniendo timeline:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene estadísticas generales de una entidad
   * @param {string} entityId - ID de la entidad
   * @returns {Promise<Object>} Estadísticas completas
   */
  async getEntityStats(entityId) {
    try {
      // Total de menciones
      const totalMentions = await prisma.entityMention.count({
        where: { entity_id: entityId }
      });
      
      // Menciones últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentMentions = await prisma.entityMention.count({
        where: {
          entity_id: entityId,
          analyzed_at: {
            gte: thirtyDaysAgo
          }
        }
      });
      
      // Distribución de sentimiento (total)
      // SIEMPRE inicializar con valores por defecto
      const distribution = {
        POSITIVE: 0,
        NEGATIVE: 0,
        NEUTRAL: 0,
        MIXED: 0
      };
      
      // Solo consultar si hay menciones
      if (totalMentions > 0) {
        const sentimentDistribution = await prisma.entityMention.groupBy({
          by: ['sentiment'],
          where: { entity_id: entityId },
          _count: true
        });
        
        sentimentDistribution.forEach(item => {
          if (item.sentiment && distribution.hasOwnProperty(item.sentiment)) {
            distribution[item.sentiment] = item._count;
          }
        });
      }
      
      // Sentimiento promedio
      const avgSentimentResult = await prisma.entityMention.aggregate({
        where: { entity_id: entityId },
        _avg: {
          sentiment_score: true,
          sentiment_confidence: true
        }
      });
      
      // Último snapshot
      const latestSnapshot = await prisma.entitySnapshot.findFirst({
        where: { entity_id: entityId },
        orderBy: { date: 'desc' }
      });
      
      return {
        total_mentions: totalMentions,
        recent_mentions: recentMentions,
        sentiment_distribution: distribution, // ✅ SIEMPRE definido con estructura completa
        avg_sentiment: avgSentimentResult._avg.sentiment_score || 0,
        avg_confidence: avgSentimentResult._avg.sentiment_confidence || 0,
        latest_snapshot: latestSnapshot,
        last_updated: new Date()
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene menciones de una entidad con filtros
   * @param {string} entityId - ID de la entidad
   * @param {Object} filters - Filtros (sentiment, dateFrom, dateTo)
   * @param {Object} pagination - Paginación (page, limit)
   * @returns {Promise<Object>} Menciones y metadata
   */
  async getMentions(entityId, filters = {}, pagination = { page: 1, limit: 20 }) {
    try {
      const { sentiment, dateFrom, dateTo } = filters;
      const { page, limit } = pagination;
      
      const where = {
        entity_id: entityId
      };
      
      if (sentiment) {
        where.sentiment = sentiment;
      }
      
      if (dateFrom || dateTo) {
        where.analyzed_at = {};
        if (dateFrom) where.analyzed_at.gte = dateFrom;
        if (dateTo) where.analyzed_at.lte = dateTo;
      }
      
      const [mentions, total] = await Promise.all([
        prisma.entityMention.findMany({
          where,
          include: {
            scraping_result: {
              select: {
                id: true,
                title: true,
                summary: true,
                domain: true,
                category: true,
                region: true,
                scraped_at: true,
                success: true,
                // Incluir relaciones para obtener URL
                saved_urls: {
                  select: {
                    url: true,
                    title: true
                  }
                },
                public_url: {
                  select: {
                    url: true,
                    name: true,
                    domain: true
                  }
                }
              }
            }
          },
          orderBy: {
            analyzed_at: 'desc'
          },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.entityMention.count({ where })
      ]);
      
      return {
        mentions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo menciones:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene top keywords de una entidad
   * @param {string} entityId - ID de la entidad
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Top keywords
   */
  async getTopKeywords(entityId, limit = 10) {
    try {
      const mentions = await prisma.entityMention.findMany({
        where: { entity_id: entityId },
        select: { keywords: true }
      });
      
      const keywordCounts = {};
      mentions.forEach(m => {
        m.keywords.forEach(keyword => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
      });
      
      return Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([keyword, count]) => ({ keyword, count }));
      
    } catch (error) {
      console.error('❌ Error obteniendo keywords:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene top fuentes de una entidad
   * @param {string} entityId - ID de la entidad
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Top fuentes
   */
  async getTopSources(entityId, limit = 10) {
    try {
      const mentions = await prisma.entityMention.findMany({
        where: { entity_id: entityId },
        include: {
          scraping_result: {
            select: {
              domain: true
            }
          }
        }
      });
      
      const sourceCounts = {};
      const sourceSentiments = {};
      
      mentions.forEach(m => {
        const domain = m.scraping_result?.domain || 'unknown';
        sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
        
        if (!sourceSentiments[domain]) {
          sourceSentiments[domain] = [];
        }
        sourceSentiments[domain].push(m.sentiment_score);
      });
      
      return Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([domain, count]) => ({
          domain,
          count,
          avg_sentiment: sourceSentiments[domain].reduce((a, b) => a + b, 0) / sourceSentiments[domain].length
        }));
      
    } catch (error) {
      console.error('❌ Error obteniendo fuentes:', error);
      throw error;
    }
  }
  
  /**
   * Detecta tendencia de una entidad
   * @param {string} entityId - ID de la entidad
   * @returns {Promise<Object>} Tendencia detectada
   */
  async detectTrend(entityId) {
    try {
      // Obtener últimos 7 días de snapshots
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const snapshots = await prisma.entitySnapshot.findMany({
        where: {
          entity_id: entityId,
          date: {
            gte: sevenDaysAgo
          }
        },
        orderBy: {
          date: 'asc'
        }
      });
      
      if (snapshots.length < 2) {
        return {
          direction: 'STABLE',
          strength: 0,
          change: 0
        };
      }
      
      // Calcular cambio de sentimiento
      const firstSentiment = snapshots[0].avg_sentiment;
      const lastSentiment = snapshots[snapshots.length - 1].avg_sentiment;
      const change = lastSentiment - firstSentiment;
      
      let direction = 'STABLE';
      if (change > 0.1) direction = 'UP';
      else if (change < -0.1) direction = 'DOWN';
      
      // Calcular fuerza de la tendencia (0-1)
      const strength = Math.min(1, Math.abs(change));
      
      return {
        direction,
        strength,
        change,
        first_sentiment: firstSentiment,
        last_sentiment: lastSentiment,
        days_analyzed: snapshots.length
      };
      
    } catch (error) {
      console.error('❌ Error detectando tendencia:', error);
      throw error;
    }
  }
}

module.exports = new EntityStatsService();
