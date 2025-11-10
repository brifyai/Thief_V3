import { NextRequest, NextResponse } from 'next/server';
import { alertSystem } from '@/lib/alert-system';

/**
 * Endpoint para operaciones individuales de alertas
 * GET /api/alerts/[id] - Obtiene una alerta específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const alerts = alertSystem.getAlerts();
    const alert = alerts.find(a => a.id === id);

    if (!alert) {
      return NextResponse.json({
        success: false,
        error: 'Alert not found',
        timestamp: new Date().toISOString()
      }, {
        status: 404
      });
    }

    return NextResponse.json({
      success: true,
      alert,
      timestamp: new Date().toISOString()
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
      error: error instanceof Error ? error.message : 'Failed to fetch alert',
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
 * PUT /api/alerts/[id] - Actualiza una alerta específica (acknowledge/resolve)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action } = body;

    if (!action || !['acknowledge', 'resolve'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or missing action. Must be "acknowledge" or "resolve"'
      }, {
        status: 400
      });
    }

    let success = false;
    
    if (action === 'acknowledge') {
      success = alertSystem.acknowledgeAlert(id);
    } else if (action === 'resolve') {
      success = alertSystem.resolveAlert(id);
    }

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Alert not found or already processed',
        timestamp: new Date().toISOString()
      }, {
        status: 404
      });
    }

    // Obtener la alerta actualizada
    const alerts = alertSystem.getAlerts();
    const updatedAlert = alerts.find(a => a.id === id);

    return NextResponse.json({
      success: true,
      message: `Alert ${action}d successfully`,
      alert: updatedAlert,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update alert',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}

/**
 * DELETE /api/alerts/[id] - Elimina una alerta específica
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Verificar que la alerta existe
    const alerts = alertSystem.getAlerts();
    const alert = alerts.find(a => a.id === id);

    if (!alert) {
      return NextResponse.json({
        success: false,
        error: 'Alert not found',
        timestamp: new Date().toISOString()
      }, {
        status: 404
      });
    }

    // Marcar como resuelta primero (no se pueden eliminar directamente)
    const success = alertSystem.resolveAlert(id);

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to resolve alert',
        timestamp: new Date().toISOString()
      }, {
        status: 500
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Alert resolved successfully',
      alert,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve alert',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}