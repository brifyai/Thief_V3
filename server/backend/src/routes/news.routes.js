const express = require('express');
const router = express.Router();
const newsController = require('../controllers/news.controller');
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

// Aplicar rate limiting a todas las rutas de noticias
router.use(createRateLimitMiddleware());

/**
 * @route   GET /api/news
 * @desc    Obtener lista de noticias con paginación y filtros
 * @access  Public
 */
router.get('/', newsController.getNews);

/**
 * @route   GET /api/news/stats
 * @desc    Obtener estadísticas de noticias
 * @access  Public
 */
router.get('/stats', newsController.getNewsStats);

/**
 * @route   GET /api/news/selected
 * @desc    Obtener noticias seleccionadas por el usuario
 * @access  Private
 */
router.get('/selected', authenticateToken, newsController.getUserSelectedNews);

/**
 * @route   DELETE /api/news/selected
 * @desc    Deseleccionar todas las noticias del usuario
 * @access  Private
 */
router.delete('/selected', authenticateToken, newsController.clearAllSelections);

/**
 * @route   POST /api/news/batch-select
 * @desc    Seleccionar múltiples noticias
 * @access  Private
 */
router.post('/batch-select', authenticateToken, newsController.batchSelectNews);

/**
 * @route   GET /api/news/export
 * @desc    Exportar noticias seleccionadas
 * @access  Private
 */
router.get('/export', authenticateToken, newsController.exportNews);

/**
 * @route   GET /api/news/:id
 * @desc    Obtener noticia por ID
 * @access  Public
 */
router.get('/:id', newsController.getNewsById);

/**
 * @route   POST /api/news/:id/select
 * @desc    Seleccionar o deseleccionar noticia
 * @access  Private
 */
router.post('/:id/select', authenticateToken, newsController.toggleNewsSelection);

/**
 * @route   POST /api/news/:id/humanize
 * @desc    Humanizar noticia
 * @access  Private
 */
router.post('/:id/humanize', authenticateToken, newsController.humanizeNews);

module.exports = router;