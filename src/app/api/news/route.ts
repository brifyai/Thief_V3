import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Obteniendo noticias desde Supabase...');
    
    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    // Calcular offset para paginación
    const offset = (page - 1) * limit;
    
    // Construir consulta
    let query = supabase
      .from('news')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Aplicar filtros si existen
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }
    
    // Aplicar paginación
    query = query.range(offset, offset + limit - 1);
    
    // Ejecutar consulta
    const { data: news, error, count } = await query;
    
    if (error) {
      console.error('❌ Error en consulta a Supabase:', error);
      return NextResponse.json(
        { error: 'Error al obtener noticias', details: error.message },
        { status: 500 }
      );
    }
    
    console.log(`✅ API: ${news?.length || 0} noticias encontradas`);
    
    // Calcular información de paginación
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return NextResponse.json({
      success: true,
      data: news || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count || 0,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    });
    
  } catch (error) {
    console.error('❌ Error general en API de noticias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 API: Creando nueva noticia...');
    
    const body = await request.json();
    const { title, content, url, source, category, summary } = body;
    
    // Validar datos requeridos
    if (!title || !content || !url) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: title, content, url' },
        { status: 400 }
      );
    }
    
    // Insertar nueva noticia
    const { data: news, error } = await supabase
      .from('news')
      .insert([{
        title,
        content,
        url,
        source: source || 'Manual',
        category: category || 'general',
        summary: summary || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error al crear noticia:', error);
      return NextResponse.json(
        { error: 'Error al crear noticia', details: error.message },
        { status: 500 }
      );
    }
    
    console.log(`✅ API: Noticia creada con ID: ${news.id}`);
    
    return NextResponse.json({
      success: true,
      data: news
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error general al crear noticia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}