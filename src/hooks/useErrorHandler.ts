'use client';

import React, { useCallback } from 'react';
import toast from 'react-hot-toast';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  toastMessage?: string;
  logToConsole?: boolean;
  logToService?: boolean;
  fallbackMessage?: string;
}

export function useErrorHandler() {
  const handleError = useCallback((
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      toastMessage,
      logToConsole = true,
      logToService = true,
      fallbackMessage = 'Ha ocurrido un error inesperado'
    } = options;

    // Extraer información del error
    const errorInfo = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    // Log a consola
    if (logToConsole) {
      console.error('Error handled by useErrorHandler:', error, errorInfo);
    }

    // Log a servicio de monitoreo
    if (logToService && typeof window !== 'undefined') {
      // En producción, enviar a servicio de logging
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorInfo),
        }).catch(() => {
          // Silenciar error de logging para evitar bucles
          console.warn('Failed to log error to service');
        });
      }
    }

    // Mostrar toast
    if (showToast) {
      const message = toastMessage || errorInfo.message || fallbackMessage;
      toast.error(message, {
        duration: 5000,
        position: 'top-right',
      });
    }

    return errorInfo;
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  const createSafeAsyncFn = useCallback(<T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ) => {
    return async (): Promise<T | null> => {
      return handleAsyncError(asyncFn, options);
    };
  }, [handleAsyncError]);

  return {
    handleError,
    handleAsyncError,
    createSafeAsyncFn,
  };
}

// Hook para manejar errores de API específicamente
export function useApiErrorHandler() {
  const { handleError } = useErrorHandler();

  const handleApiError = useCallback((
    error: unknown,
    customMessage?: string
  ) => {
    // Extraer información específica de errores de API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiError = error as any;
    
    let message = customMessage;
    const shouldShowToast = true;

    if (apiError?.status === 401) {
      message = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      // Redirigir al login después de un tiempo
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else if (apiError?.status === 403) {
      message = 'No tienes permisos para realizar esta acción.';
    } else if (apiError?.status === 404) {
      message = 'El recurso solicitado no fue encontrado.';
    } else if (apiError?.status === 429) {
      message = 'Has excedido el límite de solicitudes. Por favor, intenta más tarde.';
    } else if (apiError?.status >= 500) {
      message = 'Error del servidor. Por favor, intenta más tarde.';
    } else if (apiError?.message) {
      message = apiError.message;
    }

    return handleError(error, {
      toastMessage: message,
      showToast: shouldShowToast,
    });
  }, [handleError]);

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    customMessage?: string
  ): Promise<T | null> => {
    try {
      return await apiCall();
    } catch (error) {
      handleApiError(error, customMessage);
      return null;
    }
  }, [handleApiError]);

  return {
    handleApiError,
    handleApiCall,
  };
}

// Hook para manejar errores de forma segura en componentes
export function useSafeComponent() {
  const { handleError } = useErrorHandler();

  const wrapComponent = useCallback((
    Component: React.ComponentType<Record<string, unknown>>,
    fallback?: React.ComponentType<Record<string, unknown>>
  ) => {
    return function SafeComponent(props: Record<string, unknown>) {
      try {
        return React.createElement(Component, props);
      } catch (error) {
        handleError(error, { showToast: false });
        if (fallback) {
          return React.createElement(fallback, props);
        }
        return null;
      }
    };
  }, [handleError]);

  return {
    wrapComponent,
  };
}