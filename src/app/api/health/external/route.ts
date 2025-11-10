import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check para servicios externos
 * GET /api/health/external - Verifica la disponibilidad de APIs externas
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Lista de servicios externos a verificar
    const externalServices = [
      {
        name: 'Google Cloud Vision',
        url: 'https://vision.googleapis.com/$discovery/rest',
        timeout: 5000
      },
      {
        name: 'Google Cloud OCR',
        url: 'https://vision.googleapis.com/v1/images:annotate',
        timeout: 5000
      },
      {
        name: 'Tesseract OCR Service',
        url: process.env.TESSERACT_SERVICE_URL || 'http://localhost:8080',
        timeout: 3000
      }
    ];

    // Función para verificar un servicio externo
    const checkService = async (service: any) => {
      const serviceStartTime = Date.now();
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), service.timeout);
        
        const response = await fetch(service.url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Health-Check/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - serviceStartTime;
        
        return {
          name: service.name,
          status: response.ok ? 'healthy' : 'degraded',
          responseTime,
          statusCode: response.status,
          available: response.ok
        };
      } catch (error) {
        const responseTime = Date.now() - serviceStartTime;
        
        return {
          name: service.name,
          status: 'unhealthy',
          responseTime,
          error: error instanceof Error ? error.message : 'Connection failed',
          available: false
        };
      }
    };

    // Verificar todos los servicios en paralelo
    const servicePromises = externalServices.map(checkService);
    const serviceResults = await Promise.allSettled(servicePromises);
    
    // Extraer resultados y analizar estado general
    const services = serviceResults.map(result => 
      result.status === 'fulfilled' ? result.value : {
        name: 'Unknown Service',
        status: 'unhealthy',
        responseTime: 0,
        error: 'Service check failed',
        available: false
      }
    );

    // Calcular estado general
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const totalServices = services.length;
    const overallHealthy = healthyServices === totalServices;
    const degraded = healthyServices > 0 && healthyServices < totalServices;
    
    const overallStatus = overallHealthy ? 'healthy' : (degraded ? 'degraded' : 'unhealthy');
    
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      healthy: overallHealthy,
      timestamp: new Date().toISOString(),
      responseTime,
      overallStatus,
      services,
      summary: {
        totalServices,
        healthyServices,
        unhealthyServices: totalServices - healthyServices,
        availabilityPercentage: Math.round((healthyServices / totalServices) * 100)
      },
      details: {
        checksPerformed: externalServices.map(s => s.name),
        allServicesAvailable: overallHealthy,
        partialAvailability: degraded
      }
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
      healthy: false,
      timestamp: new Date().toISOString(),
      responseTime,
      error: error instanceof Error ? error.message : 'External services check failed',
      services: [],
      summary: {
        totalServices: 0,
        healthyServices: 0,
        unhealthyServices: 0,
        availabilityPercentage: 0
      },
      details: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString()
      }
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * HEAD /api/health/external - Para health checks rápidos de servicios externos
 */
export async function HEAD(request: NextRequest) {
  try {
    // Verificar solo un servicio crítico para HEAD requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://vision.googleapis.com/$discovery/rest', {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return new NextResponse(null, {
      status: response.ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-External-Health-Timestamp': new Date().toISOString(),
        'X-External-Service-Status': response.ok ? 'healthy' : 'degraded'
      }
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-External-Health-Timestamp': new Date().toISOString(),
        'X-External-Service-Status': 'unhealthy'
      }
    });
  }
}