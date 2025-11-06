import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get('authorization');

    console.log('🔄 Proxy: Forwarding simple-test request to backend...');

    const response = await fetch(`${BACKEND_URL}/api/simple-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token })
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Error en scraping' },
        { status: response.status }
      );
    }

    console.log('✅ Proxy: Simple-test completed successfully');
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Proxy error in simple-test:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}