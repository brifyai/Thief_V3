const cacheService = require('../utils/cacheService');
const { healthCheck: redisHealthCheck, getCircuitBreakerState, resetCircuitBreaker } = require('../utils/redisSingleton');

/**
 * Controlador de Administración de Caché
 * Endpoints para monitorear y gestionar el sistema de caché Redis
 */

/**
 * Obtener estadísticas del caché
 * GET /api/cache/stats
 */
const getStats = async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Estadísticas del caché obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del caché:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas del caché',
      details: error.message
    });
  }
};

/**
 * Limpiar todo el caché (solo admin)
 * DELETE /api/cache/clear
 */
const clearAll = async (req, res) => {
  try {
    // Verificar que el usuario sea admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Solo administradores pueden limpiar todo el caché.'
      });
    }

    const result = await cacheService.clearAll();
    
    if (result) {
      res.json({
        success: true,
        message: 'Todo el caché ha sido limpiado exitosamente'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'No se pudo limpiar el caché'
      });
    }
  } catch (error) {
    console.error('Error limpiando todo el caché:', error);
    res.status(500).json({
      success: false,
      error: 'Error limpiando el caché',
      details: error.message
    });
  }
};

/**
 * Limpiar caché de un usuario específico
 * DELETE /api/cache/user/:userId
 */
const clearUserCache = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Solo permitir limpiar caché propio o ser admin
    if (parseInt(userId) !== requestUserId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Solo puedes limpiar tu propio caché.'
      });
    }

    const deletedCount = await cacheService.invalidateUser(parseInt(userId));
    
    res.json({
      success: true,
      message: `Caché del usuario ${userId} limpiado exitosamente`,
      deletedKeys: deletedCount
    });
  } catch (error) {
    console.error('Error limpiando caché de usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error limpiando caché de usuario',
      details: error.message
    });
  }
};

/**
 * Invalidar caché de búsquedas de un usuario
 * DELETE /api/cache/searches/:userId
 */
const clearSearchCache = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Solo permitir limpiar caché propio o ser admin
    if (parseInt(userId) !== requestUserId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado.'
      });
    }

    const deletedCount = await cacheService.invalidatePattern(`search:${userId}:*`);
    
    res.json({
      success: true,
      message: `Caché de búsquedas del usuario ${userId} limpiado`,
      deletedKeys: deletedCount
    });
  } catch (error) {
    console.error('Error limpiando caché de búsquedas:', error);
    res.status(500).json({
      success: false,
      error: 'Error limpiando caché de búsquedas',
      details: error.message
    });
  }
};

/**
 * Obtener todas las keys del caché (con patrón opcional)
 * GET /api/cache/keys?pattern=search:*
 */
const getKeys = async (req, res) => {
  try {
    // Solo admin puede ver todas las keys
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Solo administradores pueden ver las keys del caché.'
      });
    }

    const { pattern = '*' } = req.query;
    const keys = await cacheService.getKeys(pattern);
    
    res.json({
      success: true,
      data: {
        pattern,
        count: keys.length,
        keys: keys.slice(0, 100) // Limitar a 100 keys para no sobrecargar
      },
      message: keys.length > 100 ? 'Mostrando primeras 100 keys' : null
    });
  } catch (error) {
    console.error('Error obteniendo keys del caché:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo keys del caché',
      details: error.message
    });
  }
};

/**
 * Health check completo del caché con latencia
 * GET /api/cache/health
 */
const healthCheck = async (req, res) => {
  try {
    const health = await redisHealthCheck();
    const stats = await cacheService.getStats();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: {
        ...health,
        stats: {
          hitRate: stats.hitRate,
          totalOperations: stats.totalOperations,
          uptime: stats.uptime
        },
        message: health.status === 'healthy'
          ? `Caché Redis funcionando correctamente (latencia: ${health.latency})`
          : 'Caché Redis no disponible - usando fallback'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error verificando estado del caché',
      details: error.message
    });
  }
};

/**
 * Invalidar caché específico por key
 * DELETE /api/cache/key/:key
 */
const deleteKey = async (req, res) => {
  try {
    // Solo admin puede eliminar keys específicas
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado.'
      });
    }

    const { key } = req.params;
    const deleted = await cacheService.deleteCached(key);
    
    if (deleted) {
      res.json({
        success: true,
        message: `Key '${key}' eliminada del caché`
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Key '${key}' no encontrada en el caché`
      });
    }
  } catch (error) {
    console.error('Error eliminando key del caché:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando key del caché',
      details: error.message
    });
  }
};

/**
 * Obtener métricas detalladas para Prometheus/Grafana
 * GET /api/cache/metrics
 */
const getMetrics = async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    const health = await redisHealthCheck();
    const circuitBreaker = getCircuitBreakerState();
    
    // Formato Prometheus
    const metrics = [
      `# HELP cache_hits_total Total de cache hits`,
      `# TYPE cache_hits_total counter`,
      `cache_hits_total ${stats.hits}`,
      ``,
      `# HELP cache_misses_total Total de cache misses`,
      `# TYPE cache_misses_total counter`,
      `cache_misses_total ${stats.misses}`,
      ``,
      `# HELP cache_errors_total Total de errores de caché`,
      `# TYPE cache_errors_total counter`,
      `cache_errors_total ${stats.errors}`,
      ``,
      `# HELP cache_hit_rate Tasa de aciertos del caché`,
      `# TYPE cache_hit_rate gauge`,
      `cache_hit_rate ${parseFloat(stats.hitRate) / 100}`,
      ``,
      `# HELP cache_latency_ms Latencia del caché en milisegundos`,
      `# TYPE cache_latency_ms gauge`,
      `cache_latency_ms ${parseInt(health.latency) || 0}`,
      ``,
      `# HELP cache_circuit_breaker_open Estado del circuit breaker (1=abierto, 0=cerrado)`,
      `# TYPE cache_circuit_breaker_open gauge`,
      `cache_circuit_breaker_open ${circuitBreaker.isOpen ? 1 : 0}`,
      ``,
      `# HELP cache_circuit_breaker_failures Fallos consecutivos del circuit breaker`,
      `# TYPE cache_circuit_breaker_failures gauge`,
      `cache_circuit_breaker_failures ${circuitBreaker.failures}`,
      ``
    ].join('\n');
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas',
      details: error.message
    });
  }
};

/**
 * Reset manual del circuit breaker (solo admin)
 * POST /api/cache/circuit-breaker/reset
 */
const resetCircuitBreakerEndpoint = async (req, res) => {
  try {
    // Verificar que el usuario sea admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Solo administradores pueden resetear el circuit breaker.'
      });
    }

    resetCircuitBreaker();
    
    res.json({
      success: true,
      message: 'Circuit breaker reseteado exitosamente'
    });
  } catch (error) {
    console.error('Error reseteando circuit breaker:', error);
    res.status(500).json({
      success: false,
      error: 'Error reseteando circuit breaker',
      details: error.message
    });
  }
};

module.exports = {
  getStats,
  clearAll,
  clearUserCache,
  clearSearchCache,
  getKeys,
  healthCheck,
  deleteKey,
  getMetrics,
  resetCircuitBreakerEndpoint,
};
