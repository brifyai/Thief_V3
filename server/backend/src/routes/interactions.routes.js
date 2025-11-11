// ========================================
// INTERACTIONS ROUTES
// Rutas para gestión de interacciones
// ========================================

const express = require('express');
const router = express.Router();

let interactionsController;
try {
  interactionsController = require('../controllers/interactions.controller');
} catch (error) {
  console.error('Error loading interactions controller:', error);
  interactionsController = {};
}

// Middleware para validar que el controlador está disponible
const ensureController = (req, res, next) => {
  if (!interactionsController || Object.keys(interactionsController).length === 0) {
    return res.status(503).json({
      success: false,
      message: 'Interactions service temporarily unavailable'
    });
  }
  next();
};

router.use(ensureController);

// ========================================
// RUTAS PÚBLICAS (requieren autenticación)
// ========================================

/**
 * GET /api/interactions/balance
 * Obtener saldo de interacciones del usuario actual
 */
router.get('/balance', (req, res, next) => {
  if (interactionsController.getBalance) {
    interactionsController.getBalance(req, res, next);
  } else {
    res.status(503).json({ success: false, message: 'Service unavailable' });
  }
});

/**
 * GET /api/interactions/history
 * Obtener historial de consumo del usuario actual
 */
router.get('/history', (req, res, next) => {
  if (interactionsController.getHistory) {
    interactionsController.getHistory(req, res, next);
  } else {
    res.status(503).json({ success: false, message: 'Service unavailable' });
  }
});

/**
 * GET /api/interactions/stats
 * Obtener estadísticas de consumo del usuario actual
 */
router.get('/stats', (req, res, next) => {
  if (interactionsController.getStats) {
    interactionsController.getStats(req, res, next);
  } else {
    res.status(503).json({ success: false, message: 'Service unavailable' });
  }
});

/**
 * POST /api/interactions/validate
 * Validar si el usuario tiene interacciones disponibles
 */
router.post('/validate', (req, res, next) => {
  if (interactionsController.validateBalance) {
    interactionsController.validateBalance(req, res, next);
  } else {
    res.status(503).json({ success: false, message: 'Service unavailable' });
  }
});

// ========================================
// RUTAS ADMIN
// ========================================

/**
 * GET /api/admin/interactions
 * Listar todos los usuarios con sus interacciones
 */
router.get('/admin/interactions', (req, res, next) => {
  if (interactionsController.listAllUsers) {
    interactionsController.listAllUsers(req, res, next);
  } else {
    res.status(503).json({ success: false, message: 'Service unavailable' });
  }
});

/**
 * GET /api/admin/interactions/:userId
 * Obtener detalles de un usuario específico
 */
router.get('/admin/interactions/:userId', (req, res, next) => {
  if (interactionsController.getUserDetails) {
    interactionsController.getUserDetails(req, res, next);
  } else {
    res.status(503).json({ success: false, message: 'Service unavailable' });
  }
});

/**
 * POST /api/admin/interactions/assign
 * Asignar interacciones a un usuario
 */
router.post('/admin/interactions/assign', (req, res, next) => {
  if (interactionsController.assignInteractions) {
    interactionsController.assignInteractions(req, res, next);
  } else {
    res.status(503).json({ success: false, message: 'Service unavailable' });
  }
});

/**
 * PUT /api/admin/interactions/limit
 * Cambiar límite diario global
 */
router.put('/admin/interactions/limit', (req, res, next) => {
  if (interactionsController.updateDailyLimit) {
    interactionsController.updateDailyLimit(req, res, next);
  } else {
    res.status(503).json({ success: false, message: 'Service unavailable' });
  }
});

/**
 * GET /api/admin/interactions/settings
 * Obtener configuración global
 */
router.get('/admin/interactions/settings', (req, res, next) => {
  if (interactionsController.getSettings) {
    interactionsController.getSettings(req, res, next);
  } else {
    res.status(503).json({ success: false, message: 'Service unavailable' });
  }
});

/**
 * POST /api/admin/interactions/reset
 * Resetear interacciones diarias manualmente
 */
router.post('/admin/interactions/reset', (req, res, next) => {
  if (interactionsController.resetDaily) {
    interactionsController.resetDaily(req, res, next);
  } else {
    res.status(503).json({ success: false, message: 'Service unavailable' });
  }
});

module.exports = router;
