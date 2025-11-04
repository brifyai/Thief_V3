const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const {
  testUrl,
  createPublicUrl,
  getPublicUrls,
  getPublicUrlById,
  updatePublicUrl,
  deletePublicUrl,
  retestPublicUrl
} = require('../controllers/publicUrls.controller');

// Rutas públicas (requieren autenticación pero no rol específico)
router.get('/', authenticateToken, getPublicUrls);
router.get('/:id', authenticateToken, getPublicUrlById);

// Rutas de admin (requieren rol admin)
router.post('/test', authenticateToken, requireRole('admin'), testUrl); // 🆕 Test de URL
router.post('/', authenticateToken, requireRole('admin'), createPublicUrl);
router.put('/:id', authenticateToken, requireRole('admin'), updatePublicUrl);
router.put('/:id/retest', authenticateToken, requireRole('admin'), retestPublicUrl); // 🆕 Re-test de URL
router.delete('/:id', authenticateToken, requireRole('admin'), deletePublicUrl);

module.exports = router;
