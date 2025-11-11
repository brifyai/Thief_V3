/**
 * Sistema de Health Check para monitoreo de servicios
 * Proporciona verificación de salud de componentes críticos
 */

import { useState, useCallback, useEffect } from 'react';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: number;
  details?: Record<string, any>;
  error?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: Record<string, HealthCheckResult>;
  uptime: number;
  version: string;
}

export class HealthChecker {
  private startTime: number = Date.now();
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();

  constructor(private version: string = '1.0.0') {
    this.registerDefaultChecks();
  }

  /**
   * Registra un health check personalizado
   */
  register(name: string, checkFn: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, checkFn);
  }

  /**
   * Elimina un health check
   */
  unregister(name: string): void {
    this.checks.delete(name);
  }

  /**
   * Ejecuta todos los health checks registrados
   */
  async checkAll(): Promise<SystemHealth> {
    const services: Record<string, HealthCheckResult> = {};
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
      try {
        const result = await checkFn();
        services[name] = result;
      } catch (error) {
        services[name] = {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    await Promise.allSettled(checkPromises);

    const overall = this.calculateOverallStatus(services);
    const uptime = Date.now() - this.startTime;

    return {
      overall,
      timestamp: new Date().toISOString(),
      services,
      uptime,
      version: this.version
    };
  }

  /**
   * Ejecuta un health check específico
   */
  async checkService(name: string): Promise<HealthCheckResult | null> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      return null;
    }

    try {
      return await checkFn();
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Registra los health checks por defecto
   */
  private registerDefaultChecks(): void {
    // Health check de la API
    this.register('api', async () => {
      const startTime = Date.now();
      try {
        const response = await fetch('/api/health/ping', {
          method: 'GET',
          cache: 'no-cache'
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            responseTime,
            details: {
              status: response.status,
              ok: response.ok
            }
          };
        } else {
          return {
            status: 'degraded',
            timestamp: new Date().toISOString(),
            responseTime,
            details: {
              status: response.status,
              statusText: response.statusText
            },
            error: `HTTP ${response.status}`
          };
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Health check de base de datos (Supabase)
    this.register('database', async () => {
      const startTime = Date.now();
      try {
        const response = await fetch('/api/health/database', {
          method: 'GET',
          cache: 'no-cache'
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json();
          return {
            status: data.healthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            responseTime,
            details: data
          };
        } else {
          return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            responseTime,
            error: `Database check failed: ${response.status}`
          };
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          responseTime,
          error: error instanceof Error ? error.message : 'Database connection failed'
        };
      }
    });

    // Health check de servicios externos (ej. Google Cloud)
    this.register('external-services', async () => {
      const startTime = Date.now();
      try {
        const response = await fetch('/api/health/external', {
          method: 'GET',
          cache: 'no-cache'
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json();
          return {
            status: data.healthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            responseTime,
            details: data
          };
        } else {
          return {
            status: 'degraded',
            timestamp: new Date().toISOString(),
            responseTime,
            error: `External services check failed: ${response.status}`
          };
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          responseTime,
          error: error instanceof Error ? error.message : 'External services unavailable'
        };
      }
    });

    // Health check de memoria
    this.register('memory', async () => {
      const startTime = Date.now();
      
      try {
        // Type assertion para performance.memory
        const perf = performance as any;
        if (typeof performance !== 'undefined' && perf.memory) {
          const memory = perf.memory;
          const usedMemory = memory.usedJSHeapSize;
          const totalMemory = memory.totalJSHeapSize;
          const memoryUsage = (usedMemory / totalMemory) * 100;
          
          const responseTime = Date.now() - startTime;
          
          let status: 'healthy' | 'degraded' | 'unhealthy';
          if (memoryUsage < 70) {
            status = 'healthy';
          } else if (memoryUsage < 85) {
            status = 'degraded';
          } else {
            status = 'unhealthy';
          }
          
          return {
            status,
            timestamp: new Date().toISOString(),
            responseTime,
            details: {
              usedMemory: Math.round(usedMemory / 1024 / 1024), // MB
              totalMemory: Math.round(totalMemory / 1024 / 1024), // MB
              memoryUsage: Math.round(memoryUsage)
            }
          };
        } else {
          // Fallback para navegadores que no soportan performance.memory
          const responseTime = Date.now() - startTime;
          return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            responseTime,
            details: {
              message: 'Memory monitoring not available in this browser'
            }
          };
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          responseTime,
          error: error instanceof Error ? error.message : 'Memory check failed'
        };
      }
    });
  }

  /**
   * Calcula el estado general del sistema
   */
  private calculateOverallStatus(services: Record<string, HealthCheckResult>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services).map(s => s.status);
    
    if (statuses.some(s => s === 'unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.some(s => s === 'degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}

// Instancia global del health checker
export const healthChecker = new HealthChecker();

// Hook para usar el health checker en componentes React
export function useHealthCheck() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await healthChecker.checkAll();
      setHealth(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkService = useCallback(async (name: string) => {
    try {
      return await healthChecker.checkService(name);
    } catch (err) {
      return {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        responseTime: 0,
        error: err instanceof Error ? err.message : 'Service check failed'
      };
    }
  }, []);

  useEffect(() => {
    // Health check inicial
    checkHealth();
    
    // Health checks periódicos
    const interval = setInterval(checkHealth, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    health,
    loading,
    error,
    checkHealth,
    checkService
  };
}