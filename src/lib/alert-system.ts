/**
 * Sistema de Alertas Automáticas
 * Monitorea métricas y genera alertas para problemas críticos
 */

import { useState, useCallback, useEffect } from 'react';
import { performanceMonitor, PerformanceReport } from './performance-monitor';
import { healthChecker, SystemHealth } from './health-check';

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: (data: any) => boolean;
  alertType: Alert['type'];
  severity: Alert['severity'];
  title: string;
  message: string;
  source: string;
  cooldown: number; // ms entre alertas del mismo tipo
}

export interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  acknowledged: number;
  byType: Record<Alert['type'], number>;
  bySeverity: Record<Alert['severity'], number>;
}

export class AlertSystem {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private lastAlertTimes: Map<string, number> = new Map();
  private maxAlerts: number = 1000;
  private alertCallback?: (alert: Alert) => void;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(options?: {
    maxAlerts?: number;
    alertCallback?: (alert: Alert) => void;
  }) {
    this.maxAlerts = options?.maxAlerts || this.maxAlerts;
    this.alertCallback = options?.alertCallback;
    
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  /**
   * Inicializa reglas de alerta por defecto
   */
  private initializeDefaultRules(): void {
    // Regla de alto uso de memoria
    this.addRule({
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      description: 'Alert when memory usage exceeds 85%',
      enabled: true,
      condition: (report: PerformanceReport) => {
        return report.summary.memoryUsage > 85;
      },
      alertType: 'warning',
      severity: 'high',
      title: 'High Memory Usage Detected',
      message: `Memory usage is at ${0}% which exceeds the 85% threshold`,
      source: 'performance-monitor',
      cooldown: 300000 // 5 minutos
    });

    // Regla de alta tasa de error
    this.addRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      description: 'Alert when error rate exceeds 10%',
      enabled: true,
      condition: (report: PerformanceReport) => {
        return report.summary.errorRate > 10;
      },
      alertType: 'error',
      severity: 'high',
      title: 'High Error Rate Detected',
      message: `Error rate is at ${0}% which exceeds the 10% threshold`,
      source: 'performance-monitor',
      cooldown: 300000 // 5 minutos
    });

    // Regla de tiempo de respuesta lento
    this.addRule({
      id: 'slow-response-time',
      name: 'Slow Response Time',
      description: 'Alert when average response time exceeds 2000ms',
      enabled: true,
      condition: (report: PerformanceReport) => {
        return report.summary.averageResponseTime > 2000;
      },
      alertType: 'warning',
      severity: 'medium',
      title: 'Slow Response Time Detected',
      message: `Average response time is ${0}ms which exceeds the 2000ms threshold`,
      source: 'performance-monitor',
      cooldown: 300000 // 5 minutos
    });

    // Regla de sistema no saludable
    this.addRule({
      id: 'system-unhealthy',
      name: 'System Unhealthy',
      description: 'Alert when system health is unhealthy',
      enabled: true,
      condition: (health: SystemHealth) => {
        return health.overall === 'unhealthy';
      },
      alertType: 'critical',
      severity: 'critical',
      title: 'System Health Critical',
      message: 'System health status is unhealthy. Immediate attention required.',
      source: 'health-checker',
      cooldown: 60000 // 1 minuto
    });

    // Regla de sistema degradado
    this.addRule({
      id: 'system-degraded',
      name: 'System Degraded',
      description: 'Alert when system health is degraded',
      enabled: true,
      condition: (health: SystemHealth) => {
        return health.overall === 'degraded';
      },
      alertType: 'warning',
      severity: 'medium',
      title: 'System Health Degraded',
      message: 'System health status is degraded. Some services may be affected.',
      source: 'health-checker',
      cooldown: 300000 // 5 minutos
    });

