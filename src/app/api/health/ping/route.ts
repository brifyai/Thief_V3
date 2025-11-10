import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint simple de ping para health checks
 * GET /api/health/ping - Respuesta rápida para verificar que la API está viva
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Simular una operación simple
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      responseTime,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * HEAD /api/health/ping - Para health checks más rápidos
 */
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Ping-Timestamp': new Date().toISOString()
    }
  });
}