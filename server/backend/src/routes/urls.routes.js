const express = require('express');
const router = express.Router();
const urlsController = require('../controllers/urls.controller');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas de URLs requieren autenticación
router.get('/urls', authenticateToken, urlsController.getUrls);
router.post('/urls', authenticateToken, urlsController.createUrl);
router.delete('/urls/:id', authenticateToken, urlsController.deleteUrl);

module.exports = router;
