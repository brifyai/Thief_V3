const cleanupService = require('../services/cleanup.service');
const config = require('../config/env');

/**
 * Controlador para gestión de limpieza de noticias
 */

/**
 * Ejecuta limpieza manual de noticias antiguas
 * Solo admin puede ejecutar esto
 */
async function runCleanup(req, res) {
  try {
    console.log(`🧹 Limpieza manual iniciada por usuario: ${req.user.email}`);
    
    const result = await cleanupService.cleanupOldNews();
    
    if (result.success) {
      res.json({
        success: true,
        message: `Limpieza completada. ${result.deleted} noticias eliminadas`,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Error en la limpieza'
      });
    }
  } catch (error) {
    console.error('Error en runCleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Error ejecutando limpieza'
    });
  }
}

/**
 * Obtiene estadísticas de la base de datos
 */
async function getStats(req, res) {
  try {
    const stats = await cleanupService.getDatabaseStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error en getStats:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
}

/**
 * Obtiene noticias próximas a expirar
 */
async function getExpiring(req, res) {
  try {
    const daysWarning = parseInt(req.query.days) || 7;
    
    const result = await cleanupService.getExpiringNews(daysWarning);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error en getExpiring:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo noticias próximas a expirar'
    });
  }
}

/**
 * Obtiene configuración de limpieza
 */
async function getConfig(req, res) {
  try {
    res.json({
      success: true,
      data: {
        enabled: config.cleanupEnabled,
        retentionDays: config.cleanupRetentionDays,
        schedule: config.cleanupSchedule,
        timezone: config.cleanupTimezone
      }
    });
  } catch (error) {
    console.error('Error en getConfig:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo configuración'
    });
  }
}

module.exports = {
  runCleanup,
  getStats,
  getExpiring,
  getConfig
};
