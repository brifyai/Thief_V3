/**
 * Sistema de Performance Monitoring
 * Monitorea métricas de rendimiento en tiempo real
 */

import { useState, useCallback, useEffect } from 'react';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge' | 'histogram';
  tags?: Record<string, string>;
}

export interface PerformanceReport {
  timestamp: string;
  metrics: PerformanceMetric[];
  summary: {
    totalMetrics: number;
    averageResponseTime: number;
    errorRate: number;
    memoryUsage: number;
    activeConnections: number;
  };
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private timers: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private maxMetricsPerKey: number = 1000;
  private reportInterval: number = 60000; // 1 minuto
  private reportCallback?: (report: PerformanceReport) => void;

  constructor(options?: {
    maxMetricsPerKey?: number;
    reportInterval?: number;
    reportCallback?: (report: PerformanceReport) => void;
  }) {
    if (options) {
      this.maxMetricsPerKey = options.maxMetricsPerKey || this.maxMetricsPerKey;
      this.reportInterval = options.reportInterval || this.reportInterval;
      this.reportCallback = options.reportCallback;
    }

    // Iniciar recolección automática de métricas del navegador
    this.startBrowserMetricsCollection();
    
    // Iniciar reportes periódicos
    if (this.reportCallback) {
      this.startPeriodicReporting();
    }
  }

  /**
   * Inicia un timer para medir duración
   */
  startTimer(name: string, tags?: Record<string, string>): void {
    this.timers.set(name, performance.now());
  }

  /**
   * Detiene un timer y registra la métrica
   */
  endTimer(name: string, tags?: Record<string, string>): number {
    const startTime = this.timers.get(name);
    if (startTime === undefined) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);
    
    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      type: 'timing',
      tags
    });

    return duration;
  }

  /**
   * Incrementa un contador
   */
  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
    
    this.recordMetric({
      name,
      value: current + value,
      unit: 'count',
      timestamp: Date.now(),
      type: 'counter',
      tags
    });
  }

  /**
   * Registra un valor gauge (instantáneo)
   */
  recordGauge(name: string, value: number, unit: string = 'value', tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      unit,
      timestamp: Date.now(),
      type: 'gauge',
      tags
    });
  }

  /**
   * Registra una métrica de histograma
   */
  recordHistogram(name: string, value: number, unit: string = 'value', tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      unit,
      timestamp: Date.now(),
      type: 'histogram',
      tags
    });
  }

  /**
   * Registra una métrica genérica
   */
  public recordMetric(metric: PerformanceMetric): void {
    const key = metric.name;
    const existing = this.metrics.get(key) || [];
    
    // Agregar nueva métrica
    existing.push(metric);
    
    // Mantener solo las métricas más recientes
    if (existing.length > this.maxMetricsPerKey) {
      existing.splice(0, existing.length - this.maxMetricsPerKey);
    }
    
    this.metrics.set(key, existing);
  }

  /**
   * Obtiene métricas para un nombre específico
   */
  getMetrics(name: string, timeRange?: { start: number; end: number }): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];
    
    if (!timeRange) {
      return metrics;
    }
    
    return metrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  /**
   * Obtiene todas las métricas
   */
  getAllMetrics(): Record<string, PerformanceMetric[]> {
    const result: Record<string, PerformanceMetric[]> = {};
    
    for (const [key, metrics] of this.metrics.entries()) {
      result[key] = metrics;
    }
    
    return result;
  }

  /**
   * Genera un reporte de rendimiento
   */
  generateReport(): PerformanceReport {
    const allMetrics = Array.from(this.metrics.values()).flat();
    const timingMetrics = allMetrics.filter(m => m.type === 'timing');
    const errorMetrics = allMetrics.filter(m => m.name.includes('error'));
    
    // Calcular estadísticas
    const averageResponseTime = timingMetrics.length > 0 
      ? timingMetrics.reduce((sum, m) => sum + m.value, 0) / timingMetrics.length 
      : 0;
    
    const errorRate = allMetrics.length > 0 
      ? (errorMetrics.length / allMetrics.length) * 100 
      : 0;
    
    // Obtener uso de memoria
    const memoryUsage = this.getMemoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      metrics: allMetrics.slice(-100), // Últimas 100 métricas
      summary: {
        totalMetrics: allMetrics.length,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        memoryUsage,
        activeConnections: this.counters.get('active_connections') || 0
      }
    };
  }

  /**
   * Limpia métricas antiguas
   */
  cleanup(maxAge: number = 3600000): void { // 1 hora por defecto
    const cutoffTime = Date.now() - maxAge;
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoffTime);
      this.metrics.set(key, filtered);
    }
  }

  /**
   * Inicia recolección de métricas del navegador
   */
  private startBrowserMetricsCollection(): void {
    if (typeof window === 'undefined') return;

    // Observer para Performance API
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordGauge('page_load_time', navEntry.loadEventEnd - navEntry.loadEventStart, 'ms');
              this.recordGauge('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart, 'ms');
            } else if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              this.recordHistogram('resource_load_time', resourceEntry.duration, 'ms', {
                resource_type: this.getResourceType(resourceEntry.name)
              });
            }
          });
        });

        observer.observe({ entryTypes: ['navigation', 'resource'] });
      } catch (error) {
        console.warn('PerformanceObserver not fully supported:', error);
      }
    }

    // Monitoreo de memoria
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordGauge('memory_used', memory.usedJSHeapSize, 'bytes');
        this.recordGauge('memory_total', memory.totalJSHeapSize, 'bytes');
        this.recordGauge('memory_limit', memory.jsHeapSizeLimit, 'bytes');
      }, 30000); // Cada 30 segundos
    }

    // Monitoreo de conexión
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.recordGauge('connection_effective_type', this.getEffectiveTypeValue(connection.effectiveType), 'value');
      
      if (connection.addEventListener) {
        connection.addEventListener('change', () => {
          this.recordGauge('connection_effective_type', this.getEffectiveTypeValue(connection.effectiveType), 'value');
        });
      }
    }
  }

  /**
   * Inicia reportes periódicos
   */
  private startPeriodicReporting(): void {
    if (!this.reportCallback) return;
    
    setInterval(() => {
      const report = this.generateReport();
      this.reportCallback?.(report);
    }, this.reportInterval);
  }

  /**
   * Obtiene uso de memoria actual
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
    }
    return 0;
  }

  /**
   * Determina el tipo de recurso
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * Convierte el tipo de conexión efectivo a valor numérico
   */
  private getEffectiveTypeValue(type: string): number {
    switch (type) {
      case 'slow-2g': return 1;
      case '2g': return 2;
      case '3g': return 3;
      case '4g': return 4;
      default: return 0;
    }
  }
}

