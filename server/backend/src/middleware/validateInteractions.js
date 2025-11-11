// ========================================
// VALIDATE INTERACTIONS MIDDLEWARE
// Middleware para validar saldo de interacciones
// ========================================

const interactionManager = require('../services/interactionManager.service');
const { loggers } = require('../utils/logger');
const { AppError } = require('../utils/AppError');

/**
 * Middleware para validar que el usuario tiene interacciones disponibles
 * Uso: router.post('/endpoint', validateInteractions, controller)
 */
const validateInteractions = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    // Si no hay usuario autenticado, permitir (será validado por auth middleware)
    if (!userId) {
      return next();
    }

    // Validar saldo
    const hasBalance = await interactionManager.validateBalance(userId, 1);

    if (!hasBalance) {
      loggers.general.warn(`Usuario ${userId} sin interacciones disponibles`);
      throw new AppError(
        'No hay interacciones disponibles. Contacta al administrador para obtener más.',
        429
      );
    }

    // Pasar al siguiente middleware
    next();

  } catch (error) {
    loggers.general.error('Error en validateInteractions middleware:', error);
    
    // Si es un AppError, pasar tal cual
    if (error.statusCode) {
      return next(error);
    }

    // Para otros errores, permitir continuar (fallback)
    loggers.general.warn('Fallback: permitiendo operación sin validación de interacciones');
    next();
  }
};

/**
 * Middleware para validar múltiples interacciones
 * Uso: router.post('/endpoint', validateInteractions(5), controller)
 */
const validateInteractionsCount = (requiredCount = 1) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return next();
      }

      const hasBalance = await interactionManager.validateBalance(userId, requiredCount);

      if (!hasBalance) {
        loggers.general.warn(
          `Usuario ${userId} sin ${requiredCount} interacciones disponibles`
        );
        throw new AppError(
          `Se requieren ${requiredCount} interacciones. Contacta al administrador.`,
          429
        );
      }

      next();

    } catch (error) {
      loggers.general.error('Error en validateInteractionsCount middleware:', error);
      
      if (error.statusCode) {
        return next(error);
      }

      loggers.general.warn('Fallback: permitiendo operación sin validación de interacciones');
      next();
    }
  };
};

module.exports = {
  validateInteractions,
  validateInteractionsCount
};