    // Regla de servicio específico no saludable
    this.addRule({
      id: 'service-unhealthy',
      name: 'Service Unhealthy',
      description: 'Alert when any service is unhealthy',
      enabled: true,
      condition: (health: SystemHealth) => {
        return Object.values(health.services).some(service => service.status === 'unhealthy');
      },
      alertType: 'error',
      severity: 'high',
      title: 'Service Unhealthy',
      message: 'One or more services are unhealthy. Check system health details.',
      source: 'health-checker',
      cooldown: 180000 // 3 minutos
    });
  }

  /**
   * Inicia el monitoreo continuo
   */
  private startMonitoring(): void {
    // Monitorear cada 30 segundos
    this.monitoringInterval = setInterval(async () => {
      await this.checkRules();
    }, 30000);
  }

  /**
   * Detiene el monitoreo
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Verifica todas las reglas activas
   */
  private async checkRules(): Promise<void> {
    const performanceReport = performanceMonitor.generateReport();
    const systemHealth = await healthChecker.checkAll();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Verificar cooldown
      const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0;
      if (Date.now() - lastAlertTime < rule.cooldown) continue;

      let shouldAlert = false;
      let data: any;

      // Evaluar condición según el tipo de datos
      if (rule.source === 'performance-monitor') {
        data = performanceReport;
        shouldAlert = rule.condition(data);
      } else if (rule.source === 'health-checker') {
        data = systemHealth;
        shouldAlert = rule.condition(data);
      }

      if (shouldAlert) {
        this.createAlert(rule, data);
      }
    }
  }

  /**
   * Crea una alerta basada en una regla
   */
  private createAlert(rule: AlertRule, data: any): void {
    const alert: Alert = {
      id: `${rule.id}-${Date.now()}`,
      type: rule.alertType,
      title: rule.title,
      message: this.formatMessage(rule.message, data),
      timestamp: Date.now(),
      source: rule.source,
      severity: rule.severity,
      acknowledged: false,
      resolved: false,
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        data
      }
    };

    this.addAlert(alert);
    this.lastAlertTimes.set(rule.id, Date.now());
  }

  /**
   * Formatea el mensaje de la alerta con datos dinámicos
   */
  private formatMessage(template: string, data: any): string {
    if (data?.summary?.memoryUsage !== undefined) {
      template = template.replace('${0}%', `${data.summary.memoryUsage}%`);
    }
    if (data?.summary?.errorRate !== undefined) {
      template = template.replace('${0}%', `${data.summary.errorRate}%`);
    }
    if (data?.summary?.averageResponseTime !== undefined) {
      template = template.replace('${0}ms', `${Math.round(data.summary.averageResponseTime)}ms`);
    }
    return template;
  }

  /**
   * Agrega una alerta
   */
  private addAlert(alert: Alert): void {
    this.alerts.set(alert.id, alert);
    
    // Mantener solo las alertas más recientes
    if (this.alerts.size > this.maxAlerts) {
      const sortedAlerts = Array.from(this.alerts.entries())
        .sort(([, a], [, b]) => b.timestamp - a.timestamp);
      
      const toRemove = sortedAlerts.slice(this.maxAlerts);
      toRemove.forEach(([id]) => this.alerts.delete(id));
    }

    // Ejecutar callback
    if (this.alertCallback) {
      this.alertCallback(alert);
    }
  }

  /**
   * Agrega una regla de alerta
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Elimina una regla de alerta
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Habilita/deshabilita una regla
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Crea una alerta manual
   */
  createManualAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): Alert {
    const fullAlert: Alert = {
      ...alert,
      id: `manual-${Date.now()}`,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false
    };

    this.addAlert(fullAlert);
    return fullAlert;
  }

  /**
   * Reconoce una alerta
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Resuelve una alerta
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Obtiene todas las alertas
   */
  getAlerts(options?: {
    type?: Alert['type'];
    severity?: Alert['severity'];
    acknowledged?: boolean;
    resolved?: boolean;
    limit?: number;
    offset?: number;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    // Aplicar filtros
    if (options?.type) {
      alerts = alerts.filter(a => a.type === options.type);
    }
    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }
    if (options?.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === options.acknowledged);
    }
    if (options?.resolved !== undefined) {
      alerts = alerts.filter(a => a.resolved === options.resolved);
    }

    // Aplicar paginación
    if (options?.offset) {
      alerts = alerts.slice(options.offset);
    }
    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Obtiene alertas activas (no resueltas)
   */
  getActiveAlerts(): Alert[] {
    return this.getAlerts({ resolved: false });
  }

  /**
   * Obtiene estadísticas de alertas
   */
  getStats(): AlertStats {
    const alerts = Array.from(this.alerts.values());
    
    const stats: AlertStats = {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      resolved: alerts.filter(a => a.resolved).length,
      acknowledged: alerts.filter(a => a.acknowledged).length,
      byType: {
        error: 0,
        warning: 0,
        info: 0,
        critical: 0
      },
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      }
    };

    alerts.forEach(alert => {
      stats.byType[alert.type]++;
      stats.bySeverity[alert.severity]++;
    });

    return stats;
  }

  /**
   * Obtiene todas las reglas
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Limpia alertas antiguas
   */
  cleanup(maxAge: number = 86400000): void { // 24 horas por defecto
    const cutoffTime = Date.now() - maxAge;
    
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoffTime && alert.resolved) {
        this.alerts.delete(id);
      }
    }
  }
}

// Instancia global del sistema de alertas
export const alertSystem = new AlertSystem({
  maxAlerts: 1000
});

// Hook para usar el sistema de alertas en componentes React
export function useAlertSystem() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);

  const refreshAlerts = useCallback(() => {
    setAlerts(alertSystem.getAlerts());
    setStats(alertSystem.getStats());
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    const success = alertSystem.acknowledgeAlert(alertId);
    if (success) {
      refreshAlerts();
    }
    return success;
  }, [refreshAlerts]);

  const resolveAlert = useCallback((alertId: string) => {
    const success = alertSystem.resolveAlert(alertId);
    if (success) {
      refreshAlerts();
    }
    return success;
  }, [refreshAlerts]);

  const createManualAlert = useCallback((alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>) => {
    const newAlert = alertSystem.createManualAlert(alert);
    refreshAlerts();
    return newAlert;
  }, [refreshAlerts]);

  useEffect(() => {
    refreshAlerts();
    
    const interval = setInterval(refreshAlerts, 10000); // Actualizar cada 10 segundos
    
    return () => clearInterval(interval);
  }, [refreshAlerts]);

  return {
    alerts,
    stats,
    refreshAlerts,
    acknowledgeAlert,
    resolveAlert,
    createManualAlert,
    activeAlerts: alerts.filter((a: Alert) => !a.resolved)
  };
}