import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vdmbvordfslrpnbkozig.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_Z2QYOuGA7OzT_EBTeqGRkg_xLRh1fXY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Obteniendo noticias desde Supabase...');
    
    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const source = searchParams.get('source') || '';
    const status = searchParams.get('status') || '';
    
    // Calcular offset para paginación
    const offset = (page - 1) * limit;
    
    console.log(`📊 Parámetros: page=${page}, limit=${limit}, search="${search}", category="${category}"`);
    
    // Construir consulta
    let query = supabase
      .from('news')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Aplicar filtros
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,summary.ilike.%${search}%`);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (source) {
      query = query.eq('source', source);
    }
    
    if (status) {
      query = query.eq('status', status);
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
    
    if (!news || news.length === 0) {
      console.log('📭 No se encontraron noticias');
      return NextResponse.json({
        news: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }
    
    console.log(`✅ Se encontraron ${news.length} noticias (total: ${count})`);
    
    // Formatear respuesta
    const formattedNews = news.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      summary: item.summary,
      url: item.url,
      source: item.source,
      category: item.category,
      author: item.author,
      published_at: item.published_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      status: item.status,
      image_url: item.image_url,
      tags: item.tags || [],
      ai_processed: item.ai_processed,
      humanized_content: item.humanized_content,
      processing_version: item.processing_version,
      sentiment_score: item.sentiment_score,
      read_time: item.read_time
    }));
    
    // Calcular información de paginación
    const totalPages = Math.ceil((count || 0) / limit);
    
    const response = {
      news: formattedNews,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
    
    console.log(`📤 Enviando respuesta con ${formattedNews.length} noticias`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error general en API /api/news:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 API: Creando nueva noticia...');
    
    const body = await request.json();
    const {
      title,
      content,
      summary,
      url,
      source,
      category,
      author,
      published_at,
      image_url,
      tags
    } = body;
    
    // Validar campos requeridos
    if (!title || !content || !url) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: title, content, url' },
        { status: 400 }
      );
    }
    
    // Insertar nueva noticia
    const { data: news, error } = await supabase
      .from('news')
      .insert({
        title,
        content,
        summary: summary || '',
        url,
        source: source || 'Manual',
        category: category || 'general',
        author: author || null,
        published_at: published_at || new Date().toISOString(),
        image_url: image_url || null,
        tags: tags || [],
        status: 'active',
        ai_processed: false,
        humanized_content: null,
        processing_version: 1,
        sentiment_score: null,
        read_time: Math.ceil(content.split(' ').length / 200) // estimación: 200 palabras por minuto
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error al crear noticia:', error);
      return NextResponse.json(
        { error: 'Error al crear noticia', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('✅ Noticia creada exitosamente:', news.id);
    
    return NextResponse.json({
      success: true,
      news
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error general en POST /api/news:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}