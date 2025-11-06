const { supabase } = require('../config/database');
const duplicateDetector = require('./duplicateDetector.service');
const { loggers } = require('../utils/logger');

const logger = loggers.scraping;

/**
 * 🔹 FASE 4: Servicio de Métricas y Monitoreo
 * Recopila y analiza métricas del sistema de scraping
 */

class MetricsService {
  constructor() {
    this.startTime = new Date();
  }

  /**
   * Obtiene métricas generales del sistema
   * @param {number} days - Días hacia atrás para analizar
   * @returns {Object} Métricas generales
   */
  async getGeneralMetrics(days = 7) {
    try {
      // Modo demo - retornar datos simulados
      if (process.env.DEMO_MODE === 'true') {
        const totalArticles = Math.floor(Math.random() * 100) + 50;
        const avgPerDay = Math.floor(totalArticles / days);
        const successCount = Math.floor(totalArticles * 0.85);
        const failureCount = totalArticles - successCount;
        const successRate = ((successCount / totalArticles) * 100).toFixed(2);

        return {
          period: `${days} días`,
          totalArticles,
          avgPerDay,
          successCount,
          failureCount,
          successRate: `${successRate}%`
        };
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Usar Supabase en lugar de Prisma
      const { data: totalData, error: totalError } = await supabase
        .from('news')
        .select('count', { count: 'exact' })
        .gte('scraped_at', startDate.toISOString())
        .eq('status', 'published');

      if (totalError) {
        logger.error('Error obteniendo total de artículos:', totalError);
        throw totalError;
      }

      const totalArticles = totalData?.length || 0;

      // Promedio por día
      const avgPerDay = totalArticles > 0
        ? Math.round(totalArticles / days)
        : 0;

      // Artículos exitosos vs fallidos
      const { data: successData, error: successError } = await supabase
        .from('news')
        .select('count', { count: 'exact' })
        .gte('scraped_at', startDate.toISOString())
        .eq('status', 'published');

      if (successError) {
        logger.error('Error obteniendo artículos exitosos:', successError);
        throw successError;
      }

      const successCount = successData?.length || 0;

      const { data: failureData, error: failureError } = await supabase
        .from('news')
        .select('count', { count: 'exact' })
        .gte('scraped_at', startDate.toISOString())
        .eq('status', 'pending');

      if (failureError) {
        logger.error('Error obteniendo artículos fallidos:', failureError);
        throw failureError;
      }

      const failureCount = failureData?.length || 0;

      const successRate = totalArticles > 0
        ? ((successCount / (successCount + failureCount)) * 100).toFixed(2)
        : 0;

      return {
        period: `${days} días`,
        totalArticles,
        avgPerDay,
        successCount,
        failureCount,
        successRate: `${successRate}%`
      };

    } catch (error) {
      logger.error('Error obteniendo métricas generales:', error);
      throw error;
    }
  }

  /**
   * 🔹 FASE 1: Métricas de detección de duplicados
   * @param {number} days - Días hacia atrás
   * @returns {Object} Métricas de duplicados
   */
  async getDuplicateMetrics(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Obtener estadísticas del detector
      const detectorStats = duplicateDetector.getStats();

      // Artículos con hash vs sin hash - usando Supabase
      const { data: withHashData, error: withHashError } = await supabase
        .from('news')
        .select('count', { count: 'exact' })
        .gte('scraped_at', startDate.toISOString())
        .not('word_count', 'is', null);

      if (withHashError) {
        logger.error('Error obteniendo artículos con hash:', withHashError);
        throw withHashError;
      }

      const withHash = withHashData?.length || 0;

      const { data: withoutHashData, error: withoutHashError } = await supabase
        .from('news')
        .select('count', { count: 'exact' })
        .gte('scraped_at', startDate.toISOString())
        .is('word_count', null);

      if (withoutHashError) {
        logger.error('Error obteniendo artículos sin hash:', withoutHashError);
        throw withoutHashError;
      }

      const withoutHash = withoutHashData?.length || 0;

      const hashCoverage = withHash + withoutHash > 0
        ? ((withHash / (withHash + withoutHash)) * 100).toFixed(2)
        : 0;

      return {
        period: `${days} días`,
        articlesWithHash: withHash,
        articlesWithoutHash: withoutHash,
        hashCoverage: `${hashCoverage}%`,
        detectorStats: {
          checked: detectorStats.checked,
          duplicatesFound: detectorStats.duplicatesFound,
          duplicateRate: detectorStats.duplicateRate,
          hashMatches: detectorStats.hashMatches,
          similarityMatches: detectorStats.similarityMatches
        }
      };

    } catch (error) {
      logger.error('Error obteniendo métricas de duplicados:', error);
      throw error;
    }
  }

