const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

// Todas las rutas requieren autenticación y rol admin
router.use(authenticateToken, requireRole('admin'));

// Obtener todos los usuarios
router.get('/', usersController.getAllUsers);

// Obtener estadísticas de usuarios
router.get('/stats', usersController.getUserStats);

// Obtener un usuario por ID
router.get('/:id', usersController.getUserById);

// Actualizar usuario
router.put('/:id', usersController.updateUser);

// Eliminar usuario
router.delete('/:id', usersController.deleteUser);

module.exports = router;
