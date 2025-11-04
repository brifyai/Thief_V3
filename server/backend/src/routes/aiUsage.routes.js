// ========================================
// AI USAGE ROUTES
// Rutas para monitoreo de uso de tokens IA
// ========================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const {
  getTodayStats,
  getStatsRange,
  calculateCost,
  getAlerts,
  resolveAlert,
  getTopOperations,
  getModels,
  getRecentLogs
} = require('../controllers/aiUsage.controller');

// Todas las rutas requieren autenticación y rol admin
router.use(authenticateToken, requireRole('admin'));

// Estadísticas
router.get('/stats/today', getTodayStats);
router.get('/stats/range', getStatsRange);

// Calculadora
router.get('/calculator', calculateCost);

// Alertas
router.get('/alerts', getAlerts);
router.post('/alerts/:id/resolve', resolveAlert);

// Top operaciones
router.get('/top-operations', getTopOperations);

// Modelos
router.get('/models', getModels);

// Logs
router.get('/logs/recent', getRecentLogs);

module.exports = router;
