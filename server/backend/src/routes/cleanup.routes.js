const express = require('express');
const router = express.Router();
const cleanupController = require('../controllers/cleanup.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

/**
 * Rutas para gestión de limpieza de noticias
 * 
 * Todas las rutas requieren autenticación
 * Algunas requieren rol de admin
 */

// Obtener configuración de limpieza (cualquier usuario autenticado)
router.get('/config', authenticateToken, cleanupController.getConfig);

// Obtener estadísticas de la base de datos (cualquier usuario autenticado)
router.get('/stats', authenticateToken, cleanupController.getStats);

// Obtener noticias próximas a expirar (cualquier usuario autenticado)
router.get('/expiring', authenticateToken, cleanupController.getExpiring);

// Ejecutar limpieza manual (solo admin)
router.post('/run', authenticateToken, requireRole('admin'), cleanupController.runCleanup);

module.exports = router;
