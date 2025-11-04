const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queue.controller');
const { authenticateToken } = require('../middleware/auth');

/**
 * Rutas para gestión de colas de scraping
 * Todas las rutas requieren autenticación
 */

// Iniciar scraping automático en background
router.post('/scraping', authenticateToken, queueController.startAutoScraping);

// Obtener estado de un trabajo específico
router.get('/status/:jobId', authenticateToken, queueController.getStatus);

// Obtener todos los trabajos activos
router.get('/active', authenticateToken, queueController.getActive);

// Obtener estadísticas de la cola
router.get('/stats', authenticateToken, queueController.getStats);

// Obtener métricas de rendimiento
router.get('/metrics', authenticateToken, queueController.getPerformanceMetrics);

// Cancelar un trabajo
router.delete('/:jobId', authenticateToken, queueController.cancel);

// Limpiar trabajos antiguos (admin)
router.post('/clean', authenticateToken, queueController.clean);

module.exports = router;
