/**
 * Sistema de Alertas Predictivas
 * 
 * Este módulo implementa un sistema inteligente de alertas que utiliza
 * análisis de tendencias y machine learning simple para predecir problemas
 * antes de que ocurran.
 */

import { metricsCollector } from './advanced-metrics';

// Tipos de alertas predictivas
export interface PredictiveAlert {
  id: string;
  type: 'performance' | 'capacity' | 'error' | 'business' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  prediction: {
    confidence: number; // 0-100
    timeToImpact: number; // minutos
    impact: 'minimal' | 'moderate' | 'significant' | 'severe';
  };
  metrics: {
    name: string;
    currentValue: number;
    predictedValue: number;
    threshold: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  recommendations: string[];
  timestamp: number;
  status: 'active' | 'acknowledged' | 'resolved';
}

export interface TrendAnalysis {
  metric: string;
  current: number;
  trend: 'up' | 'down' | 'stable';
  slope: number; // tasa de cambio
  confidence: number; // confianza en la predicción
  predictedValue: number; // valor predicho en timeHorizon
  timeHorizon: number; // minutos en el futuro
  threshold: number;
  willCrossThreshold: boolean;
  timeToThreshold?: number; // minutos hasta cruzar el umbral
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'threshold' | 'trend' | 'anomaly' | 'composite';
  enabled: boolean;
  conditions: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    threshold: number;
    timeWindow?: number; // minutos
    trend?: 'up' | 'down' | 'any';
    confidence?: number; // mínimo confianza para alertar
  }[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // minutos entre alertas del mismo tipo
  notifications: {
    email?: string[];
    slack?: string;
    webhook?: string;
  };
}

class PredictiveAlertSystem {
  private alerts: Map<string, PredictiveAlert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private historicalData: Map<string, number[]> = new Map();
  private lastAlertTimes: Map<string, number> = new Map();
  
  // Configuración
  private config = {
    analysisWindow: 60, // minutos de datos históricos
    predictionHorizon: 30, // minutos a predecir
    minDataPoints: 10, // mínimo puntos para análisis
    confidenceThreshold: 70, // confianza mínima para alertar
    maxHistoricalPoints: 1000,
    checkInterval: 5 * 60 * 1000 // 5 minutos
  };

  constructor() {
    this.initializeDefaultRules();
    this.startAnalysis();
  }

