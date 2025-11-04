const {
  addScrapingJob,
  getJobStatus,
  getActiveJobs,
  cancelJob,
  getQueueStats,
  cleanQueue,
} = require('../services/queueService');

/**
 * Iniciar scraping automático en background (usando cola)
 * POST /api/queue/scraping
 */
const startAutoScraping = async (req, res) => {
  try {
    const { userId, urls } = req.body;

    // Validar datos
    if (!userId && !urls) {
      return res.status(400).json({
        error: 'Se requiere userId o urls',
      });
    }

    if (urls && (!Array.isArray(urls) || urls.length === 0)) {
      return res.status(400).json({
        error: 'urls debe ser un array no vacío',
      });
    }

    console.log(`📥 Solicitud de scraping automático - Usuario: ${userId || 'todos'}, URLs: ${urls?.length || 'todas'}`);

    // Si se proporcionan URLs directamente, usarlas
    // Si no, el servicio obtendrá las URLs de la base de datos
    const { autoScraperService } = require('../services/autoScraper.service');
    
    const result = await autoScraperService.queueAutoScraping({
      userId,
      urls,
    });

    res.json({
      success: true,
      message: 'Scraping automático iniciado en background',
      ...result,
    });
  } catch (error) {
    console.error('❌ Error iniciando scraping automático:', error);
    res.status(500).json({
      error: 'Error iniciando scraping automático',
      details: error.message,
    });
  }
};

/**
 * Obtener estado de un trabajo específico
 * GET /api/queue/status/:jobId
 */
const getStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: 'jobId es requerido',
      });
    }

    const status = await getJobStatus(jobId);

    if (!status.exists) {
      return res.status(404).json({
        error: 'Trabajo no encontrado',
        jobId,
      });
    }

    res.json({
      success: true,
      job: status,
    });
  } catch (error) {
    console.error('❌ Error obteniendo estado del trabajo:', error);
    res.status(500).json({
      error: 'Error obteniendo estado del trabajo',
      details: error.message,
    });
  }
};

/**
 * Obtener todos los trabajos activos
 * GET /api/queue/active
 */
const getActive = async (req, res) => {
  try {
    const jobs = await getActiveJobs();

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('❌ Error obteniendo trabajos activos:', error);
    res.status(500).json({
      error: 'Error obteniendo trabajos activos',
      details: error.message,
    });
  }
};

/**
 * Cancelar un trabajo
 * DELETE /api/queue/:jobId
 */
const cancel = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: 'jobId es requerido',
      });
    }

    await cancelJob(jobId);

    res.json({
      success: true,
      message: 'Trabajo cancelado exitosamente',
      jobId,
    });
  } catch (error) {
    console.error('❌ Error cancelando trabajo:', error);
    res.status(500).json({
      error: 'Error cancelando trabajo',
      details: error.message,
    });
  }
};

/**
 * Obtener estadísticas de la cola
 * GET /api/queue/stats
 */
const getStats = async (req, res) => {
  try {
    const stats = await getQueueStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      error: 'Error obteniendo estadísticas',
      details: error.message,
    });
  }
};

/**
 * Limpiar trabajos antiguos
 * POST /api/queue/clean
 */
const clean = async (req, res) => {
  try {
    await cleanQueue();

    res.json({
      success: true,
      message: 'Cola limpiada exitosamente',
    });
  } catch (error) {
    console.error('❌ Error limpiando cola:', error);
    res.status(500).json({
      error: 'Error limpiando cola',
      details: error.message,
    });
  }
};

/**
 * Obtener métricas de rendimiento de la cola
 * GET /api/queue/metrics
 */
const getPerformanceMetrics = async (req, res) => {
  try {
    const { range = '24h' } = req.query;

    // Métricas simuladas basadas en el rango
    const metrics = {
      range,
      timestamp: new Date(),
      throughput: {
        jobsProcessed: Math.floor(Math.random() * 1000) + 500,
        jobsFailed: Math.floor(Math.random() * 50) + 10,
        averageProcessingTime: Math.floor(Math.random() * 5000) + 1000, // ms
      },
      performance: {
        successRate: (Math.random() * 0.3 + 0.7).toFixed(2), // 70-100%
        averageQueueWaitTime: Math.floor(Math.random() * 2000) + 500, // ms
        peakLoad: Math.floor(Math.random() * 100) + 50,
      },
      resources: {
        memoryUsage: Math.floor(Math.random() * 500) + 100, // MB
        cpuUsage: Math.floor(Math.random() * 80) + 10, // %
        activeWorkers: Math.floor(Math.random() * 8) + 2,
      },
    };

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('❌ Error obteniendo métricas de rendimiento:', error);
    res.status(500).json({
      error: 'Error obteniendo métricas de rendimiento',
      details: error.message,
    });
  }
};

module.exports = {
  startAutoScraping,
  getStatus,
  getActive,
  cancel,
  getStats,
  clean,
  getPerformanceMetrics,
};
