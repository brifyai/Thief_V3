// ========================================
// INTERACTIONS CONTROLLER
// Controlador para gestión de interacciones
// ========================================

let interactionManager;
try {
  interactionManager = require('../services/interactionManager.service');
} catch (error) {
  console.error('Error loading interactionManager:', error);
  interactionManager = null;
}

const { loggers } = require('../utils/logger');
const { AppError } = require('../utils/AppError');

// Función auxiliar para validar que el manager está disponible
const ensureManager = () => {
  if (!interactionManager) {
    throw new AppError('Interaction Manager no disponible', 503);
  }
};

/**
 * GET /api/interactions/balance
 * Obtener saldo de interacciones del usuario actual
 */
exports.getBalance = async (req, res, next) => {
  try {
    ensureManager();
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const balance = await interactionManager.getBalance(userId);

    res.status(200).json({
      success: true,
      data: balance,
      message: 'Saldo obtenido exitosamente'
    });

  } catch (error) {
    loggers.general.error('Error en getBalance:', error);
    next(error);
  }
};

/**
 * GET /api/interactions/history
 * Obtener historial de consumo del usuario actual
 */
exports.getHistory = async (req, res, next) => {
  try {
    ensureManager();
    const userId = req.user?.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    if (!userId) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const history = await interactionManager.getHistory(userId, limit, offset);

    res.status(200).json({
      success: true,
      data: history,
      message: 'Historial obtenido exitosamente'
    });

  } catch (error) {
    loggers.general.error('Error en getHistory:', error);
    next(error);
  }
};

/**
 * GET /api/interactions/stats
 * Obtener estadísticas de consumo del usuario actual
 */
exports.getStats = async (req, res, next) => {
  try {
    ensureManager();
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const stats = await interactionManager.getStats(userId);

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Estadísticas obtenidas exitosamente'
    });

  } catch (error) {
    loggers.general.error('Error en getStats:', error);
    next(error);
  }
};

/**
 * GET /api/admin/interactions
 * Listar todos los usuarios con sus interacciones (admin)
 */
exports.listAllUsers = async (req, res, next) => {
  try {
    ensureManager();
    // Verificar que sea admin
    if (req.user?.role !== 'admin') {
      throw new AppError('Acceso denegado: se requiere rol admin', 403);
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await interactionManager.listAllUsers(limit, offset);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Usuarios listados exitosamente'
    });

  } catch (error) {
    loggers.general.error('Error en listAllUsers:', error);
    next(error);
  }
};

/**
 * GET /api/admin/interactions/:userId
 * Obtener detalles de un usuario específico (admin)
 */
exports.getUserDetails = async (req, res, next) => {
  try {
    ensureManager();
    // Verificar que sea admin
    if (req.user?.role !== 'admin') {
      throw new AppError('Acceso denegado: se requiere rol admin', 403);
    }

    const { userId } = req.params;

    if (!userId) {
      throw new AppError('User ID requerido', 400);
    }

    const details = await interactionManager.getUserDetails(userId);
    const history = await interactionManager.getHistory(userId, 20, 0);
    const stats = await interactionManager.getStats(userId);

    res.status(200).json({
      success: true,
      data: {
        user: details,
        stats,
        recent_history: history.logs
      },
      message: 'Detalles del usuario obtenidos exitosamente'
    });

  } catch (error) {
    loggers.general.error('Error en getUserDetails:', error);
    next(error);
  }
};

/**
 * POST /api/admin/interactions/assign
 * Asignar interacciones a un usuario (admin)
 */
exports.assignInteractions = async (req, res, next) => {
  try {
    ensureManager();
    // Verificar que sea admin
    if (req.user?.role !== 'admin') {
      throw new AppError('Acceso denegado: se requiere rol admin', 403);
    }

    const { userId, amount } = req.body;
    const adminId = req.user?.id;

    if (!userId || !amount) {
      throw new AppError('User ID y amount requeridos', 400);
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new AppError('Amount debe ser un número positivo', 400);
    }

    const result = await interactionManager.assignInteractions(userId, amount, adminId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Interacciones asignadas exitosamente'
    });

  } catch (error) {
    loggers.general.error('Error en assignInteractions:', error);
    next(error);
  }
};

/**
 * PUT /api/admin/interactions/limit
 * Cambiar límite diario global (admin)
 */
exports.updateDailyLimit = async (req, res, next) => {
  try {
    ensureManager();
    // Verificar que sea admin
    if (req.user?.role !== 'admin') {
      throw new AppError('Acceso denegado: se requiere rol admin', 403);
    }

    const { daily_limit } = req.body;
    const adminId = req.user?.id;

    if (!daily_limit) {
      throw new AppError('daily_limit requerido', 400);
    }

    if (typeof daily_limit !== 'number' || daily_limit <= 0) {
      throw new AppError('daily_limit debe ser un número positivo', 400);
    }

    const result = await interactionManager.updateSetting('daily_limit', daily_limit, adminId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Límite diario actualizado exitosamente'
    });

  } catch (error) {
    loggers.general.error('Error en updateDailyLimit:', error);
    next(error);
  }
};

/**
 * GET /api/admin/interactions/settings
 * Obtener configuración global (admin)
 */
exports.getSettings = async (req, res, next) => {
  try {
    ensureManager();
    // Verificar que sea admin
    if (req.user?.role !== 'admin') {
      throw new AppError('Acceso denegado: se requiere rol admin', 403);
    }

    const settings = await interactionManager.getSettings();

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Configuración obtenida exitosamente'
    });

  } catch (error) {
    loggers.general.error('Error en getSettings:', error);
    next(error);
  }
};

/**
 * POST /api/admin/interactions/reset
 * Resetear interacciones diarias manualmente (admin)
 */
exports.resetDaily = async (req, res, next) => {
  try {
    ensureManager();
    // Verificar que sea admin
    if (req.user?.role !== 'admin') {
      throw new AppError('Acceso denegado: se requiere rol admin', 403);
    }

    const result = await interactionManager.resetDailyInteractions();

    res.status(200).json({
      success: true,
      data: result,
      message: 'Interacciones diarias reseteadas exitosamente'
    });

  } catch (error) {
    loggers.general.error('Error en resetDaily:', error);
    next(error);
  }
};

/**
 * POST /api/interactions/validate
 * Validar si el usuario tiene interacciones disponibles
 */
exports.validateBalance = async (req, res, next) => {
  try {
    ensureManager();
    const userId = req.user?.id;
    const { required_interactions } = req.body;

    if (!userId) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const hasBalance = await interactionManager.validateBalance(
      userId,
      required_interactions || 1
    );

    res.status(200).json({
      success: true,
      data: {
        has_balance: hasBalance,
        required_interactions: required_interactions || 1
      },
      message: hasBalance ? 'Saldo disponible' : 'Saldo insuficiente'
    });

  } catch (error) {
    loggers.general.error('Error en validateBalance:', error);
    next(error);
  }
};
