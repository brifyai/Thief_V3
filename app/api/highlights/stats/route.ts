import { NextRequest, NextResponse } from 'next/server';

// Datos de prueba para fallback
const FALLBACK_HIGHLIGHTS_STATS = {
  totalHighlights: 89,
  activeHighlights: 67,
  pendingHighlights: 15,
  completedHighlights: 7,
  averageProcessingTime: 2.3,
  successRate: 94.5,
  lastUpdate: new Date().toISOString(),
  recentActivity: [
    {
      id: 1,
      title: "Política económica del nuevo gobierno",
      status: "completed",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      title: "Resultados elecciones locales",
      status: "processing",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      title: "Crisis energética en Europa",
      status: "pending",
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    }
  ]
};

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    console.log('📈 Obteniendo estadísticas de highlights...');
    
    const token = request.headers.get('authorization');

    // Intentar obtener datos del backend con timeout corto
    try {
      const response = await fetch(`${BACKEND_URL}/api/highlights/stats`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': token })
        },
        signal: AbortSignal.timeout(3000) // Timeout de 3 segundos
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Estadísticas obtenidas del backend');
        return NextResponse.json(data);
      } else {
        throw new Error(`Backend responded with ${response.status}`);
      }
    } catch (backendError) {
      console.log('❌ Error obteniendo estadísticas del backend:', backendError instanceof Error ? backendError.message : 'Unknown error');
      console.log('🔄 Usando estadísticas de prueba');
      
      // Retornar datos de prueba
      return NextResponse.json({
        success: true,
        stats: FALLBACK_HIGHLIGHTS_STATS,
        fallback: true
      });
    }

  } catch (error) {
    console.error('❌ Error general en highlights/stats:', error);
    
    // Siempre retornar datos de prueba en caso de error
    return NextResponse.json({
      success: true,
      stats: FALLBACK_HIGHLIGHTS_STATS,
      fallback: true,
      error: error instanceof Error ? error.message : 'Error interno'
    });
  }
}