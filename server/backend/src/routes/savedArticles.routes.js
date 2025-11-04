const express = require('express');
const router = express.Router();
const savedArticlesController = require('../controllers/savedArticles.controller');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener estadísticas
router.get('/stats', savedArticlesController.getSavedArticlesStats);

// CRUD de artículos guardados
router.post('/', savedArticlesController.saveArticle);
router.get('/', savedArticlesController.getSavedArticles);
router.put('/:id', savedArticlesController.updateSavedArticle);
router.delete('/:id', savedArticlesController.deleteSavedArticle);

module.exports = router;
