const express = require('express');
const router = express.Router();
const scrapingController = require('../controllers/scraping.controller');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas de scraping requieren autenticación
/**
 * @swagger
 * /scrape:
 *   post:
 *     summary: Realizar scraping de una URL
 *     tags: [Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL a analizar
 *     responses:
 *       200:
 *         description: Scraping completado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScrapingResult'
 *       401:
 *         description: No autorizado
 *       400:
 *         description: URL inválida o error en el scraping
 */
router.post('/scrape', authenticateToken, scrapingController.scrape);

/**
 * @swagger
 * /scrape-single:
 *   post:
 *     summary: Realizar scraping de una sola URL (versión simplificada)
 *     tags: [Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL a analizar
 *     responses:
 *       200:
 *         description: Scraping completado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScrapingResult'
 *       401:
 *         description: No autorizado
 */
router.post('/scrape-single', authenticateToken, scrapingController.scrapeSingle);

/**
 * @swagger
 * /rewrite-with-ai:
 *   post:
 *     summary: Reescribir contenido usando IA
 *     tags: [Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Contenido a reescribir
 *               style:
 *                 type: string
 *                 description: Estilo de reescritura (opcional)
 *     responses:
 *       200:
 *         description: Contenido reescrito exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 originalContent:
 *                   type: string
 *                 rewrittenContent:
 *                   type: string
 *       401:
 *         description: No autorizado
 */
router.post('/rewrite-with-ai', authenticateToken, scrapingController.rewriteWithAI);

// Rutas de guardado y historial (sin prefijo /api/scraping porque el router ya se monta ahí)
/**
 * @swagger
 * /api/scraping/save:
 *   post:
 *     summary: Guardar contenido scrapeado
 *     tags: [Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - url
 *             properties:
 *               title:
 *                 type: string
 *                 description: Título del artículo
 *               content:
 *                 type: string
 *                 description: Contenido del artículo
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL original
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL de la imagen (opcional)
 *     responses:
 *       201:
 *         description: Contenido guardado exitosamente
 *       401:
 *         description: No autorizado
 */
router.post('/save', authenticateToken, scrapingController.saveScrapedContent);

/**
 * @swagger
 * /api/scraping/history:
 *   get:
 *     summary: Obtener historial de scraping
 *     tags: [Scraping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Límite de resultados por página
 *     responses:
 *       200:
 *         description: Historial obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ScrapingResult'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: No autorizado
 */
router.get('/history', authenticateToken, scrapingController.getScrapingHistory);

/**
 * @swagger
 * /api/scraping/content/{id}:
 *   get:
 *     summary: Obtener contenido específico por ID
 *     tags: [Scraping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del contenido
 *     responses:
 *       200:
 *         description: Contenido obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScrapingResult'
 *       404:
 *         description: Contenido no encontrado
 *       401:
 *         description: No autorizado
 */
router.get('/content/:id', authenticateToken, scrapingController.getScrapingContent);

// Ruta para probar selectores personalizados
router.post('/test-selectors', authenticateToken, scrapingController.testCustomSelectors);

// Rutas para listados (múltiples noticias)
router.post('/test-listing', authenticateToken, scrapingController.testListingSelectors);
router.post('/scrape-listing', authenticateToken, scrapingController.scrapeListingPage);

module.exports = router;
