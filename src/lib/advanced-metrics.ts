/**
 * Sistema de Métricas Avanzadas
 * 
 * Este módulo proporciona un sistema completo de monitoreo avanzado
 * con métricas de rendimiento, errores,用户体验 y KPIs ejecutivos.
 */

import { performance } from 'perf_hooks';

// Tipos de métricas
export interface MetricData {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold: {
    good: number;
    poor: number;
  };
  timestamp: number;
}

export interface UserExperienceMetric {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  timestamp: number;
}

export interface BusinessKPI {
  activeUsers: number;
  sessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  errorRate: number;
  pageViews: number;
  uniquePageViews: number;
  timestamp: number;
}

export interface SystemHealth {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  uptime: number;
  responseTime: number;
  timestamp: number;
}

class AdvancedMetricsCollector {
  private metrics: Map<string, MetricData[]> = new Map();
  private performanceMetrics: Map<string, PerformanceMetric[]> = new Map();
  private userMetrics: UserExperienceMetric[] = [];
  private businessKPIs: BusinessKPI[] = [];
  private systemHealth: SystemHealth[] = [];
  
  // Configuración de umbrales
  private thresholds = {
    performance: {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 },
      fcp: { good: 1800, poor: 3000 }
    },
    business: {
      errorRate: { good: 0.01, poor: 0.05 },
      bounceRate: { good: 0.4, poor: 0.7 },
      responseTime: { good: 200, poor: 1000 }
    },
    system: {
      cpu: { good: 70, poor: 90 },
      memory: { good: 80, poor: 95 },
      disk: { good: 80, poor: 95 }
    }
  };

  /**
   * Registra una métrica personalizada
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>, metadata?: Record<string, any>) {
    const metric: MetricData = {
      timestamp: Date.now(),
      value,
      tags,
      metadata
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);
    
    // Mantener solo las últimas 1000 métricas por nombre
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    // Verificar umbrales y generar alertas
    this.checkThresholds(name, value, tags);
  }

  /**
   * Registra métricas de rendimiento web
   */
  recordPerformanceMetric(name: string, value: number) {
    const threshold = this.thresholds.performance[name as keyof typeof this.thresholds.performance];
    if (!threshold) return;

    let rating: 'good' | 'needs-improvement' | 'poor';
    if (value <= threshold.good) {
      rating = 'good';
    } else if (value <= threshold.poor) {
      rating = 'needs-improvement';
    } else {
      rating = 'poor';
    }

    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      threshold,
      timestamp: Date.now()
    };

    if (!this.performanceMetrics.has(name)) {
      this.performanceMetrics.set(name, []);
    }

    this.performanceMetrics.get(name)!.push(metric);
    
    // Mantener solo las últimas 100 métricas de rendimiento
    const metrics = this.performanceMetrics.get(name)!;
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }

    // Alerta automática para métricas pobres
    if (rating === 'poor') {
      this.triggerAlert('performance', `Poor performance detected: ${name} = ${value}ms`, {
        metric: name,
        value,
        threshold: threshold.poor
      });
    }
  }

  /**
   * Registra métricas de experiencia de usuario
   */
  recordUserExperienceMetric(metric: UserExperienceMetric) {
    const metricWithTimestamp = {
      ...metric,
      timestamp: metric.timestamp || Date.now()
    };
    this.userMetrics.push(metricWithTimestamp);
    
    // Mantener solo las últimas 100 métricas
    if (this.userMetrics.length > 100) {
      this.userMetrics.splice(0, this.userMetrics.length - 100);
    }

    // Calcular Core Web Vitals score
    const vitalsScore = this.calculateCoreWebVitalsScore(metric);
    this.recordMetric('core_web_vitals_score', vitalsScore);
  }

  /**
   * Registra KPIs de negocio
   */
  recordBusinessKPI(kpi: BusinessKPI) {
    const kpiWithTimestamp = {
      ...kpi,
      timestamp: kpi.timestamp || Date.now()
    };
    this.businessKPIs.push(kpiWithTimestamp);
    
    // Mantener solo las últimas 50 KPIs
    if (this.businessKPIs.length > 50) {
      this.businessKPIs.splice(0, this.businessKPIs.length - 50);
    }

    // Verificar KPIs críticos
    if (kpi.errorRate > this.thresholds.business.errorRate.poor) {
      this.triggerAlert('business', `High error rate: ${(kpi.errorRate * 100).toFixed(2)}%`, {
        errorRate: kpi.errorRate,
        threshold: this.thresholds.business.errorRate.poor
      });
    }
  }

  /**
   * Registra métricas de salud del sistema
   */
  recordSystemHealth(health: SystemHealth) {
    const healthWithTimestamp = {
      ...health,
      timestamp: health.timestamp || Date.now()
    };
    this.systemHealth.push(healthWithTimestamp);
    
    // Mantener solo las últimas 100 métricas de salud
    if (this.systemHealth.length > 100) {
      this.systemHealth.splice(0, this.systemHealth.length - 100);
    }

    // Verificar recursos críticos
    if (health.cpu > this.thresholds.system.cpu.poor) {
      this.triggerAlert('system', `High CPU usage: ${health.cpu}%`, {
        cpu: health.cpu,
        threshold: this.thresholds.system.cpu.poor
      });
    }

    if (health.memory > this.thresholds.system.memory.poor) {
      this.triggerAlert('system', `High memory usage: ${health.memory}%`, {
        memory: health.memory,
        threshold: this.thresholds.system.memory.poor
      });
    }
  }

  /**
   * Calcula el score de Core Web Vitals
   */
  private calculateCoreWebVitalsScore(metric: UserExperienceMetric): number {
    let score = 0;
    let count = 0;

    // LCP scoring
    if (metric.lcp <= this.thresholds.performance.lcp.good) score += 100;
    else if (metric.lcp <= this.thresholds.performance.lcp.poor) score += 50;
    else score += 0;
    count++;

    // FID scoring
    if (metric.fid <= this.thresholds.performance.fid.good) score += 100;
    else if (metric.fid <= this.thresholds.performance.fid.poor) score += 50;
    else score += 0;
    count++;

    // CLS scoring
    if (metric.cls <= this.thresholds.performance.cls.good) score += 100;
    else if (metric.cls <= this.thresholds.performance.cls.poor) score += 50;
    else score += 0;
    count++;

    return Math.round(score / count);
  }

  /**
   * Verifica umbrales y genera alertas
   */
  private checkThresholds(name: string, value: number, tags?: Record<string, string>) {
    // Implementar lógica de umbrales personalizados
    const customThresholds = this.getCustomThresholds(name);
    if (customThresholds && value > customThresholds.critical) {
      this.triggerAlert('threshold', `Critical threshold exceeded: ${name} = ${value}`, {
        metric: name,
        value,
        threshold: customThresholds.critical,
        tags
      });
    }
  }

  /**
   * Obtiene umbrales personalizados para métricas
   */
  private getCustomThresholds(name: string): { warning: number; critical: number } | null {
    const thresholds: Record<string, { warning: number; critical: number }> = {
      'response_time': { warning: 500, critical: 2000 },
      'error_rate': { warning: 0.02, critical: 0.05 },
      'memory_usage': { warning: 80, critical: 95 },
      'cpu_usage': { warning: 70, critical: 90 }
    };

    return thresholds[name] || null;
  }

  /**
   * Dispara una alerta
   */
  private triggerAlert(type: string, message: string, data: any) {
    console.warn(`🚨 ALERT [${type}]: ${message}`, data);
    
    // Aquí se podría integrar con sistemas externos como:
    // - Slack, Discord, Teams
    // - Email notifications
    // - PagerDuty, OpsGenie
    // - Datadog, New Relic
    
    // Guardar alerta en el sistema
    this.recordMetric('alerts', 1, { type, severity: 'high' }, { message, data });
  }

  /**
   * Obtiene estadísticas de una métrica
   */
  getMetricStats(name: string, timeRange?: number): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;

    let filteredMetrics = metrics;
    if (timeRange) {
      const cutoff = Date.now() - timeRange;
      filteredMetrics = metrics.filter(m => m.timestamp > cutoff);
    }

    if (filteredMetrics.length === 0) return null;

    const values = filteredMetrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const min = values[0];
    const max = values[count - 1];
    const avg = values.reduce((sum, val) => sum + val, 0) / count;
    
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);
    const p95 = values[p95Index];
    const p99 = values[p99Index];

    return { count, min, max, avg, p95, p99 };
  }

  /**
   * Obtiene KPIs ejecutivos
   */
  getExecutiveKPIs(): {
    performance: number;
    reliability: number;
    userExperience: number;
    businessImpact: number;
    overall: number;
  } {
    const latestKPI = this.businessKPIs[this.businessKPIs.length - 1];
    const latestHealth = this.systemHealth[this.systemHealth.length - 1];
    const latestUserMetric = this.userMetrics[this.userMetrics.length - 1];

    // Performance score (basado en tiempo de respuesta y errores)
    const performanceScore = latestKPI ? Math.max(0, 100 - (latestKPI.errorRate * 1000)) : 100;
    
    // Reliability score (basado en uptime y errores)
    const reliabilityScore = latestHealth ? Math.max(0, 100 - latestHealth.responseTime / 10) : 100;
    
    // User Experience score (basado en Core Web Vitals)
    const uxScore = latestUserMetric ? this.calculateCoreWebVitalsScore(latestUserMetric) : 100;
    
    // Business Impact score (basado en conversión y retención)
    const businessScore = latestKPI ? Math.max(0, 100 - (latestKPI.bounceRate * 100)) : 100;
    
    // Overall score
    const overall = Math.round((performanceScore + reliabilityScore + uxScore + businessScore) / 4);

    return {
      performance: Math.round(performanceScore),
      reliability: Math.round(reliabilityScore),
      userExperience: Math.round(uxScore),
      businessImpact: Math.round(businessScore),
      overall
    };
  }

  /**
   * Exporta métricas para análisis externo
   */
  exportMetrics(timeRange?: number): {
    custom: Record<string, MetricData[]>;
    performance: Record<string, PerformanceMetric[]>;
    userExperience: UserExperienceMetric[];
    businessKPIs: BusinessKPI[];
    systemHealth: SystemHealth[];
  } {
    const cutoff = timeRange ? Date.now() - timeRange : 0;

    const filterByTime = <T extends { timestamp?: number }>(items: T[]): T[] =>
      timeRange ? items.filter(item => (item.timestamp || 0) > cutoff) : items;

    const custom: Record<string, MetricData[]> = {};
    this.metrics.forEach((metrics, name) => {
      custom[name] = filterByTime(metrics);
    });

    const performance: Record<string, PerformanceMetric[]> = {};
    this.performanceMetrics.forEach((metrics, name) => {
      performance[name] = filterByTime(metrics);
    });

    return {
      custom,
      performance,
      userExperience: filterByTime(this.userMetrics),
      businessKPIs: filterByTime(this.businessKPIs),
      systemHealth: filterByTime(this.systemHealth)
    };
  }

  /**
   * Limpia métricas antiguas
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000) { // 24 horas por defecto
    const cutoff = Date.now() - maxAge;

    this.metrics.forEach((metrics, name) => {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(name, filtered);
    });

    this.performanceMetrics.forEach((metrics, name) => {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.performanceMetrics.set(name, filtered);
    });

    this.userMetrics = this.userMetrics.filter(m => m.timestamp > cutoff);
    this.businessKPIs = this.businessKPIs.filter(m => m.timestamp > cutoff);
    this.systemHealth = this.systemHealth.filter(m => m.timestamp > cutoff);
  }
}

// Instancia global del recolector de métricas
export const metricsCollector = new AdvancedMetricsCollector();

// Funciones de conveniencia para registrar métricas
export const recordMetric = (name: string, value: number, tags?: Record<string, string>) =>
  metricsCollector.recordMetric(name, value, tags);

export const recordPerformanceMetric = (name: string, value: number) =>
  metricsCollector.recordPerformanceMetric(name, value);

export const recordUserExperienceMetric = (metric: UserExperienceMetric) =>
  metricsCollector.recordUserExperienceMetric(metric);

export const recordBusinessKPI = (kpi: BusinessKPI) =>
  metricsCollector.recordBusinessKPI(kpi);

export const recordSystemHealth = (health: SystemHealth) =>
  metricsCollector.recordSystemHealth(health);

export default metricsCollector;