  /**
   * 🔹 FASE 2: Métricas de extracción de títulos
   * @param {number} days - Días hacia atrás
   * @returns {Object} Métricas de títulos
   */
  async getTitleMetrics(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Distribución de fuentes de títulos - usando Supabase
      const { data: titleSourcesData, error: titleSourcesError } = await supabase
        .from('news')
        .select('source')
        .gte('scraped_at', startDate.toISOString())
        .eq('status', 'published');

      if (titleSourcesError) {
        logger.error('Error obteniendo fuentes de títulos:', titleSourcesError);
        throw titleSourcesError;
      }

      // Agrupar por title_source manualmente
      const titleSourcesMap = {};
      titleSourcesData?.forEach(item => {
        const source = item.title_source || 'unknown';
        titleSourcesMap[source] = (titleSourcesMap[source] || 0) + 1;
      });

      const total = Object.values(titleSourcesMap).reduce((sum, count) => sum + count, 0);

      const distribution = Object.entries(titleSourcesMap).map(([source, count]) => ({
        source,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '0%'
      }));

      // Uso de IA para títulos
      const { data: aiUsedData, error: aiUsedError } = await supabase
        .from('news')
        .select('count', { count: 'exact' })
        .gte('scraped_at', startDate.toISOString())
        .eq('status', 'published')
        .not('humanization_date', 'is', null);

      if (aiUsedError) {
        logger.error('Error obteniendo artículos con IA:', aiUsedError);
        throw aiUsedError;
      }

      const aiUsedCount = aiUsedData?.length || 0;

      const aiUsageRate = total > 0
        ? ((aiUsedCount / total) * 100).toFixed(2)
        : 0;

      return {
        period: `${days} días`,
        totalArticles: total,
        aiUsedCount,
        aiUsageRate: `${aiUsageRate}%`,
        distribution: distribution.sort((a, b) => b.count - a.count)
      };

    } catch (error) {
      logger.error('Error obteniendo métricas de títulos:', error);
      throw error;
    }
  }

  /**
   * 🔹 FASE 3: Métricas de categorización
   * @param {number} days - Días hacia atrás
   * @returns {Object} Métricas de categorización
   */
  async getCategorizationMetrics(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Distribución de métodos de categorización - usando Supabase
      const { data: methodsData, error: methodsError } = await supabase
        .from('news')
        .select('category, priority')
        .gte('scraped_at', startDate.toISOString())
        .eq('status', 'published');

      if (methodsError) {
        logger.error('Error obteniendo métodos de categorización:', methodsError);
        throw methodsError;
      }

      // Agrupar por categorization_method manualmente
      const methodsMap = {};
      let totalConfidence = 0;
      let confidenceCount = 0;

      methodsData?.forEach(item => {
        const method = item.categorization_method || 'unknown';
        if (!methodsMap[method]) {
          methodsMap[method] = { count: 0, totalConfidence: 0, confidenceCount: 0 };
        }
        methodsMap[method].count++;
        if (item.categorization_confidence !== null) {
          methodsMap[method].totalConfidence += item.categorization_confidence;
          methodsMap[method].confidenceCount++;
          totalConfidence += item.categorization_confidence;
          confidenceCount++;
        }
      });

      const total = Object.values(methodsMap).reduce((sum, method) => sum + method.count, 0);

      const distribution = Object.entries(methodsMap).map(([method, data]) => ({
        method,
        count: data.count,
        percentage: total > 0 ? ((data.count / total) * 100).toFixed(2) + '%' : '0%',
        avgConfidence: data.confidenceCount > 0
          ? ((data.totalConfidence / data.confidenceCount) * 100).toFixed(1) + '%'
          : 'N/A'
      }));

      // Distribución de categorías
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('news')
        .select('category')
        .gte('scraped_at', startDate.toISOString())
        .eq('status', 'published');

      if (categoriesError) {
        logger.error('Error obteniendo categorías:', categoriesError);
        throw categoriesError;
      }

      // Agrupar por categoría manualmente
      const categoriesMap = {};
      categoriesData?.forEach(item => {
        const category = item.category || 'sin categoría';
        categoriesMap[category] = (categoriesMap[category] || 0) + 1;
      });

      const categoryDistribution = Object.entries(categoriesMap).map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '0%'
      })).sort((a, b) => b.count - a.count);

      // Uso de IA para categorización
      const aiUsedForCat = methodsMap['ai'];
      const aiUsageRate = aiUsedForCat && total > 0
        ? ((aiUsedForCat.count / total) * 100).toFixed(2)
        : 0;

      return {
        period: `${days} días`,
        totalArticles: total,
        aiUsageRate: `${aiUsageRate}%`,
        methodDistribution: distribution.sort((a, b) => b.count - a.count),
        categoryDistribution: categoryDistribution.slice(0, 10) // Top 10
      };

    } catch (error) {
      logger.error('Error obteniendo métricas de categorización:', error);
      throw error;
    }
  }

  /**
   * 🔹 FASE 4: Métricas de uso de IA
   * @param {number} days - Días hacia atrás
   * @returns {Object} Métricas de IA
   */
  async getAIMetrics(days = 7) {
    try {
      // Modo demo - retornar datos simulados
      if (process.env.DEMO_MODE === 'true') {
        const totalArticles = Math.floor(Math.random() * 100) + 50;
        const aiUsedCount = Math.floor(totalArticles * 0.3);
        const totalTokens = Math.floor(Math.random() * 10000) + 5000;
        const avgTokens = Math.floor(totalTokens / aiUsedCount);
        const estimatedCost = (totalTokens / 1000000) * 0.150;
        const aiUsageRate = ((aiUsedCount / totalArticles) * 100).toFixed(2);

        return {
          period: `${days} días`,
          totalArticles,
          aiUsedCount,
          aiUsageRate: `${aiUsageRate}%`,
          totalTokens,
          avgTokensPerArticle: avgTokens,
          estimatedCost: `$${estimatedCost.toFixed(4)}`,
          costPerArticle: aiUsedCount > 0
            ? `$${(estimatedCost / aiUsedCount).toFixed(6)}`
            : '$0'
        };
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Usar Supabase en lugar de Prisma
      const { data: totalData, error: totalError } = await supabase
        .from('news')
        .select('count', { count: 'exact' })
        .gte('scraped_at', startDate.toISOString())
        .eq('status', 'published');

      if (totalError) {
        logger.error('Error obteniendo total de artículos:', totalError);
        throw totalError;
      }

      const total = totalData?.length || 0;

      // Uso de IA (títulos o categorización)
      const { data: aiData, error: aiError } = await supabase
        .from('news')
        .select('count', { count: 'exact' })
        .gte('scraped_at', startDate.toISOString())
        .eq('status', 'published')
        .not('humanization_date', 'is', null);

      if (aiError) {
        logger.error('Error obteniendo artículos con IA:', aiError);
        throw aiError;
      }

      const aiUsedCount = aiData?.length || 0;

      // Tokens usados (si está implementado)
      const { data: tokensData, error: tokensError } = await supabase
        .from('news')
        .select('humanization_tokens')
        .gte('scraped_at', startDate.toISOString())
        .not('humanization_tokens', 'is', null)
        .not('humanization_tokens', 'eq', 0);

      if (tokensError) {
        logger.error('Error obteniendo tokens:', tokensError);
        throw tokensError;
      }

      const totalTokens = tokensData?.reduce((sum, item) => sum + (item.ai_tokens_used || 0), 0) || 0;
      const avgTokens = aiUsedCount > 0 ? Math.round(totalTokens / aiUsedCount) : 0;

      // Estimación de costos (GPT-4o-mini: $0.150 / 1M input tokens)
      const estimatedCost = (totalTokens / 1000000) * 0.150;

      const aiUsageRate = total > 0
        ? ((aiUsedCount / total) * 100).toFixed(2)
        : 0;

      return {
        period: `${days} días`,
        totalArticles: total,
        aiUsedCount,
        aiUsageRate: `${aiUsageRate}%`,
        totalTokens,
        avgTokensPerArticle: avgTokens,
        estimatedCost: `$${estimatedCost.toFixed(4)}`,
        costPerArticle: aiUsedCount > 0
          ? `$${(estimatedCost / aiUsedCount).toFixed(6)}`
          : '$0'
      };

    } catch (error) {
      logger.error('Error obteniendo métricas de IA:', error);
      throw error;
    }
  }

  /**
   * Obtiene métricas por dominio
   * @param {number} days - Días hacia atrás
   * @returns {Object} Métricas por dominio
   */
  async getDomainMetrics(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Usar Supabase en lugar de Prisma
      const { data: domainsData, error: domainsError } = await supabase
        .from('news')
        .select('domain')
        .gte('scraped_at', startDate.toISOString())
        .eq('status', 'published')
        .not('domain', 'is', null);

      if (domainsError) {
        logger.error('Error obteniendo dominios:', domainsError);
        throw domainsError;
      }

      // Agrupar por dominio manualmente
      const domainsMap = {};
      domainsData?.forEach(item => {
        const domain = item.domain;
        domainsMap[domain] = (domainsMap[domain] || 0) + 1;
      });

      const total = Object.values(domainsMap).reduce((sum, count) => sum + count, 0);

      const distribution = Object.entries(domainsMap).map(([domain, count]) => ({
        domain,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '0%'
      })).sort((a, b) => b.count - a.count);

      return {
        period: `${days} días`,
        totalDomains: Object.keys(domainsMap).length,
        totalArticles: total,
        distribution: distribution.slice(0, 10) // Top 10
      };

    } catch (error) {
      logger.error('Error obteniendo métricas por dominio:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las métricas en un solo objeto
   * @param {number} days - Días hacia atrás
   * @returns {Object} Todas las métricas
   */
  async getAllMetrics(days = 7) {
    try {
      const [
        general,
        duplicates,
        titles,
        categorization,
        ai,
        domains
      ] = await Promise.all([
        this.getGeneralMetrics(days),
        this.getDuplicateMetrics(days),
        this.getTitleMetrics(days),
        this.getCategorizationMetrics(days),
        this.getAIMetrics(days),
        this.getDomainMetrics(days)
      ]);

      return {
        timestamp: new Date().toISOString(),
        period: `${days} días`,
        general,
        duplicates,
        titles,
        categorization,
        ai,
        domains
      };

    } catch (error) {
      logger.error('Error obteniendo todas las métricas:', error);
      throw error;
    }
  }

  /**
   * Obtiene métricas en tiempo real del sistema
   * @returns {Object} Métricas en tiempo real
   */
  getRealTimeMetrics() {
    const uptime = Date.now() - this.startTime.getTime();
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);

    return {
      timestamp: new Date().toISOString(),
      uptime: `${uptimeHours} horas`,
      startTime: this.startTime.toISOString(),
      duplicateDetector: duplicateDetector.getStats()
    };
  }
}

// Exportar instancia singleton
module.exports = new MetricsService();
