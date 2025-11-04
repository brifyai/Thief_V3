const express = require('express');
const router = express.Router();
const siteConfigController = require('../controllers/siteConfigController');
const { authenticateToken } = require('../middleware/auth');
const { 
  testSelectorsLimiter, 
  createConfigLimiter, 
  generalApiLimiter 
} = require('../middleware/rateLimiter.middleware');

/**
 * Rutas públicas (sin autenticación)
 */

// GET /api/site-configs - Listar todas las configuraciones
router.get('/', generalApiLimiter, siteConfigController.listConfigs);

// GET /api/site-configs/:domain - Obtener configuración específica
router.get('/:domain', generalApiLimiter, siteConfigController.getConfig);

/**
 * Rutas protegidas (requieren autenticación)
 */

// POST /api/site-configs/test - Probar selectores
router.post(
  '/test', 
  authenticateToken, 
  testSelectorsLimiter, 
  siteConfigController.testSelectors
);

// POST /api/site-configs - Crear nueva configuración
router.post(
  '/', 
  authenticateToken, 
  createConfigLimiter, 
  siteConfigController.createConfig
);

// PUT /api/site-configs/:domain - Actualizar configuración
router.put(
  '/:domain', 
  authenticateToken, 
  generalApiLimiter, 
  siteConfigController.updateConfig
);

// POST /api/site-configs/:domain/verify - Verificar configuración
router.post(
  '/:domain/verify', 
  authenticateToken, 
  generalApiLimiter, 
  siteConfigController.verifyConfig
);

// DELETE /api/site-configs/:domain - Desactivar configuración
router.delete(
  '/:domain', 
  authenticateToken, 
  generalApiLimiter, 
  siteConfigController.deleteConfig
);

module.exports = router;
