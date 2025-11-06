const express = require('express');

const router = express.Router();

/**
 * Rutas para noticias humanizadas
 * Prefijo: /api/news/humanized
 */

// Middleware temporal para desarrollo
const mockAuth = (req, res, next) => {
  next();
};

// Mock controller para desarrollo
const mockController = {
  getHumanizedNews: (req, res) => {
    res.json({
      success: true,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    });
  },
  getHumanizedStats: (req, res) => {
    res.json({
      success: true,
      data: { total_humanized: 0, ready_for_use: 0 }
    });
  },
  getCategories: (req, res) => {
    res.json({ success: true, data: [] });
  },
  getHumanizedNewsById: (req, res) => {
    res.json({ success: false, error: 'Noticia no encontrada' });
  },
  createHumanizedNews: (req, res) => {
    res.json({ success: true, data: { id: 1 } });
  },
  updateHumanizedNews: (req, res) => {
    res.json({ success: true, data: { id: req.params.id } });
  },
  deleteHumanizedNews: (req, res) => {
    res.json({ success: true, data: { message: 'Eliminado' } });
  }
};

/**
 * @route GET /api/news/humanized
 * @desc Obtener noticias humanizadas con paginación y filtros
 * @access Public
 */
router.get('/', mockController.getHumanizedNews);

/**
 * @route GET /api/news/humanized/stats
 * @desc Obtener estadísticas de noticias humanizadas
 * @access Public
 */
router.get('/stats', mockController.getHumanizedStats);

/**
 * @route GET /api/news/humanized/categories
 * @desc Obtener categorías de noticias humanizadas
 * @access Public
 */
router.get('/categories', mockController.getCategories);

/**
 * @route GET /api/news/humanized/:id
 * @desc Obtener noticia humanizada por ID
 * @access Public
 */
router.get('/:id', mockController.getHumanizedNewsById);

/**
 * @route POST /api/news/humanized
 * @desc Crear nueva noticia humanizada
 * @access Public para desarrollo
 */
router.post('/', mockController.createHumanizedNews);

/**
 * @route PUT /api/news/humanized/:id
 * @desc Actualizar noticia humanizada
 * @access Public para desarrollo
 */
router.put('/:id', mockController.updateHumanizedNews);

/**
 * @route DELETE /api/news/humanized/:id
 * @desc Eliminar noticia humanizada (soft delete)
 * @access Public para desarrollo
 */
router.delete('/:id', mockController.deleteHumanizedNews);

module.exports = router;