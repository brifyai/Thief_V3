const express = require('express');
const { 
  advancedSearch, 
  getFilterOptions, 
  getSearchStats, 
  runAutoScraping, 
  getAutoScrapingStatus,
  getContentById,
  aiSearch 
} = require('../controllers/search.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Rutas de Búsqueda Avanzada
 * Todas las rutas requieren autenticación
 */

// GET /api/search - Búsqueda avanzada con filtros múltiples
router.get('/', authenticateToken, advancedSearch);

// GET /api/search/filters - Obtener opciones disponibles para filtros
router.get('/filters', authenticateToken, getFilterOptions);

// GET /api/search/stats - Obtener estadísticas de búsqueda
router.get('/stats', authenticateToken, getSearchStats);

// POST /api/search/run-auto-scraping - Ejecutar scraping automático manualmente
router.post('/run-auto-scraping', authenticateToken, runAutoScraping);

// GET /api/search/auto-scraping-status - Obtener estado del scraping automático
router.get('/auto-scraping-status', authenticateToken, getAutoScrapingStatus);

// GET /api/search/content/:id - Obtener contenido completo por ID
router.get('/content/:id', authenticateToken, getContentById);

// POST /api/search/ai - Búsqueda inteligente con IA
router.post('/ai', authenticateToken, aiSearch);

module.exports = router;