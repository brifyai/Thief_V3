// Sistema centralizado de manejo de errores
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface ErrorContext {
  url?: string;
  method?: string;
  userId?: string;
  timestamp?: string;
  additionalInfo?: Record<string, unknown>;
}

// Type guards para manejo seguro de errores
interface ErrorWithStatus {
  status: number;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
}

function isErrorWithStatus(error: unknown): error is ErrorWithStatus {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHistory: Array<{
    error: Error;
    context: ErrorContext;
    timestamp: string;
  }> = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Manejar errores de API de manera consistente
  handleAPIError(error: unknown, context?: ErrorContext): APIError {
    const timestamp = new Date().toISOString();
    
    // Si ya es un APIError, retornarlo
    if (error instanceof APIError) {
      this.logError(error, { ...context, timestamp });
      return error;
    }

    // Errores de respuesta HTTP
    if (isErrorWithStatus(error)) {
      const apiError = new APIError(
        error.message || `HTTP ${error.status}`,
        error.status,
        error.code,
        error.details
      );
      this.logError(apiError, { ...context, timestamp });
      return apiError;
    }

    // Errores de red
    if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new APIError(
        'Error de conexión. Verifica tu conexión a internet.',
        0,
        'NETWORK_ERROR'
      );
      this.logError(networkError, { ...context, timestamp });
      return networkError;
    }

    // Errores genéricos
    const genericError = new APIError(
      error instanceof Error ? error.message : 'Error desconocido',
      500,
      'UNKNOWN_ERROR'
    );
    this.logError(genericError, { ...context, timestamp });
    return genericError;
  }

  // Manejar errores de autenticación
  handleAuthError(error: unknown): APIError {
    if (isErrorWithStatus(error) && error.status === 401) {
      return new APIError(
        'Sesión expirada. Por favor inicia sesión nuevamente.',
        401,
        'SESSION_EXPIRED'
      );
    }
    
    if (isErrorWithStatus(error) && error.status === 403) {
      return new APIError(
        'No tienes permisos para realizar esta acción.',
        403,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    return this.handleAPIError(error);
  }

  // Manejar errores de scraping
  handleScrapingError(error: unknown, url?: string): APIError {
    if (isErrorWithStatus(error) && error.status === 429) {
      return new APIError(
        'Demasiadas solicitudes. Por favor espera un momento.',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    if (
      isErrorWithStatus(error) && 
      error.status === 400 && 
      error.message?.includes('selector')
    ) {
      return new APIError(
        'Selectores CSS inválidos. Verifica la configuración.',
        400,
        'INVALID_SELECTORS'
      );
    }

    return new APIError(
      `Error en scraping: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      isErrorWithStatus(error) ? error.status : undefined,
      'SCRAPING_ERROR',
      { url }
    );
  }

  // Log de errores para debugging
  private logError(error: Error, context: ErrorContext) {
    const errorEntry = {
      error,
      context,
      timestamp: context.timestamp || new Date().toISOString()
    };

    // Mantener solo los últimos 100 errores
    this.errorHistory.push(errorEntry);
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }

    // En desarrollo, log a consola
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error [${error.name}]`);
      console.error('Message:', error.message);
      console.error('Context:', context);
      if (error instanceof APIError) {
        console.error('Status:', error.status);
        console.error('Code:', error.code);
        console.error('Details:', error.details);
      }
      console.groupEnd();
    }

    // En producción, enviar a servicio de monitoreo
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorEntry);
    }
  }

  // Enviar errores a servicio de monitoreo (ej: Sentry, LogRocket)
  private sendToMonitoring(errorEntry: {
    error: Error;
    context: ErrorContext;
    timestamp: string;
  }) {
    // Implementar integración con servicio de monitoreo
    // Por ahora solo log a consola
    console.error('Production Error:', errorEntry);
  }

  // Obtener historial de errores (para debugging)
  getErrorHistory(): Array<{
    error: Error;
    context: ErrorContext;
    timestamp: string;
  }> {
    return [...this.errorHistory];
  }

  // Limpiar historial de errores
  clearErrorHistory(): void {
    this.errorHistory = [];
  }
}

// Instancia global del manejador de errores
export const errorHandler = ErrorHandler.getInstance();

// Utilidades para mensajes de error comunes
export const ErrorMessages = {
  NETWORK: 'Error de conexión. Verifica tu conexión a internet.',
  SESSION_EXPIRED: 'Sesión expirada. Por favor inicia sesión nuevamente.',
  INSUFFICIENT_PERMISSIONS: 'No tienes permisos para realizar esta acción.',
  INVALID_SELECTORS: 'Selectores CSS inválidos. Verifica la configuración.',
  RATE_LIMIT_EXCEEDED: 'Demasiadas solicitudes. Por favor espera un momento.',
  SERVER_ERROR: 'Error del servidor. Por favor intenta más tarde.',
  UNKNOWN: 'Error desconocido. Por favor intenta nuevamente.',
};

// Hook personalizado para manejo de errores en componentes
export const useErrorHandler = () => {
  const handleError = (error: unknown, context?: ErrorContext) => {
    const processedError = errorHandler.handleAPIError(error, context);
    
    // Aquí podrías agregar lógica adicional como:
    // - Mostrar notificaciones al usuario
    // - Enviar errores a analytics
    // - Redirigir a páginas de error
    
    return processedError;
  };

  return { handleError };
};