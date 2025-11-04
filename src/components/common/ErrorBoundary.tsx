'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: this.generateErrorId(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Guardar información del error para debugging
    this.setState({
      error,
      errorInfo,
    });

    // Llamar al callback personalizado si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // En producción, enviar error a servicio de monitoreo
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return ErrorBoundary.generateErrorId();
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Aquí podrías integrar con servicios como Sentry, LogRocket, etc.
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorId: this.state.errorId,
      };

      // Ejemplo: enviar a endpoint de logging
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Silenciar error de logging para no causar bucle infinito
        console.warn('Failed to log error to service');
      });
    } catch (loggingError) {
      console.warn('Error logging failed:', loggingError);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: this.generateErrorId(),
    });
  };

  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI por defecto para errores
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl border-destructive/50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">
                ¡Ups! Algo salió mal
              </CardTitle>
              <CardDescription className="text-lg">
                Ha ocurrido un error inesperado en la aplicación
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Información del error */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Detalles del error:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID del error:</span>
                    <code className="bg-background px-2 py-1 rounded text-xs">
                      {this.state.errorId}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mensaje:</span>
                    <span className="text-destructive font-mono text-xs max-w-xs truncate">
                      {this.state.error?.message}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hora:</span>
                    <span className="text-xs">
                      {new Date().toLocaleString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stack trace (solo en desarrollo) */}
              {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                <details className="bg-muted/30 rounded-lg p-4">
                  <summary className="cursor-pointer font-semibold text-sm mb-2">
                    Stack Trace (Desarrollo)
                  </summary>
                  <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={this.handleReload} 
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recargar Página
                </Button>
                
                <Button 
                  onClick={this.handleGoHome} 
                  className="flex-1"
                  variant="outline"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Ir al Inicio
                </Button>
                
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    onClick={this.handleReset} 
                    variant="secondary"
                  >
                    Reintentar
                  </Button>
                )}
              </div>

              {/* Información de soporte */}
              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Si este problema persiste, contacta al soporte técnico
                </p>
                <p className="mt-1">
                  Menciona el ID del error: <code>{this.state.errorId}</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook para manejar errores en componentes funcionales
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: string) => {
    console.error('Error handled by useErrorHandler:', error);
    
    // En producción, enviar a servicio de monitoreo
    if (process.env.NODE_ENV === 'production') {
      const errorData = {
        message: error.message,
        stack: error.stack,
        errorInfo,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      }).catch(() => {
        console.warn('Failed to log error to service');
      });
    }
  };
};

// Componente de fallback simple
export const SimpleErrorFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Card className="w-96">
      <CardHeader className="text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <CardTitle>Error inesperado</CardTitle>
        <CardDescription>
          Ha ocurrido un error. Por favor, recarga la página.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => window.location.reload()} className="w-full">
          Recargar
        </Button>
      </CardContent>
    </Card>
  </div>
);