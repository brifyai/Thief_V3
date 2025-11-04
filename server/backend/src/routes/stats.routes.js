const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const { authenticateToken } = require('../middleware/auth');

// Ruta de estadísticas requiere autenticación
router.get('/stats', authenticateToken, statsController.getStats);

module.exports = router;
