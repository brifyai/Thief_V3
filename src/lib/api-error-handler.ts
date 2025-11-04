// Manejador centralizado de errores de API
export class APIError extends Error {
  constructor(
    public status: number,
    public endpoint: string,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown, endpoint: string): APIError {
  if (error instanceof APIError) {
    return error;
  }

  if (error instanceof Error) {
    // Intentar extraer el status del mensaje de error
    const statusMatch = error.message.match(/status: (\d+)/);
    const status = statusMatch ? parseInt(statusMatch[1]) : 500;
    
    return new APIError(status, endpoint, error.message);
  }

  return new APIError(500, endpoint, 'Error desconocido');
}

export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export function shouldRetry(error: APIError): boolean {
  // Reintentar en errores de servidor (5xx) y algunos errores de cliente
  return error.status >= 500 || error.status === 408 || error.status === 429;
}

export function getErrorMessage(error: APIError): string {
  switch (error.status) {
    case 400:
      return 'Solicitud inválida';
    case 401:
      return 'No autenticado. Por favor, inicia sesión nuevamente';
    case 403:
      return 'No tienes permiso para acceder a este recurso';
    case 404:
      return `Recurso no encontrado: ${error.endpoint}`;
    case 408:
      return 'Tiempo de espera agotado. Intenta nuevamente';
    case 429:
      return 'Demasiadas solicitudes. Intenta más tarde';
    case 500:
      return 'Error del servidor. Intenta más tarde';
    case 502:
      return 'Puerta de enlace no disponible';
    case 503:
      return 'Servicio no disponible';
    default:
      return `Error ${error.status}: ${error.message}`;
  }
}