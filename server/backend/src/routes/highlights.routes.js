const express = require('express');
const router = express.Router();
const highlightsController = require('../controllers/highlights.controller');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/highlights - Obtener noticias destacadas
router.get('/', highlightsController.getHighlights);

// GET /api/highlights/stats - Estadísticas rápidas
router.get('/stats', highlightsController.getQuickStats);

module.exports = router;
