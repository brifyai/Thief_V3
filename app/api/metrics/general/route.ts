import { NextRequest, NextResponse } from 'next/server';

// Datos de prueba para fallback
const FALLBACK_METRICS = {
  totalNews: 1247,
  totalHighlights: 89,
  totalUrls: 456,
  successRate: 87.5,
  lastUpdate: new Date().toISOString()
};

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Obteniendo métricas generales...');
    
    const token = request.headers.get('authorization');
    
    // Intentar obtener métricas del backend
    try {
      const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
      
      const response = await fetch(`${BACKEND_URL}/api/metrics/general`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': token })
        },
        signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Métricas obtenidas del backend');
        return NextResponse.json({
          success: true,
          data: data
        });
      } else {
        throw new Error(`Backend responded with ${response.status}`);
      }
    } catch (backendError) {
      console.log('❌ Error obteniendo métricas del backend:', backendError instanceof Error ? backendError.message : 'Unknown error');
      console.log('🔄 Usando métricas de prueba');
      
      // Retornar datos de prueba
      return NextResponse.json({
        success: true,
        data: FALLBACK_METRICS,
        fallback: true
      });
    }
  } catch (error) {
    console.error('❌ Error general en /api/metrics/general:', error);
    
    // Siempre retornar datos de prueba en caso de error
    return NextResponse.json({
      success: true,
      data: FALLBACK_METRICS,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}