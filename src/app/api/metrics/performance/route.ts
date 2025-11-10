import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitor';

/**
 * Endpoint para métricas de rendimiento
 * GET /api/metrics/performance - Retorna métricas de rendimiento en tiempo real
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metricName = searchParams.get('metric');
    const timeRange = searchParams.get('timeRange');
    
    let metrics;
    
    if (metricName) {
      // Obtener métricas específicas
      let timeRangeObj;
      if (timeRange) {
        const range = parseInt(timeRange);
        const now = Date.now();
        timeRangeObj = { start: now - range, end: now };
      }
      
      metrics = performanceMonitor.getMetrics(metricName, timeRangeObj);
    } else {
      // Obtener todas las métricas
      metrics = performanceMonitor.getAllMetrics();
    }
    
    // Generar reporte completo
    const report = performanceMonitor.generateReport();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      report,
      summary: {
        totalMetricTypes: Object.keys(metrics).length,
        totalMetrics: Object.values(metrics).reduce((sum, arr) => sum + arr.length, 0),
        reportGenerated: report.timestamp
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch performance metrics',
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * POST /api/metrics/performance - Registra una métrica personalizada
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, value, unit, type, tags } = body;
    
    if (!name || value === undefined || !type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, value, type'
      }, {
        status: 400
      });
    }
    
    // Registrar la métrica según el tipo
    switch (type) {
      case 'timing':
        if (typeof value !== 'number') {
          throw new Error('Timing metrics must be numeric');
        }
        performanceMonitor.recordMetric({
          name,
          value,
          unit: unit || 'ms',
          timestamp: Date.now(),
          type: 'timing',
          tags
        });
        break;
        
      case 'counter':
        if (typeof value !== 'number') {
          throw new Error('Counter metrics must be numeric');
        }
        performanceMonitor.incrementCounter(name, value, tags);
        break;
        
      case 'gauge':
        if (typeof value !== 'number') {
          throw new Error('Gauge metrics must be numeric');
        }
        performanceMonitor.recordGauge(name, value, unit || 'value', tags);
        break;
        
      case 'histogram':
        if (typeof value !== 'number') {
          throw new Error('Histogram metrics must be numeric');
        }
        performanceMonitor.recordHistogram(name, value, unit || 'value', tags);
        break;
        
      default:
        throw new Error(`Invalid metric type: ${type}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Metric recorded successfully',
      metric: {
        name,
        value,
        unit,
        type,
        tags,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record metric',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}

/**
 * DELETE /api/metrics/performance - Limpia métricas antiguas
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxAge = searchParams.get('maxAge');
    
    const age = maxAge ? parseInt(maxAge) : 3600000; // 1 hora por defecto
    
    performanceMonitor.cleanup(age);
    
    return NextResponse.json({
      success: true,
      message: `Metrics older than ${age}ms cleaned up successfully`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cleanup metrics',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}