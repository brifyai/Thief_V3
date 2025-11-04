const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics.controller');
const { authenticateToken } = require('../middleware/auth');

/**
 * 🔹 FASE 4: Rutas de Métricas
 * Todas las rutas requieren autenticación
 */

// Métricas generales
router.get('/general', authenticateToken, metricsController.getGeneralMetrics);

// Métricas de duplicados (FASE 1)
router.get('/duplicates', authenticateToken, metricsController.getDuplicateMetrics);

// Métricas de títulos (FASE 2)
router.get('/titles', authenticateToken, metricsController.getTitleMetrics);

// Métricas de categorización (FASE 3)
router.get('/categorization', authenticateToken, metricsController.getCategorizationMetrics);

// Métricas de IA (FASE 4)
router.get('/ai', authenticateToken, metricsController.getAIMetrics);

// Métricas por dominio
router.get('/domains', authenticateToken, metricsController.getDomainMetrics);

// Todas las métricas
router.get('/all', authenticateToken, metricsController.getAllMetrics);

// Métricas en tiempo real
router.get('/realtime', authenticateToken, metricsController.getRealTimeMetrics);

/**
 * 🔹 FASE 2: Health Checks
 * Endpoints de monitoreo no requieren autenticación
 */

// Health check completo de todos los servicios
router.get('/health', metricsController.getHealthCheck);

// Health check de servicio específico
router.get('/health/:service', metricsController.getServiceHealthCheck);

// Health check simple para load balancers
router.get('/health/simple', metricsController.getSimpleHealthCheck);

// Readiness probe para Kubernetes
router.get('/health/ready', metricsController.getReadinessCheck);

// Liveness probe para Kubernetes
router.get('/health/live', metricsController.getLivenessCheck);

// 🔹 FASE 5: AI Cost Optimizer Routes
router.get('/ai/cost-stats', authenticateToken, metricsController.getAICostStats);
router.delete('/ai/cache', authenticateToken, metricsController.clearAICache);

module.exports = router;
