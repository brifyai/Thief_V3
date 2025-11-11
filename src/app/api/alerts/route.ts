import { NextRequest, NextResponse } from 'next/server';
import { alertSystem } from '@/lib/alert-system';

/**
 * Endpoint para gestión de alertas
 * GET /api/alerts - Obtiene todas las alertas o alertas filtradas
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as any;
    const severity = searchParams.get('severity') as any;
    const acknowledged = searchParams.get('acknowledged');
    const resolved = searchParams.get('resolved');
    const active = searchParams.get('active');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    let options: any = {};

    // Aplicar filtros
    if (type) options.type = type;
    if (severity) options.severity = severity;
    if (acknowledged !== null) options.acknowledged = acknowledged === 'true';
    if (resolved !== null) options.resolved = resolved === 'true';
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);

    let alerts;
    
    if (active === 'true') {
      alerts = alertSystem.getActiveAlerts();
    } else {
      alerts = alertSystem.getAlerts(options);
    }

    const stats = alertSystem.getStats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      alerts,
      stats,
      pagination: {
        total: alerts.length,
        limit: options.limit || alerts.length,
        offset: options.offset || 0
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
      error: error instanceof Error ? error.message : 'Failed to fetch alerts',
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
 * POST /api/alerts - Crea una alerta manual
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, source, severity, metadata } = body;

    if (!type || !title || !message || !source || !severity) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: type, title, message, source, severity'
      }, {
        status: 400
      });
    }

    const alert = alertSystem.createManualAlert({
      type,
      title,
      message,
      source,
      severity,
      metadata
    });

    return NextResponse.json({
      success: true,
      message: 'Alert created successfully',
      alert,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create alert',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}

/**
 * PUT /api/alerts - Actualiza múltiples alertas (acknowledge/resolve)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertIds, action } = body;

    if (!alertIds || !Array.isArray(alertIds) || !action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: alertIds (array), action'
      }, {
        status: 400
      });
    }

    if (!['acknowledge', 'resolve'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "acknowledge" or "resolve"'
      }, {
        status: 400
      });
    }

    const results = alertIds.map((alertId: string) => {
      if (action === 'acknowledge') {
        return alertSystem.acknowledgeAlert(alertId);
      } else {
        return alertSystem.resolveAlert(alertId);
      }
    });

    const successCount = results.filter(r => r).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      message: `${action}d ${successCount} alerts successfully`,
      results: {
        total: alertIds.length,
        success: successCount,
        failed: failureCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update alerts',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}

/**
 * DELETE /api/alerts - Limpia alertas antiguas
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxAge = searchParams.get('maxAge');

    const age = maxAge ? parseInt(maxAge) : 86400000; // 24 horas por defecto

    alertSystem.cleanup(age);

    return NextResponse.json({
      success: true,
      message: `Alerts older than ${age}ms cleaned up successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cleanup alerts',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}