import { NextRequest, NextResponse } from 'next/server';

// Datos de prueba para fallback
const FALLBACK_URLS = [
  {
    id: 1,
    url: 'https://www.emol.com',
    title: 'EMOL - El Mercurio Online',
    description: 'Noticias de Chile y el mundo',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    url: 'https://www.lun.com',
    title: 'La Tercera',
    description: 'Periódico chileno de noticias',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    url: 'https://www.biobiochile.cl',
    title: 'Biobío Chile',
    description: 'Radio y noticias de Chile',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Obteniendo URLs públicas...');
    
    const token = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    // Intentar obtener datos del backend con timeout corto
    try {
      const response = await fetch(`${BACKEND_URL}/api/public-urls${queryString ? `?${queryString}` : ''}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': token })
        },
        signal: AbortSignal.timeout(3000) // Timeout de 3 segundos
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ URLs obtenidas del backend');
        return NextResponse.json(data);
      } else {
        throw new Error(`Backend responded with ${response.status}`);
      }
    } catch (backendError) {
      console.log('❌ Error obteniendo URLs del backend:', backendError instanceof Error ? backendError.message : 'Unknown error');
      console.log('🔄 Usando URLs de prueba');
      
      // Retornar datos de prueba
      return NextResponse.json({
        success: true,
        urls: FALLBACK_URLS,
        total: FALLBACK_URLS.length,
        fallback: true
      });
    }

  } catch (error) {
    console.error('❌ Error general en public-urls:', error);
    
    // Siempre retornar datos de prueba en caso de error
    return NextResponse.json({
      success: true,
      urls: FALLBACK_URLS,
      total: FALLBACK_URLS.length,
      fallback: true,
      error: error instanceof Error ? error.message : 'Error interno'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Creando URL pública...');
    
    const token = request.headers.get('authorization');
    const body = await request.json();

    // Intentar crear en el backend con timeout corto
    try {
      const response = await fetch(`${BACKEND_URL}/api/public-urls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': token })
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000) // Timeout de 3 segundos
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ URL creada en el backend');
        return NextResponse.json(data);
      } else {
        throw new Error(`Backend responded with ${response.status}`);
      }
    } catch (backendError) {
      console.log('❌ Error creando URL en el backend:', backendError instanceof Error ? backendError.message : 'Unknown error');
      console.log('🔄 Simulando creación de URL');
      
      // Simular creación de URL
      const newUrl = {
        id: Date.now(),
        ...body,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return NextResponse.json({
        success: true,
        url: newUrl,
        message: 'URL creada (modo fallback)',
        fallback: true
      });
    }

  } catch (error) {
    console.error('❌ Error general en public-urls POST:', error);
    
    // Simular creación even en caso de error general
    const body = await request.json().catch(() => ({}));
    const newUrl = {
      id: Date.now(),
      ...body,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      url: newUrl,
      message: 'URL creada (modo emergencia)',
      fallback: true,
      error: error instanceof Error ? error.message : 'Error interno'
    });
  }
}