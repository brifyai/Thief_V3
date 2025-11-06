import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/highlights/stats`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token })
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Error fetching stats' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Proxy error in highlights/stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}