// Instancia global del performance monitor
export const performanceMonitor = new PerformanceMonitor({
  maxMetricsPerKey: 1000,
  reportInterval: 60000
});

// Hook para usar el performance monitor en componentes React
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<Record<string, PerformanceMetric[]>>({});
  const [report, setReport] = useState<PerformanceReport | null>(null);

  const refreshMetrics = useCallback(() => {
    setMetrics(performanceMonitor.getAllMetrics());
    setReport(performanceMonitor.generateReport());
  }, []);

  const startTimer = useCallback((name: string, tags?: Record<string, string>) => {
    performanceMonitor.startTimer(name, tags);
  }, []);

  const endTimer = useCallback((name: string, tags?: Record<string, string>) => {
    return performanceMonitor.endTimer(name, tags);
  }, []);

  const incrementCounter = useCallback((name: string, value?: number, tags?: Record<string, string>) => {
    performanceMonitor.incrementCounter(name, value, tags);
  }, []);

  const recordGauge = useCallback((name: string, value: number, unit?: string, tags?: Record<string, string>) => {
    performanceMonitor.recordGauge(name, value, unit, tags);
  }, []);

  useEffect(() => {
    refreshMetrics();
    
    const interval = setInterval(refreshMetrics, 5000); // Actualizar cada 5 segundos
    
    return () => clearInterval(interval);
  }, [refreshMetrics]);

  return {
    metrics,
    report,
    refreshMetrics,
    startTimer,
    endTimer,
    incrementCounter,
    recordGauge
  };
}