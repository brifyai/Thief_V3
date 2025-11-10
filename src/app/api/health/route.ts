import { NextRequest, NextResponse } from 'next/server';
import { healthChecker } from '@/lib/health-check';

/**
 * Endpoint principal de health check
 * GET /api/health - Retorna el estado general del sistema
 */
export async function GET(request: NextRequest) {
  try {
    const health = await healthChecker.checkAll();
    
    // Determinar código HTTP basado en el estado general
    let statusCode = 200;
    if (health.overall === 'degraded') {
      statusCode = 200; // Still OK but with warnings
    } else if (health.overall === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    }

    return NextResponse.json(health, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return NextResponse.json({
      overall: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {}
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * HEAD /api/health - Para health checks rápidos
 */
export async function HEAD(request: NextRequest) {
  try {
    const health = await healthChecker.checkAll();
    
    let statusCode = 200;
    if (health.overall === 'degraded') {
      statusCode = 200;
    } else if (health.overall === 'unhealthy') {
      statusCode = 503;
    }

    return new NextResponse(null, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return new NextResponse(null, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}