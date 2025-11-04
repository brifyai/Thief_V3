const metricsService = require('../services/metrics.service');
const { healthCheckService } = require('../utils/healthCheck');
const { aiCostOptimizer } = require('../services/aiCostOptimizer.service');

/**
 * 🔹 FASE 4: Controlador de Métricas
 * Endpoints para consultar métricas del sistema
 */

/**
 * GET /api/metrics/general
 * Obtiene métricas generales del sistema
 */
exports.getGeneralMetrics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const metrics = await metricsService.getGeneralMetrics(days);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error obteniendo métricas generales:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas generales'
    });
  }
};

/**
 * GET /api/metrics/duplicates
 * Obtiene métricas de detección de duplicados
 */
exports.getDuplicateMetrics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const metrics = await metricsService.getDuplicateMetrics(days);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error obteniendo métricas de duplicados:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de duplicados'
    });
  }
};

/**
 * GET /api/metrics/titles
 * Obtiene métricas de extracción de títulos
 */
exports.getTitleMetrics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const metrics = await metricsService.getTitleMetrics(days);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error obteniendo métricas de títulos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de títulos'
    });
  }
};

/**
 * GET /api/metrics/categorization
 * Obtiene métricas de categorización
 */
exports.getCategorizationMetrics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const metrics = await metricsService.getCategorizationMetrics(days);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error obteniendo métricas de categorización:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de categorización'
    });
  }
};

/**
 * GET /api/metrics/ai
 * Obtiene métricas de uso de IA
 */
exports.getAIMetrics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const metrics = await metricsService.getAIMetrics(days);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error obteniendo métricas de IA:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de IA'
    });
  }
};

/**
 * GET /api/metrics/domains
 * Obtiene métricas por dominio
 */
exports.getDomainMetrics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const metrics = await metricsService.getDomainMetrics(days);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error obteniendo métricas por dominio:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas por dominio'
    });
  }
};

/**
 * GET /api/metrics/all
 * Obtiene todas las métricas en un solo endpoint
 */
exports.getAllMetrics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const metrics = await metricsService.getAllMetrics(days);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error obteniendo todas las métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo todas las métricas'
    });
  }
};

/**
 * GET /api/metrics/realtime
 * Obtiene métricas en tiempo real
 */
exports.getRealTimeMetrics = (req, res) => {
  try {
    const metrics = metricsService.getRealTimeMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error obteniendo métricas en tiempo real:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas en tiempo real'
    });
  }
};

/**
 * 🔹 FASE 2: Health Checks
 * Endpoints para monitoreo de salud del sistema
 */

/**
 * GET /api/metrics/health
 * Obtiene health check de todos los servicios
 */
exports.getHealthCheck = async (req, res) => {
  try {
    const results = await healthCheckService.runAllChecks();
    
    // Determinar código HTTP basado en estado general
    const statusCode = results.status === 'healthy' ? 200 :
                      results.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: results.status !== 'unhealthy',
      data: results
    });
  } catch (error) {
    console.error('Error ejecutando health check:', error);
    res.status(500).json({
      success: false,
      error: 'Error ejecutando health check',
      message: error.message
    });
  }
};

/**
 * GET /api/metrics/health/:service
 * Obtiene health check de un servicio específico
 */
exports.getServiceHealthCheck = async (req, res) => {
  try {
    const { service } = req.params;
    const result = await healthCheckService.runCheck(service);
    
    const statusCode = result.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: result.status === 'healthy',
      data: result
    });
  } catch (error) {
    console.error(`Error ejecutando health check para ${req.params.service}:`, error);
    res.status(500).json({
      success: false,
      error: `Error ejecutando health check para ${req.params.service}`,
      message: error.message
    });
  }
};

/**
 * GET /api/metrics/health/simple
 * Endpoint simple para load balancers (solo retorna status)
 */
exports.getSimpleHealthCheck = async (req, res) => {
  try {
    const isHealthy = await healthCheckService.isHealthy();
    
    if (isHealthy) {
      res.status(200).send('OK');
    } else {
      res.status(503).send('Service Unavailable');
    }
  } catch (error) {
    res.status(503).send('Service Unavailable');
  }
};

/**
 * GET /api/metrics/health/ready
 * Readiness probe para Kubernetes
 */
exports.getReadinessCheck = async (req, res) => {
  try {
    // Verificar conexiones críticas
    const dbCheck = await healthCheckService.runCheck('database');
    const redisCheck = await healthCheckService.runCheck('redis');
    
    const isReady = dbCheck.status === 'healthy' && redisCheck.status === 'healthy';
    
    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      checks: {
        database: dbCheck.status,
        redis: redisCheck.status
      }
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message
    });
  }
};

/**
 * GET /api/metrics/health/live
 * Liveness probe para Kubernetes
 */
exports.getLivenessCheck = async (req, res) => {
  try {
    // Verificar que el proceso esté vivo
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    res.status(200).json({
      alive: true,
      uptime,
      memory: {
        used: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memory.external / 1024 / 1024) + 'MB'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      alive: false,
      error: error.message
    });
  }
};

/**
 * 🔹 FASE 5: AI Cost Optimizer
 * Endpoints para monitoreo y gestión del optimizador de costos de IA
 */

/**
 * GET /api/metrics/ai/cost-stats
 * Obtiene estadísticas del optimizador de costos de IA
 */
exports.getAICostStats = async (req, res) => {
  try {
    const cacheStats = await aiCostOptimizer.getCacheStats();
    
    res.json({
      success: true,
      data: {
        aiCostOptimizer: {
          cache: cacheStats,
          optimizations: {
            enabled: true,
            features: [
              'Intelligent caching',
              'Prompt optimization',
              'Fallback mechanisms',
              'Batch processing',
              'Content optimization'
            ]
          },
          savings: {
            estimatedCacheHitRate: cacheStats.enabled ?
              Math.min((cacheStats.total || 0) * 0.1, 50) : 0, // Estimado conservador
            tokensSaved: cacheStats.enabled ?
              (cacheStats.total || 0) * 150 : 0 // ~150 tokens por respuesta cacheada
          }
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de IA:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de IA',
      message: error.message
    });
  }
};

/**
 * DELETE /api/metrics/ai/cache
 * Limpia el cache del optimizador de costos de IA
 */
exports.clearAICache = async (req, res) => {
  try {
    await aiCostOptimizer.cleanupCache();
    
    res.json({
      success: true,
      message: 'Cache de IA limpiado exitosamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error limpiando cache de IA:', error);
    res.status(500).json({
      success: false,
      error: 'Error limpiando cache de IA',
      message: error.message
    });
  }
};
