const express = require('express');
const router = express.Router();
const cacheController = require('../controllers/cache.controller');
const { authenticateToken } = require('../middleware/auth');

/**
 * Rutas de Administración de Caché
 * Todas las rutas requieren autenticación
 */

// Health check del caché (público para usuarios autenticados)
router.get('/health', authenticateToken, cacheController.healthCheck);

// Estadísticas del caché (público para usuarios autenticados)
router.get('/stats', authenticateToken, cacheController.getStats);

// Métricas Prometheus (público para monitoreo)
router.get('/metrics', cacheController.getMetrics);

// Limpiar caché propio
router.delete('/user/:userId', authenticateToken, cacheController.clearUserCache);

// Limpiar búsquedas propias
router.delete('/searches/:userId', authenticateToken, cacheController.clearSearchCache);

// Endpoints públicos (solo autenticación requerida)
router.get('/keys', authenticateToken, cacheController.getKeys);
router.delete('/clear', authenticateToken, cacheController.clearAll);
router.delete('/key/:key', authenticateToken, cacheController.deleteKey);

// Circuit breaker (solo admin)
router.post('/circuit-breaker/reset', authenticateToken, cacheController.resetCircuitBreakerEndpoint);

module.exports = router;
