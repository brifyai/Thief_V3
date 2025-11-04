const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  selectUrl,
  unselectUrl,
  getMyUrls,
  getMyDomains
} = require('../controllers/userUrlSelections.controller');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Gestión de selecciones
router.post('/select', selectUrl);
router.delete('/select/:id', unselectUrl);
router.get('/', getMyUrls);
router.get('/domains', getMyDomains);

module.exports = router;
