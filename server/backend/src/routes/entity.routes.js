const express = require('express');
const router = express.Router();
const entityController = require('../controllers/entity.controller');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// CRUD de entidades
router.post('/', entityController.createEntity);
router.get('/', entityController.getEntities);
router.get('/:id', entityController.getEntityById);
router.put('/:id', entityController.updateEntity);
router.delete('/:id', entityController.deleteEntity);

// Operaciones especiales
router.patch('/:id/toggle', entityController.toggleActive);
router.get('/:id/stats', entityController.getEntityStats);
router.get('/:id/mentions', entityController.getEntityMentions);
router.get('/:id/timeline', entityController.getEntityTimeline);
router.get('/:id/alerts', entityController.getEntityAlerts);
router.post('/:id/analyze', entityController.analyzeNow);

module.exports = router;
