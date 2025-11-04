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
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Total de artículos scrapeados
      const totalArticles = await prisma.scraping_results.count({
        where: {
          scraped_at: { gte: startDate },
          success: true
        }
      });

      // Artículos por día
      const articlesPerDay = await prisma.scraping_results.groupBy({
        by: ['scraped_at'],
        where: {
          scraped_at: { gte: startDate },
          success: true
        },
        _count: true
      });

      // Promedio por día
      const avgPerDay = articlesPerDay.length > 0 
        ? Math.round(totalArticles / days)
        : 0;

      // Artículos exitosos vs fallidos
      const successCount = await prisma.scraping_results.count({
        where: {
          scraped_at: { gte: startDate },
          success: true
        }
      });

      const failureCount = await prisma.scraping_results.count({
        where: {
          scraped_at: { gte: startDate },
          success: false
        }
      });

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

      // Artículos con hash vs sin hash
      const withHash = await prisma.scraping_results.count({
        where: {
          scraped_at: { gte: startDate },
          content_hash: { not: null }
        }
      });

      const withoutHash = await prisma.scraping_results.count({
        where: {
          scraped_at: { gte: startDate },
          content_hash: null
        }
      });

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

      // Distribución de fuentes de títulos
      const titleSources = await prisma.scraping_results.groupBy({
        by: ['title_source'],
        where: {
          scraped_at: { gte: startDate },
          success: true
        },
        _count: true
      });

      const total = titleSources.reduce((sum, item) => sum + item._count, 0);

      const distribution = titleSources.map(item => ({
        source: item.title_source || 'unknown',
        count: item._count,
        percentage: total > 0 ? ((item._count / total) * 100).toFixed(2) + '%' : '0%'
      }));

      // Uso de IA para títulos
      const aiUsedCount = await prisma.scraping_results.count({
        where: {
          scraped_at: { gte: startDate },
          ai_used: true,
          success: true
        }
      });

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

      // Distribución de métodos de categorización
      const methods = await prisma.scraping_results.groupBy({
        by: ['categorization_method'],
        where: {
          scraped_at: { gte: startDate },
          success: true
        },
        _count: true,
        _avg: {
          categorization_confidence: true
        }
      });

      const total = methods.reduce((sum, item) => sum + item._count, 0);

      const distribution = methods.map(item => ({
        method: item.categorization_method || 'unknown',
        count: item._count,
        percentage: total > 0 ? ((item._count / total) * 100).toFixed(2) + '%' : '0%',
        avgConfidence: item._avg.categorization_confidence 
          ? (item._avg.categorization_confidence * 100).toFixed(1) + '%'
          : 'N/A'
      }));

      // Distribución de categorías
      const categories = await prisma.scraping_results.groupBy({
        by: ['category'],
        where: {
          scraped_at: { gte: startDate },
          success: true
        },
        _count: true
      });

      const categoryDistribution = categories.map(item => ({
        category: item.category || 'sin categoría',
        count: item._count,
        percentage: total > 0 ? ((item._count / total) * 100).toFixed(2) + '%' : '0%'
      })).sort((a, b) => b.count - a.count);

      // Uso de IA para categorización
      const aiUsedForCat = methods.find(m => m.categorization_method === 'ai');
      const aiUsageRate = aiUsedForCat && total > 0
        ? ((aiUsedForCat._count / total) * 100).toFixed(2)
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
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const total = await prisma.scraping_results.count({
        where: {
          scraped_at: { gte: startDate },
          success: true
        }
      });

      // Uso de IA (títulos o categorización)
      const aiUsedCount = await prisma.scraping_results.count({
        where: {
          scraped_at: { gte: startDate },
          ai_used: true,
          success: true
        }
      });

      // Tokens usados (si está implementado)
      const tokensResult = await prisma.scraping_results.aggregate({
        where: {
          scraped_at: { gte: startDate },
          ai_tokens_used: { not: null }
        },
        _sum: {
          ai_tokens_used: true
        },
        _avg: {
          ai_tokens_used: true
        }
      });

      const totalTokens = tokensResult._sum.ai_tokens_used || 0;
      const avgTokens = tokensResult._avg.ai_tokens_used || 0;

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
        avgTokensPerArticle: Math.round(avgTokens),
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

      const domains = await prisma.scraping_results.groupBy({
        by: ['domain'],
        where: {
          scraped_at: { gte: startDate },
          success: true,
          domain: { not: null }
        },
        _count: true
      });

      const total = domains.reduce((sum, item) => sum + item._count, 0);

      const distribution = domains.map(item => ({
        domain: item.domain,
        count: item._count,
        percentage: total > 0 ? ((item._count / total) * 100).toFixed(2) + '%' : '0%'
      })).sort((a, b) => b.count - a.count);

      return {
        period: `${days} días`,
        totalDomains: domains.length,
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
