const rateLimit = require('express-rate-limit');
const { loggers } = require('../utils/logger');

const logger = loggers.scraping;

/**
 * Rate limiter para el endpoint de test de selectores
 * Máximo 10 requests por minuto por IP
 */
const testSelectorsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 requests por ventana
  message: {
    success: false,
    error: 'Demasiadas solicitudes de prueba. Por favor espera un momento.',
    retryAfter: '1 minuto'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit excedido para IP: ${req.ip} en /test`);
    res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes de prueba. Por favor espera un momento.',
      retryAfter: '1 minuto'
    });
  }
});

/**
 * Rate limiter para creación de configuraciones
 * Máximo 5 configuraciones por hora por usuario/IP
 */
const createConfigLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: {
    success: false,
    error: 'Límite de creación de configuraciones alcanzado. Máximo 5 por hora.',
    retryAfter: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Usar el keyGenerator por defecto que maneja IPv6 correctamente
  handler: (req, res) => {
    const userId = req.user?.id || req.user?.userId || req.ip;
    logger.warn(`Rate limit excedido para usuario: ${userId} en /create`);
    res.status(429).json({
      success: false,
      error: 'Límite de creación de configuraciones alcanzado. Máximo 5 por hora.',
      retryAfter: '1 hora'
    });
  }
});

/**
 * Rate limiter general para la API de configuraciones
 * Máximo 100 requests por 15 minutos por IP
 */
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: {
    success: false,
    error: 'Demasiadas solicitudes. Por favor espera un momento.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit general excedido para IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes. Por favor espera un momento.',
      retryAfter: '15 minutos'
    });
  }
});

module.exports = {
  testSelectorsLimiter,
  createConfigLimiter,
  generalApiLimiter
};
