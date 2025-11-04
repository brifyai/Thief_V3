/**
 * 🔹 FASE 4: MIDDLEWARE DE MANEJO DE ERRORES MEJORADO
 * Sistema centralizado y consistente para manejar todos los errores de la aplicación
 */

const { 
  AppError, 
  ErrorFactory,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ServiceUnavailableError,
  TimeoutError,
  CacheError,
  QueueError,
  JSONParseError
} = require('../utils/AppError');

/**
 * Middleware principal de manejo de errores
 */
const errorHandler = (err, req, res, next) => {
  let error = ErrorFactory.wrap(err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query
  });

  // Loggear error con contexto completo
  logError(error, req);

  // Manejar errores específicos conocidos
  error = handleKnownErrors(error, err);

  // Enviar respuesta de error consistente
  sendErrorResponse(res, error);
};

/**
 * Maneja errores conocidos y los convierte a errores personalizados
 */
function handleKnownErrors(error, originalError) {
  // Error de validación de JWT
  if (originalError.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token format');
  }

  // Error de expiración de JWT
  if (originalError.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }

  // Error de casteo de Mongoose
  if (originalError.name === 'CastError') {
    return new ValidationError('Invalid ID format');
  }

  // Error de validación de Mongoose
  if (originalError.name === 'ValidationError') {
    return ErrorFactory.validation(originalError.errors);
  }

  // Error de sintaxis de JSON
  if (originalError instanceof SyntaxError && originalError.type === 'entity.parse.failed') {
    return new JSONParseError('Invalid JSON in request body');
  }

  // Error de límite de tamaño
  if (originalError.type === 'entity.too.large') {
    return new ValidationError('Request entity too large');
  }

  // Error de timeout
  if (originalError.code === 'ETIMEDOUT' || originalError.code === 'ESOCKETTIMEDOUT') {
    return new TimeoutError('request', 30000);
  }

  // Error de conexión rechazada
  if (originalError.code === 'ECONNREFUSED') {
    return new ServiceUnavailableError('External Service', 'Connection refused');
  }

  // Error de Chutes AI/API externa
  if (originalError.message?.includes('groq') || originalError.message?.includes('API')) {
    return ErrorFactory.external('Chutes AI API', 'unknown', 500, originalError);
  }

  // Error de Redis
  if (originalError.message?.includes('Redis') || originalError.message?.includes('ioredis')) {
    return new CacheError('connection', 'unknown', originalError.message);
  }

  // Error de BullMQ
  if (originalError.message?.includes('BullMQ') || originalError.message?.includes('Queue')) {
    return new QueueError('operation', 'unknown', originalError.message);
  }

  return error;
}

/**
 * Envía respuesta de error consistente
 */
function sendErrorResponse(res, error) {
  const response = error.toJSON();

  // Agregar headers de seguridad
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });

  res.status(error.statusCode).json(response);
}

/**
 * Loguea errores con contexto estructurado
 */
function logError(error, req) {
  const logData = {
    timestamp: new Date().toISOString(),
    level: getLogLevel(error.statusCode),
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      headers: sanitizeHeaders(req.headers),
      params: req.params,
      query: req.query
    },
    error: {
      stack: error.stack,
      details: error.details,
      isOperational: error.isOperational
    }
  };

  // Loguear según el nivel de severidad
  if (error.statusCode >= 500) {
    console.error('🚨 SERVER ERROR:', JSON.stringify(logData, null, 2));
  } else if (error.statusCode >= 400) {
    console.warn('⚠️ CLIENT ERROR:', JSON.stringify(logData, null, 2));
  } else {
    console.info('ℹ️ ERROR:', JSON.stringify(logData, null, 2));
  }

  // En producción, enviar errores críticos a servicio externo si está configurado
  if (process.env.NODE_ENV === 'production' && error.statusCode >= 500) {
    sendToExternalLogging(logData);
  }
}

/**
 * Determina el nivel de log basado en el código de estado
 */
function getLogLevel(statusCode) {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

/**
 * Sanitiza headers para evitar loguear información sensible
 */
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  
  // Remover headers sensibles
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  sensitiveHeaders.forEach(header => {
    delete sanitized[header];
  });

  return sanitized;
}

/**
 * Envía logs a servicio externo en producción
 */
function sendToExternalLogging(logData) {
  // Implementar envío a servicio como Sentry, LogRocket, etc.
  if (process.env.SENTRY_DSN) {
    // Ejemplo: Sentry.captureException(logData);
  }
}

/**
 * Middleware para manejar errores asíncronos automáticamente
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware para manejar rutas no encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
};

/**
 * Middleware para validar que el body sea JSON válido
 */
const validateJSON = (req, res, next) => {
  if (req.is('application/json')) {
    try {
      // Intentar parsear para validar
      JSON.parse(req.body);
      next();
    } catch (error) {
      next(new JSONParseError('Invalid JSON in request body'));
    }
  } else {
    next();
  }
};

/**
 * Middleware para validar Content-Type
 */
const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      return next();
    }

    const contentType = req.get('Content-Type');
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      return next(new ValidationError(`Content-Type must be one of: ${allowedTypes.join(', ')}`));
    }

    next();
  };
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  validateJSON,
  validateContentType
};
