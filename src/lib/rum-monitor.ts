/**
 * Real User Monitoring (RUM) System
 * 
 * Sistema completo para monitorear la experiencia real de los usuarios
 * incluyendo métricas de rendimiento, errores e interacciones.
 */

import { metricsCollector, UserExperienceMetric } from './advanced-metrics';

// Tipos de eventos RUM
export interface RUMEvent {
  type: 'navigation' | 'interaction' | 'error' | 'performance' | 'custom';
  timestamp: number;
  sessionId: string;
  userId?: string;
  url: string;
  userAgent: string;
  data: any;
}

export interface NavigationTiming extends RUMEvent {
  type: 'navigation';
  data: {
    // Navigation Timing API
    domContentLoaded: number;
    loadComplete: number;
    firstByte: number;
    domInteractive: number;
    
    // Core Web Vitals
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    fcp: number; // First Contentful Paint
    ttfb: number; // Time to First Byte
    
    // Información adicional
    pageViews: number;
    referrer: string;
  };
}

export interface InteractionEvent extends RUMEvent {
  type: 'interaction';
  data: {
    elementType: string;
    elementId?: string;
    elementClass?: string;
    action: 'click' | 'focus' | 'scroll' | 'input';
    responseTime: number;
    target: string;
  };
}

export interface ErrorEvent extends RUMEvent {
  type: 'error';
  data: {
    message: string;
    stack?: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    errorType: 'javascript' | 'network' | 'resource';
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface PerformanceEvent extends RUMEvent {
  type: 'performance';
  data: {
    metricName: string;
    value: number;
    threshold?: number;
    resourceType?: string;
    resourceName?: string;
  };
}

class RUMMonitor {
  private sessionId: string;
  private userId?: string;
  private isInitialized = false;
  private events: RUMEvent[] = [];
  private performanceObserver?: PerformanceObserver;
  private mutationObserver?: MutationObserver;
  
  // Configuración
  private config = {
    maxEvents: 1000,
    sampleRate: 1.0, // 100% de muestreo
    enableCoreWebVitals: true,
    enableErrorTracking: true,
    enableInteractionTracking: true,
    enablePerformanceTracking: true,
    apiEndpoint: '/api/rum/events'
  };

  constructor() {
    this.sessionId = this.generateSessionId();
    this.init();
  }

  /**
   * Inicializa el monitor RUM
   */
  private async init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      // Generar ID de sesión
      this.sessionId = this.generateSessionId();
      
      // Obtener ID de usuario si está disponible
      this.userId = this.getUserId();
      
      // Configurar observers
      this.setupPerformanceObserver();
      this.setupErrorTracking();
      this.setupInteractionTracking();
      this.setupPageVisibilityTracking();
      
      // Marcar como inicializado
      this.isInitialized = true;
      
      // Enviar evento de inicio de sesión
      this.trackNavigationStart();
      
      console.log('🔍 RUM Monitor initialized');
    } catch (error) {
      console.error('Error initializing RUM Monitor:', error);
    }
  }

  /**
   * Genera un ID de sesión único
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtiene el ID del usuario actual
   */
  private getUserId(): string | undefined {
    try {
      // Intentar obtener desde localStorage, cookies o contexto global
      return localStorage.getItem('userId') || 
             (window as any).userId || 
             undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Configura el Performance Observer para Core Web Vitals
   */
  private setupPerformanceObserver() {
    if (!window.PerformanceObserver) return;

    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.handlePerformanceEntry(entry);
      }
    });

