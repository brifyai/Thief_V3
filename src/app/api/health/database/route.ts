import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Health check para la base de datos Supabase
 * GET /api/health/database - Verifica la conexión y estado de la base de datos
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Obtener variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Crear cliente de Supabase con service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Realizar consultas de prueba
    const testPromises = [
      // Test 1: Verificar conexión básica
      supabase.from('users').select('count', { count: 'exact', head: true }),
      
      // Test 2: Verificar tabla de noticias
      supabase.from('news').select('count', { count: 'exact', head: true }),
      
      // Test 3: Verificar tabla de configuraciones de sitios
      supabase.from('site_configurations').select('count', { count: 'exact', head: true })
    ];
    
    const results = await Promise.allSettled(testPromises);
    
    // Analizar resultados
    const testResults = {
      usersConnection: results[0].status === 'fulfilled' && !results[0].value.error,
      newsConnection: results[1].status === 'fulfilled' && !results[1].value.error,
      sitesConnection: results[2].status === 'fulfilled' && !results[2].value.error
    };
    
    // Contar registros para estadísticas
    let stats = {};
    try {
      const [usersCount, newsCount, sitesCount] = await Promise.all([
        supabase.from('users').select('count', { count: 'exact' }),
        supabase.from('news').select('count', { count: 'exact' }),
        supabase.from('site_configurations').select('count', { count: 'exact' })
      ]);
      
      stats = {
        usersCount: usersCount.count || 0,
        newsCount: newsCount.count || 0,
        sitesCount: sitesCount.count || 0
      };
    } catch (statsError) {
      console.warn('Could not fetch database stats:', statsError);
      stats = { error: 'Stats unavailable' };
    }
    
    const responseTime = Date.now() - startTime;
    const allHealthy = Object.values(testResults).every(result => result);
    
    return NextResponse.json({
      healthy: allHealthy,
      timestamp: new Date().toISOString(),
      responseTime,
      connection: testResults,
      stats,
      details: {
        supabaseUrl: supabaseUrl.replace(/\/[^\/]+$/, '/***'), // Ocultar parte sensible
        testsPerformed: ['users', 'news', 'site_configurations'],
        allTestsPassed: allHealthy
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
      error: error instanceof Error ? error.message : 'Database connection failed',
      connection: {
        usersConnection: false,
        newsConnection: false,
        sitesConnection: false
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
 * HEAD /api/health/database - Para health checks rápidos de DB
 */
export async function HEAD(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new NextResponse(null, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    return new NextResponse(null, {
      status: error ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-DB-Health-Timestamp': new Date().toISOString()
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