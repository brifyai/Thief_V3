/**
 * 🔹 FASE 4: CLASES DE ERROR PERSONALIZADAS
 * Sistema estandarizado de manejo de errores para toda la aplicación
 */

/**
 * Clase base para todos los errores de la aplicación
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convierte el error a formato JSON para respuestas API
   */
  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(Object.keys(this.details).length > 0 && { details: this.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
      }
    };
  }

  /**
   * Verifica si el error es de un tipo específico
   */
  isType(errorType) {
    return this.constructor.name === errorType;
  }
}

/**
 * Error de validación (400)
 */
class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Error de recurso no encontrado (404)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Error de no autorizado (401)
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Error de prohibido (403)
 */
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Error de límite de velocidad (429)
 */
class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Error de conflicto (409)
 */
class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Error de servicio no disponible (503)
 */
class ServiceUnavailableError extends AppError {
  constructor(service = 'Service') {
    super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Error de base de datos (500)
 */
class DatabaseError extends AppError {
  constructor(message, details = {}) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

/**
 * Error de IA/API externa (502)
 */
class ExternalServiceError extends AppError {
  constructor(service, message, details = {}) {
    super(`${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', { service, ...details });
  }
}

/**
 * Error de timeout (408)
 */
class TimeoutError extends AppError {
  constructor(operation, timeout) {
    super(`Operation ${operation} timed out after ${timeout}ms`, 408, 'TIMEOUT_ERROR', { operation, timeout });
  }
}

/**
 * Error de parseo de JSON (400)
 */
class JSONParseError extends ValidationError {
  constructor(message = 'Invalid JSON format') {
    super(message, { type: 'JSON_PARSE_ERROR' });
  }
}

/**
 * Error de autenticación (401)
 */
class AuthenticationError extends UnauthorizedError {
  constructor(message = 'Authentication failed') {
    super(message);
    this.code = 'AUTHENTICATION_ERROR';
  }
}

/**
 * Error de autorización (403)
 */
class AuthorizationError extends ForbiddenError {
  constructor(action = 'perform this action') {
    super(`You are not authorized to ${action}`);
    this.code = 'AUTHORIZATION_ERROR';
  }
}

/**
 * Error de cuota excedida (429)
 */
class QuotaExceededError extends RateLimitError {
  constructor(resource, limit) {
    super(`${resource} quota exceeded. Limit: ${limit}`);
    this.code = 'QUOTA_EXCEEDED';
    this.details = { resource, limit };
  }
}

/**
 * Error de configuración (500)
 */
class ConfigurationError extends AppError {
  constructor(setting, message) {
    super(`Configuration error in ${setting}: ${message}`, 500, 'CONFIGURATION_ERROR', { setting });
  }
}

/**
 * Error de validación de entidad (400)
 */
class EntityValidationError extends ValidationError {
  constructor(entity, field, value, reason) {
    super(`Invalid ${entity} ${field}: ${reason}`, {
      type: 'ENTITY_VALIDATION_ERROR',
      entity,
      field,
      value,
      reason
    });
  }
}

/**
 * Error de scraping (422)
 */
class ScrapingError extends AppError {
  constructor(url, message, details = {}) {
    super(`Scraping error for ${url}: ${message}`, 422, 'SCRAPING_ERROR', { url, ...details });
  }
}

/**
 * Error de cache (500)
 */
class CacheError extends AppError {
  constructor(operation, key, message) {
    super(`Cache ${operation} error for key ${key}: ${message}`, 500, 'CACHE_ERROR', { operation, key });
  }
}

/**
 * Error de cola (500)
 */
class QueueError extends AppError {
  constructor(operation, jobId, message) {
    super(`Queue ${operation} error for job ${jobId}: ${message}`, 500, 'QUEUE_ERROR', { operation, jobId });
  }
}

/**
 * Utilidad para crear errores de forma consistente
 */
class ErrorFactory {
  /**
   * Crea un error de validación con múltiples campos
   */
  static validation(fields) {
    const details = {};
    
    if (Array.isArray(fields)) {
      fields.forEach(field => {
        if (typeof field === 'string') {
          details[field] = 'Invalid value';
        } else if (typeof field === 'object') {
          Object.assign(details, field);
        }
      });
    } else {
      Object.assign(details, fields);
    }
    
    return new ValidationError('Validation failed', details);
  }

  /**
   * Crea un error de base de datos con contexto
   */
  static database(operation, table, originalError) {
    return new DatabaseError(`Database ${operation} failed on ${table}`, {
      operation,
      table,
      originalError: originalError.message,
      ...(process.env.NODE_ENV === 'development' && { stack: originalError.stack })
    });
  }

  /**
   * Crea un error de servicio externo con contexto
   */
  static external(service, endpoint, statusCode, originalError) {
    return new ExternalServiceError(service, `${endpoint} returned ${statusCode}`, {
      endpoint,
      statusCode,
      originalError: originalError.message
    });
  }

  /**
   * Crea un error de timeout con contexto
   */
  static timeout(operation, timeoutMs) {
    return new TimeoutError(operation, timeoutMs);
  }

  /**
   * Crea un error de entidad no encontrada
   */
  static notFound(entity, identifier) {
    return new NotFoundError(`${entity} with identifier '${identifier}' not found`);
  }

  /**
   * Crea un error de conflicto
   */
  static conflict(resource, reason) {
    return new ConflictError(`${resource} conflict: ${reason}`);
  }

  /**
   * Crea un error de autorización
   */
  static forbidden(action, resource) {
    return new AuthorizationError(`${action} on ${resource}`);
  }

  /**
   * Wrap de errores desconocidos
   */
  static wrap(error, context = {}) {
    if (error instanceof AppError) {
      return error;
    }

    // Si es un error conocido, convertirlo
    if (error.name === 'ValidationError') {
      return new ValidationError(error.message, { originalError: error.message });
    }

    if (error.name === 'CastError') {
      return new ValidationError('Invalid data format', { originalError: error.message });
    }

    if (error.name === 'JsonWebTokenError') {
      return new AuthenticationError('Invalid token');
    }

    if (error.name === 'TokenExpiredError') {
      return new AuthenticationError('Token expired');
    }

    // Error genérico
    return new AppError(
      error.message || 'An unexpected error occurred',
      500,
      'UNKNOWN_ERROR',
      { originalError: error.message, ...context }
    );
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  ConflictError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalServiceError,
  TimeoutError,
  JSONParseError,
  AuthenticationError,
  AuthorizationError,
  QuotaExceededError,
  ConfigurationError,
  EntityValidationError,
  ScrapingError,
  CacheError,
  QueueError,
  ErrorFactory
};