    // Observar diferentes tipos de entradas
    try {
      this.performanceObserver.observe({ entryTypes: ['navigation', 'paint', 'layout-shift', 'largest-contentful-paint', 'first-input'] });
    } catch (error) {
      console.warn('Some performance entry types not supported:', error);
    }
  }

  /**
   * Maneja las entradas de performance
   */
  private handlePerformanceEntry(entry: PerformanceEntry) {
    switch (entry.entryType) {
      case 'navigation':
        this.handleNavigationTiming(entry as PerformanceNavigationTiming);
        break;
      case 'paint':
        this.handlePaintTiming(entry as PerformancePaintTiming);
        break;
      case 'layout-shift':
        this.handleLayoutShift(entry as PerformanceEntry & { value: number; hadRecentInput: boolean });
        break;
      case 'largest-contentful-paint':
        this.handleLargestContentfulPaint(entry as PerformanceEntry & { renderTime?: number; loadTime?: number });
        break;
      case 'first-input':
        this.handleFirstInput(entry as PerformanceEntry & { processingStart: number; startTime: number });
        break;
    }
  }

  /**
   * Maneja métricas de navegación
   */
  private handleNavigationTiming(entry: PerformanceNavigationTiming) {
    const timing: NavigationTiming = {
      type: 'navigation',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      data: {
        domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
        loadComplete: entry.loadEventEnd - entry.loadEventStart,
        firstByte: entry.responseStart - entry.requestStart,
        domInteractive: entry.domInteractive - entry.fetchStart,
        lcp: 0, // Se actualiza con LCP observer
        fid: 0, // Se actualiza con FID observer
        cls: 0, // Se actualiza con CLS observer
        fcp: 0, // Se actualiza con paint timing
        ttfb: entry.responseStart - entry.requestStart,
        pageViews: 1,
        referrer: document.referrer
      }
    };

    this.addEvent(timing);
  }

  /**
   * Maneja métricas de paint
   */
  private handlePaintTiming(entry: PerformancePaintTiming) {
    if (entry.name === 'first-contentful-paint') {
      this.trackPerformanceMetric('fcp', entry.startTime);
    }
  }

  /**
   * Maneja Cumulative Layout Shift
   */
  private handleLayoutShift(entry: PerformanceEntry & { value: number; hadRecentInput: boolean }) {
    if (!entry.hadRecentInput) {
      this.trackPerformanceMetric('cls', entry.value);
    }
  }

  /**
   * Maneja Largest Contentful Paint
   */
  private handleLargestContentfulPaint(entry: PerformanceEntry & { renderTime?: number; loadTime?: number }) {
    const lcp = entry.renderTime || entry.loadTime || entry.startTime;
    this.trackPerformanceMetric('lcp', lcp);
  }

  /**
   * Maneja First Input Delay
   */
  private handleFirstInput(entry: PerformanceEntry & { processingStart: number; startTime: number }) {
    const fid = entry.processingStart - entry.startTime;
    this.trackPerformanceMetric('fid', fid);
  }

  /**
   * Configura el tracking de errores
   */
  private setupErrorTracking() {
    if (!this.config.enableErrorTracking) return;

    // Errores de JavaScript
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        errorType: 'javascript',
        severity: 'high'
      });
    });

    // Promesas rechazadas no manejadas
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled promise rejection: ${event.reason}`,
        errorType: 'javascript',
        severity: 'medium'
      });
    });

    // Errores de recursos
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement;
        this.trackError({
          message: `Failed to load resource: ${target.tagName}`,
          filename: (target as any).src || (target as any).href,
          errorType: 'resource',
          severity: 'low'
        });
      }
    }, true);
  }

  /**
   * Configura el tracking de interacciones
   */
  private setupInteractionTracking() {
    if (!this.config.enableInteractionTracking) return;

    // Tracking de clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const startTime = performance.now();
      
      // Medir tiempo de respuesta
      requestAnimationFrame(() => {
        const responseTime = performance.now() - startTime;
        
        this.trackInteraction({
          elementType: target.tagName.toLowerCase(),
          elementId: target.id,
          elementClass: target.className,
          action: 'click',
          responseTime,
          target: target.textContent?.substring(0, 50) || ''
        });
      });
    }, { passive: true });

    // Tracking de scroll
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackInteraction({
          elementType: 'document',
          action: 'scroll',
          responseTime: 0,
          target: `scroll-depth-${window.scrollY}`
        });
      }, 100);
    }, { passive: true });
  }

  /**
   * Configura tracking de visibilidad de página
   */
  private setupPageVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Usuario abandonó la página
        this.trackPageLeave();
      } else if (document.visibilityState === 'visible') {
        // Usuario regresó a la página
        this.trackPageFocus();
      }
    });

    // Track cuando el usuario cierra la pestaña
    window.addEventListener('beforeunload', () => {
      this.trackPageLeave();
      this.flushEvents(); // Enviar eventos pendientes
    });
  }

  /**
   * Inicia el tracking de navegación
   */
  private trackNavigationStart() {
    this.addEvent({
      type: 'navigation',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      data: {
        pageViews: 1,
        referrer: document.referrer
      }
    });
  }

  /**
   * Registra una métrica de performance
   */
  private trackPerformanceMetric(name: string, value: number) {
    // Registrar en el sistema de métricas avanzadas
    metricsCollector.recordPerformanceMetric(name, value);

    // También registrar como evento RUM
    this.addEvent({
      type: 'performance',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      data: {
        metricName: name,
        value,
        threshold: this.getThreshold(name)
      }
    });
  }

  /**
   * Registra un error
   */
  private trackError(errorData: Omit<ErrorEvent['data'], 'severity'> & { severity?: 'low' | 'medium' | 'high' | 'critical' }) {
    const error: ErrorEvent = {
      type: 'error',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      data: {
        ...errorData,
        severity: errorData.severity || 'medium'
      }
    };

    this.addEvent(error);

    // Registrar en métricas avanzadas
    metricsCollector.recordMetric('javascript_errors', 1, {
      errorType: errorData.errorType,
      severity: error.data.severity
    });
  }

  /**
   * Registra una interacción del usuario
   */
  private trackInteraction(interactionData: Omit<InteractionEvent['data'], 'responseTime'> & { responseTime: number }) {
    const interaction: InteractionEvent = {
      type: 'interaction',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      data: interactionData
    };

    this.addEvent(interaction);

    // Registrar métricas de interacción
    if (interactionData.responseTime > 0) {
      metricsCollector.recordMetric('interaction_response_time', interactionData.responseTime, {
        elementType: interactionData.elementType,
        action: interactionData.action
      });
    }
  }

  /**
   * Registra cuando el usuario abandona la página
   */
  private trackPageLeave() {
    const timeOnPage = performance.now();
    
    this.addEvent({
      type: 'custom',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      data: {
        eventName: 'page_leave',
        timeOnPage,
        scrollDepth: window.scrollY,
        viewportHeight: window.innerHeight
      }
    });

    metricsCollector.recordMetric('time_on_page', timeOnPage);
  }

  /**
   * Registra cuando el usuario regresa a la página
   */
  private trackPageFocus() {
    this.addEvent({
      type: 'custom',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      data: {
        eventName: 'page_focus'
      }
    });
  }

  /**
   * Obtiene el umbral para una métrica
   */
  private getThreshold(metricName: string): number | undefined {
    const thresholds: Record<string, number> = {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      fcp: 1800,
      ttfb: 800
    };

    return thresholds[metricName];
  }

  /**
   * Agrega un evento a la cola
   */
  private addEvent(event: RUMEvent) {
    // Aplicar sampling
    if (Math.random() > this.config.sampleRate) return;

    this.events.push(event);

    // Mantener límite de eventos
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    // Enviar eventos si hay suficientes
    if (this.events.length >= 10) {
      this.flushEvents();
    }
  }

  /**
   * Envía los eventos acumulados
   */
  private async flushEvents() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToSend,
          sessionId: this.sessionId,
          userId: this.userId,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to send RUM events:', error);
      // Re-agregar eventos si falla el envío
      this.events.unshift(...eventsToSend);
    }
  }

  /**
   * Obtiene estadísticas de la sesión actual
   */
  getSessionStats(): {
    sessionDuration: number;
    pageViews: number;
    errors: number;
    interactions: number;
    averageResponseTime: number;
  } {
    const now = Date.now();
    const sessionStart = this.events[0]?.timestamp || now;
    const sessionDuration = now - sessionStart;

    const pageViews = this.events.filter(e => e.type === 'navigation').length;
    const errors = this.events.filter(e => e.type === 'error').length;
    const interactions = this.events.filter(e => e.type === 'interaction').length;

    const responseTimes = this.events
      .filter(e => e.type === 'interaction')
      .map(e => e.data.responseTime)
      .filter(time => time > 0);

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      sessionDuration,
      pageViews,
      errors,
      interactions,
      averageResponseTime
    };
  }

  /**
   * Limpia recursos
   */
  destroy() {
    this.performanceObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.flushEvents();
  }
}

// Instancia global del monitor RUM
export const rumMonitor = typeof window !== 'undefined' ? new RUMMonitor() : null;

// Funciones de conveniencia
export const trackCustomEvent = (eventName: string, data: any) => {
  if (!rumMonitor) return;
  
  (rumMonitor as any).addEvent({
    type: 'custom',
    timestamp: Date.now(),
    sessionId: (rumMonitor as any).sessionId,
    userId: (rumMonitor as any).userId,
    url: window.location.href,
    userAgent: navigator.userAgent,
    data: {
      eventName,
      ...data
    }
  });
};

export const trackUserAction = (action: string, details?: any) => {
  trackCustomEvent('user_action', { action, ...details });
};

export const trackPageView = (page?: string) => {
  if (typeof window !== 'undefined') {
    trackCustomEvent('page_view', { page: page || window.location.pathname });
  }
};

export default rumMonitor;