  /**
   * Inicializa reglas de alerta predeterminadas
   */
  private initializeDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'cpu_usage_prediction',
        name: 'Predicción de uso de CPU',
        type: 'trend',
        enabled: true,
        conditions: [
          {
            metric: 'cpu_usage',
            operator: '>',
            threshold: 80,
            trend: 'up',
            confidence: 75
          }
        ],
        severity: 'high',
        cooldown: 15,
        notifications: {}
      },
      {
        id: 'memory_leak_detection',
        name: 'Detección de fuga de memoria',
        type: 'trend',
        enabled: true,
        conditions: [
          {
            metric: 'memory_usage',
            operator: '>',
            threshold: 85,
            trend: 'up',
            confidence: 80
          }
        ],
        severity: 'critical',
        cooldown: 10,
        notifications: {}
      },
      {
        id: 'response_time_degradation',
        name: 'Degradación de tiempo de respuesta',
        type: 'trend',
        enabled: true,
        conditions: [
          {
            metric: 'response_time',
            operator: '>',
            threshold: 1000,
            trend: 'up',
            confidence: 70
          }
        ],
        severity: 'medium',
        cooldown: 20,
        notifications: {}
      },
      {
        id: 'error_rate_spike',
        name: 'Pico en tasa de errores',
        type: 'anomaly',
        enabled: true,
        conditions: [
          {
            metric: 'error_rate',
            operator: '>',
            threshold: 5,
            confidence: 85
          }
        ],
        severity: 'high',
        cooldown: 5,
        notifications: {}
      },
      {
        id: 'user_experience_decline',
        name: 'Declive en experiencia de usuario',
        type: 'composite',
        enabled: true,
        conditions: [
          {
            metric: 'core_web_vitals_score',
            operator: '<',
            threshold: 70,
            confidence: 75
          }
        ],
        severity: 'medium',
        cooldown: 30,
        notifications: {}
      }
    ];

    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }

  /**
   * Inicia el análisis periódico
   */
  private startAnalysis() {
    setInterval(() => {
      this.performAnalysis();
    }, this.config.checkInterval);

    // Análisis inicial
    setTimeout(() => this.performAnalysis(), 1000);
  }

  /**
   * Realiza el análisis predictivo completo
   */
  private async performAnalysis() {
    try {
      // Obtener métricas recientes
      const recentMetrics = metricsCollector.exportMetrics(this.config.analysisWindow * 60 * 1000);
      
      // Analizar tendencias para cada métrica
      for (const [metricName, dataPoints] of Object.entries(recentMetrics.custom)) {
        if (dataPoints.length >= this.config.minDataPoints) {
          const analysis = this.analyzeTrend(metricName, dataPoints);
          if (analysis) {
            await this.evaluateAlertRules(analysis);
          }
        }
      }

      // Limpiar alertas resueltas
      this.cleanupResolvedAlerts();
      
    } catch (error) {
      console.error('Error in predictive analysis:', error);
    }
  }

  /**
   * Analiza la tendencia de una métrica
   */
  private analyzeTrend(metricName: string, dataPoints: any[]): TrendAnalysis | null {
    if (dataPoints.length < this.config.minDataPoints) return null;

    // Extraer valores y timestamps
    const values = dataPoints.map(point => point.value);
    const timestamps = dataPoints.map(point => point.timestamp);
    
    // Actualizar datos históricos
    this.updateHistoricalData(metricName, values);

    // Calcular tendencia usando regresión lineal simple
    const regression = this.linearRegression(timestamps, values);
    const slope = regression.slope;
    const confidence = this.calculateConfidence(values, regression);

    // Determinar dirección de la tendencia
    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(slope) < 0.01) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    // Predecir valor futuro
    const futureTime = Date.now() + (this.config.predictionHorizon * 60 * 1000);
    const predictedValue = regression.intercept + (slope * futureTime);

    // Obtener umbral para la métrica
    const threshold = this.getThresholdForMetric(metricName);
    
    // Determinar si cruzará el umbral
    const willCrossThreshold = this.willCrossThreshold(
      values[values.length - 1],
      predictedValue,
      threshold,
      trend
    );

    let timeToThreshold: number | undefined;
    if (willCrossThreshold && slope !== 0) {
      timeToThreshold = this.calculateTimeToThreshold(
        values[values.length - 1],
        slope,
        threshold,
        trend
      );
    }

    return {
      metric: metricName,
      current: values[values.length - 1],
      trend,
      slope,
      confidence,
      predictedValue,
      timeHorizon: this.config.predictionHorizon,
      threshold,
      willCrossThreshold,
      timeToThreshold
    };
  }

  /**
   * Actualiza datos históricos para una métrica
   */
  private updateHistoricalData(metricName: string, newValues: number[]) {
    if (!this.historicalData.has(metricName)) {
      this.historicalData.set(metricName, []);
    }

    const historical = this.historicalData.get(metricName)!;
    historical.push(...newValues);

    // Mantener límite de datos históricos
    if (historical.length > this.config.maxHistoricalPoints) {
      historical.splice(0, historical.length - this.config.maxHistoricalPoints);
    }
  }

  /**
   * Calcula regresión lineal simple
   */
  private linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + (val * y[i]), 0);
    const sumXX = x.reduce((sum, val) => sum + (val * val), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Calcula la confianza de la predicción
   */
  private calculateConfidence(values: number[], regression: { slope: number; intercept: number }): number {
    // Calcular R² (coeficiente de determinación)
    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    
    let totalSumSquares = 0;
    let residualSumSquares = 0;

    for (let i = 0; i < n; i++) {
      const predicted = regression.intercept + (regression.slope * i);
      totalSumSquares += Math.pow(values[i] - mean, 2);
      residualSumSquares += Math.pow(values[i] - predicted, 2);
    }

    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    return Math.max(0, Math.min(100, rSquared * 100));
  }

  /**
   * Determina si una métrica cruzará un umbral
   */
  private willCrossThreshold(current: number, predicted: number, threshold: number, trend: 'up' | 'down' | 'stable'): boolean {
    if (trend === 'stable') return false;
    
    if (trend === 'up') {
      return current < threshold && predicted >= threshold;
    } else {
      return current > threshold && predicted <= threshold;
    }
  }

  /**
   * Calcula el tiempo hasta cruzar un umbral
   */
  private calculateTimeToThreshold(current: number, slope: number, threshold: number, trend: 'up' | 'down' | 'stable'): number {
    if (slope === 0 || trend === 'stable') return Infinity;
    
    let timeToThreshold: number;
    if (trend === 'up') {
      timeToThreshold = (threshold - current) / slope;
    } else {
      timeToThreshold = (current - threshold) / Math.abs(slope);
    }
    
    return Math.max(0, timeToThreshold / (1000 * 60)); // Convertir a minutos
  }

  /**
   * Obtiene el umbral para una métrica
   */
  private getThresholdForMetric(metricName: string): number {
    const thresholds: Record<string, number> = {
      'cpu_usage': 80,
      'memory_usage': 85,
      'response_time': 1000,
      'error_rate': 5,
      'core_web_vitals_score': 70,
      'disk_usage': 90,
      'network_latency': 500
    };

    return thresholds[metricName] || 100;
  }

  /**
   * Evalúa las reglas de alerta contra un análisis
   */
  private async evaluateAlertRules(analysis: TrendAnalysis) {
    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;

      // Verificar cooldown
      const lastAlert = this.lastAlertTimes.get(ruleId);
      if (lastAlert && (Date.now() - lastAlert) < (rule.cooldown * 60 * 1000)) {
        continue;
      }

      // Evaluar condiciones
      const shouldAlert = this.evaluateRuleConditions(rule, analysis);
      
      if (shouldAlert) {
        const alert = this.createAlert(rule, analysis);
        this.alerts.set(alert.id, alert);
        this.lastAlertTimes.set(ruleId, Date.now());
        
        // Enviar notificaciones
        await this.sendNotifications(alert);
        
        console.warn(`🚨 Predictive Alert: ${alert.title}`, alert);
      }
    }
  }

  /**
   * Evalúa las condiciones de una regla
   */
  private evaluateRuleConditions(rule: AlertRule, analysis: TrendAnalysis): boolean {
    return rule.conditions.some(condition => {
      // Verificar métrica
      if (condition.metric !== analysis.metric) return false;

      // Verificar tendencia
      if (condition.trend && condition.trend !== 'any' && condition.trend !== analysis.trend) {
        return false;
      }

      // Verificar confianza
      if (condition.confidence && analysis.confidence < condition.confidence) {
        return false;
      }

      // Verificar umbral actual o predicho
      const currentValue = analysis.current;
      const predictedValue = analysis.predictedValue;

      const meetsThreshold = this.evaluateThreshold(
        currentValue,
        condition.operator,
        condition.threshold
      ) || this.evaluateThreshold(
        predictedValue,
        condition.operator,
        condition.threshold
      );

      return meetsThreshold && analysis.willCrossThreshold;
    });
  }

  /**
   * Evalúa una condición de umbral
   */
  private evaluateThreshold(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '=': return Math.abs(value - threshold) < 0.01;
      default: return false;
    }
  }

  /**
   * Crea una alerta predictiva
   */
  private createAlert(rule: AlertRule, analysis: TrendAnalysis): PredictiveAlert {
    const alertId = `predictive_${rule.id}_${Date.now()}`;
    
    // Determinar impacto basado en la severidad y la métrica
    const impact = this.determineImpact(rule.severity, analysis);
    
    // Generar recomendaciones
    const recommendations = this.generateRecommendations(rule, analysis);

    return {
      id: alertId,
      type: this.getAlertType(rule.type),
      severity: rule.severity,
      title: rule.name,
      description: this.generateAlertDescription(rule, analysis),
      prediction: {
        confidence: analysis.confidence,
        timeToImpact: analysis.timeToThreshold || analysis.timeHorizon,
        impact
      },
      metrics: [{
        name: analysis.metric,
        currentValue: analysis.current,
        predictedValue: analysis.predictedValue,
        threshold: analysis.threshold,
        trend: this.convertTrend(analysis.trend)
      }],
      recommendations,
      timestamp: Date.now(),
      status: 'active'
    };
  }

  /**
   * Determina el tipo de alerta
   */
  private getAlertType(ruleType: string): PredictiveAlert['type'] {
    switch (ruleType) {
      case 'threshold':
      case 'trend':
        return 'performance';
      case 'anomaly':
        return 'error';
      case 'composite':
        return 'business';
      default:
        return 'performance';
    }
  }

  /**
   * Determina el impacto de la alerta
   */
  private determineImpact(severity: string, analysis: TrendAnalysis): PredictiveAlert['prediction']['impact'] {
    if (severity === 'critical') return 'severe';
    if (severity === 'high') return 'significant';
    if (severity === 'medium') return 'moderate';
    return 'minimal';
  }

  /**
   * Genera descripción de la alerta
   */
  private generateAlertDescription(rule: AlertRule, analysis: TrendAnalysis): string {
    const trendText = analysis.trend === 'up' ? 'aumentando' : 'disminuyendo';
    const timeToImpact = analysis.timeToThreshold || analysis.timeHorizon;
    
    return `La métrica ${analysis.metric} está ${trendText} y se predice que cruzará el umbral de ${analysis.threshold} en aproximadamente ${timeToImpact} minutos. Valor actual: ${analysis.current.toFixed(2)}, valor predicho: ${analysis.predictedValue.toFixed(2)}.`;
  }

  /**
   * Genera recomendaciones para la alerta
   */
  private generateRecommendations(rule: AlertRule, analysis: TrendAnalysis): string[] {
    const recommendations: string[] = [];
    
    switch (analysis.metric) {
      case 'cpu_usage':
        recommendations.push(
          'Monitorear procesos que consumen CPU',
          'Considerar escalar recursos horizontalmente',
          'Optimizar algoritmos intensivos en CPU'
        );
        break;
      case 'memory_usage':
        recommendations.push(
          'Investigar posibles fugas de memoria',
          'Revisar uso de caché y liberar memoria no utilizada',
          'Considerar aumentar memoria RAM disponible'
        );
        break;
      case 'response_time':
        recommendations.push(
          'Optimizar consultas a base de datos',
          'Implementar caché adicional',
          'Revisar cuellos de botella en la aplicación'
        );
        break;
      case 'error_rate':
        recommendations.push(
          'Revisar logs de errores recientes',
          'Implementar retries automáticos',
          'Verificar integraciones con servicios externos'
        );
        break;
      default:
        recommendations.push(
          'Monitorear la métrica de cerca',
          'Investigar causas raíz del cambio',
          'Preparar plan de contingencia'
        );
    }
    
    return recommendations;
  }

  /**
   * Envía notificaciones para una alerta
   */
  private async sendNotifications(alert: PredictiveAlert) {
    // Aquí se implementarían las notificaciones reales
    // Por ahora solo logging
    
    if (alert.severity === 'critical' || alert.severity === 'high') {
      console.error(`🚨 CRITICAL ALERT: ${alert.title}`);
      console.error(`Description: ${alert.description}`);
      console.error(`Time to impact: ${alert.prediction.timeToImpact} minutes`);
      console.error(`Recommendations:`, alert.recommendations);
    }
  }

  /**
   * Limpia alertas resueltas o expiradas
   */
  private cleanupResolvedAlerts() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [alertId, alert] of this.alerts.entries()) {
      if (now - alert.timestamp > maxAge) {
        this.alerts.delete(alertId);
      }
    }
  }

  /**
   * Obtiene alertas activas
   */
  getActiveAlerts(): PredictiveAlert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  /**
   * Reconoce una alerta
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
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
      alert.status = 'resolved';
      return true;
    }
    return false;
  }

  /**
   * Agrega una regla de alerta personalizada
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Elimina una regla de alerta
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Obtiene todas las reglas
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Habilita/deshabilita una regla
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Convierte el formato de tendencia
   */
  private convertTrend(trend: 'up' | 'down' | 'stable'): 'increasing' | 'decreasing' | 'stable' {
    switch (trend) {
      case 'up': return 'increasing';
      case 'down': return 'decreasing';
      case 'stable': return 'stable';
    }
  }
}

// Instancia global del sistema de alertas predictivas
export const predictiveAlertSystem = new PredictiveAlertSystem();

// Funciones de conveniencia
export const getActiveAlerts = () => predictiveAlertSystem.getActiveAlerts();
export const acknowledgeAlert = (id: string) => predictiveAlertSystem.acknowledgeAlert(id);
export const resolveAlert = (id: string) => predictiveAlertSystem.resolveAlert(id);

export default predictiveAlertSystem;