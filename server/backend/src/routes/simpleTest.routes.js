// ========================================
// SIMPLE TEST ROUTES
// Rutas simplificadas para testing
// ========================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { simpleTest, testWithSelectors } = require('../controllers/simpleTest.controller');

// Test simple (solo URL)
router.post('/', authenticateToken, simpleTest);

// Test con selectores (opcional)
router.post('/with-selectors', authenticateToken, testWithSelectors);

module.exports = router;
