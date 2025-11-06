const express = require('express');
const router = express.Router();
const newsSearchController = require('../controllers/newsSearch.controller');
const { authenticateToken } = require('../middleware/auth');
const { RateLimiter } = require('../utils/rateLimiter');

// Crear middleware de rate limiting simple
const createRateLimitMiddleware = (maxRequests = 100, windowMs = 60000) => {
  const limiter = new RateLimiter(maxRequests, windowMs);
  
  return async (req, res, next) => {
    try {
      await limiter.acquire();
      next();
    } catch (error) {
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        error: error.message
      });
    }
  };
};

// Aplicar rate limiting a todas las rutas de búsqueda
router.use(createRateLimitMiddleware());

/**
 * @route   POST /api/news/search
 * @desc    Búsqueda avanzada de noticias
 * @access  Public
 */
router.post('/', newsSearchController.searchNews);

/**
 * @route   GET /api/news/search/similar/:id
 * @desc    Encontrar noticias similares
 * @access  Public
 */
router.get('/similar/:id', newsSearchController.findSimilarNews);

/**
 * @route   GET /api/news/search/trending
 * @desc    Obtener noticias trending
 * @access  Public
 */
router.get('/trending', newsSearchController.getTrendingNews);

/**
 * @route   GET /api/news/search/suggestions
 * @desc    Autocompletar para búsqueda
 * @access  Public
 */
router.get('/suggestions', newsSearchController.getSearchSuggestions);

/**
 * @route   POST /api/news/search/advanced
 * @desc    Búsqueda avanzada con filtros complejos
 * @access  Public
 */
router.post('/advanced', newsSearchController.advancedSearch);

/**
 * @route   GET /api/news/search/filters
 * @desc    Obtener filtros disponibles para búsqueda
 * @access  Public
 */
router.get('/filters', newsSearchController.getAvailableFilters);

/**
 * @route   POST /api/news/search/save
 * @desc    Guardar búsqueda para uso futuro
 * @access  Private
 */
router.post('/save', authenticateToken, newsSearchController.saveSearch);

/**
 * @route   GET /api/news/search/saved
 * @desc    Obtener búsquedas guardadas del usuario
 * @access  Private
 */
router.get('/saved', authenticateToken, newsSearchController.getSavedSearches);

/**
 * @route   DELETE /api/news/search/saved/:id
 * @desc    Eliminar búsqueda guardada
 * @access  Private
 */
router.delete('/saved/:id', authenticateToken, newsSearchController.deleteSavedSearch);

/**
 * @route   GET /api/news/search/history
 * @desc    Obtener historial de búsqueda del usuario
 * @access  Private
 */
router.get('/history', authenticateToken, newsSearchController.getSearchHistory);

/**
 * @route   POST /api/news/search/history
 * @desc    Registrar búsqueda en historial
 * @access  Private
 */
router.post('/history', authenticateToken, newsSearchController.recordSearchHistory);

/**
 * @route   DELETE /api/news/search/history
 * @desc    Limpiar historial de búsqueda del usuario
 * @access  Private
 */
router.delete('/history', authenticateToken, newsSearchController.clearSearchHistory);

module.exports = router;