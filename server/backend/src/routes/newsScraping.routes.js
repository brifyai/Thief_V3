const express = require('express');
const router = express.Router();
const newsScrapingController = require('../controllers/newsScraping.controller');
const { authenticateToken } = require('../middleware/auth');
const { RateLimiter } = require('../utils/rateLimiter');
const { validateInteractions } = require('../middleware/validateInteractions');

// Crear middleware de rate limiting simple
const createRateLimitMiddleware = (maxRequests = 50, windowMs = 60000) => {
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

// Aplicar rate limiting a todas las rutas de scraping
router.use(createRateLimitMiddleware());

/**
 * @route   POST /api/news/scrape/url
 * @desc    Scrapear una noticia desde una URL específica
 * @access  Private
 */
router.post('/url', authenticateToken, validateInteractions, newsScrapingController.scrapeNewsFromUrl);

/**
 * @route   POST /api/news/scrape/source
 * @desc    Scrapear noticias de una fuente configurada
 * @access  Private
 */
router.post('/source', authenticateToken, validateInteractions, newsScrapingController.scrapeNewsFromSource);

/**
 * @route   POST /api/news/scrape/all
 * @desc    Scrapear noticias de todas las fuentes activas
 * @access  Private
 */
router.post('/all', authenticateToken, validateInteractions, newsScrapingController.scrapeAllSources);

/**
 * @route   GET /api/news/scrape/sources
 * @desc    Obtener lista de fuentes configuradas
 * @access  Private
 */
router.get('/sources', authenticateToken, newsScrapingController.getScrapingSources);

/**
 * @route   POST /api/news/scrape/sources
 * @desc    Agregar nueva fuente de scraping
 * @access  Private
 */
router.post('/sources', authenticateToken, newsScrapingController.addScrapingSource);

/**
 * @route   PUT /api/news/scrape/sources/:id
 * @desc    Actualizar fuente de scraping
 * @access  Private
 */
router.put('/sources/:id', authenticateToken, newsScrapingController.updateScrapingSource);

/**
 * @route   DELETE /api/news/scrape/sources/:id
 * @desc    Eliminar fuente de scraping
 * @access  Private
 */
router.delete('/sources/:id', authenticateToken, newsScrapingController.deleteScrapingSource);

/**
 * @route   POST /api/news/scrape/test
 * @desc    Probar configuración de scraping
 * @access  Private
 */
router.post('/test', authenticateToken, validateInteractions, newsScrapingController.testScrapingConfig);

/**
 * @route   GET /api/news/scrape/stats
 * @desc    Obtener estadísticas de scraping
 * @access  Private
 */
router.get('/stats', authenticateToken, newsScrapingController.getScrapingStats);

/**
 * @route   POST /api/news/scrape/process-queue
 * @desc    Procesar cola de scraping
 * @access  Private
 */
router.post('/process-queue', authenticateToken, validateInteractions, newsScrapingController.processScrapingQueue);

module.exports = router;
