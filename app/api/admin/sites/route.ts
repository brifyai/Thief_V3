import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Crear cliente de Supabase solo si tenemos credenciales válidas
const supabase = supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('demo') && !supabaseServiceKey.includes('demo')
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Obteniendo configuración de sitios...');

    // Verificar si tenemos configuración de Supabase válida
    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('demo') || supabaseServiceKey.includes('demo')) {
      // Modo demo: devolver datos de ejemplo
      console.log('🎭 Modo demo detectado - devolviendo datos de ejemplo para sitios');

      const mockSites = [
        {
          id: 1,
          domain: 'ejemplo.com',
          name: 'Sitio de Ejemplo',
          description: 'Sitio web de ejemplo para demostración',
          category: 'news',
          country: 'CL',
          language: 'es',
          is_active: true,
          scraper_config: {
            selectors: {
              listing: {
                container: ['.article-list', '.news-container'],
                title: ['h2.article-title', '.news-title'],
                link: ['a.article-link', '.news-link'],
                description: ['.article-summary', '.news-excerpt']
              },
              article: {
                title: ['h1.article-title', '.post-title'],
                content: ['.article-content', '.post-content'],
                date: ['.article-date', '.post-date'],
                author: ['.article-author', '.post-author'],
                images: ['.article-image img', '.post-image img']
              }
            }
          },
          last_scraped: null,
          scraping_frequency: 3600,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          domain: 'test.cl',
          name: 'Sitio de Prueba',
          description: 'Sitio web de prueba para desarrollo',
          category: 'news',
          country: 'CL',
          language: 'es',
          is_active: false,
          scraper_config: {},
          last_scraped: null,
          scraping_frequency: 3600,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          domain: 'noticias.cl',
          name: 'Portal de Noticias',
          description: 'Portal de noticias chileno',
          category: 'news',
          country: 'CL',
          language: 'es',
          is_active: true,
          scraper_config: {},
          last_scraped: null,
          scraping_frequency: 3600,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      return NextResponse.json({
        success: true,
        sites: mockSites,
        count: mockSites.length
      });
    }

    // Verificar si tenemos cliente de Supabase válido
    if (!supabase) {
      console.log('🎭 Modo demo detectado - devolviendo datos de ejemplo para sitios');

      const mockSites = [
        {
          id: 1,
          domain: 'ejemplo.com',
          name: 'Sitio de Ejemplo',
          description: 'Sitio web de ejemplo para demostración',
          category: 'news',
          country: 'CL',
          language: 'es',
          is_active: true,
          scraper_config: {
            selectors: {
              listing: {
                container: ['.article-list', '.news-container'],
                title: ['h2.article-title', '.news-title'],
                link: ['a.article-link', '.news-link'],
                description: ['.article-summary', '.news-excerpt']
              },
              article: {
                title: ['h1.article-title', '.post-title'],
                content: ['.article-content', '.post-content'],
                date: ['.article-date', '.post-date'],
                author: ['.article-author', '.post-author'],
                images: ['.article-image img', '.post-image img']
              }
            }
          },
          last_scraped: null,
          scraping_frequency: 3600,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          domain: 'test.cl',
          name: 'Sitio de Prueba',
          description: 'Sitio web de prueba para desarrollo',
          category: 'news',
          country: 'CL',
          language: 'es',
          is_active: false,
          scraper_config: {},
          last_scraped: null,
          scraping_frequency: 3600,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          domain: 'noticias.cl',
          name: 'Portal de Noticias',
          description: 'Portal de noticias chileno',
          category: 'news',
          country: 'CL',
          language: 'es',
          is_active: true,
          scraper_config: {},
          last_scraped: null,
          scraping_frequency: 3600,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      return NextResponse.json({
        success: true,
        sites: mockSites,
        count: mockSites.length
      });
    }

    // Obtener todos los sitios de Supabase
    const { data: sites, error } = await supabase
      .from('site_configurations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error obteniendo sitios de Supabase:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener los sitios', details: error.message },
        { status: 500 }
      );
    }

    // Transformar los datos al formato que espera el frontend
    const transformedSites = (sites || []).map(site => ({
      id: site.id,
      domain: site.domain,
      name: site.name,
      description: site.description || '',
      category: site.category || 'news',
      country: site.country || 'CL',
      language: site.language || 'es',
      is_active: site.is_active !== false,
      scraper_config: site.scraper_config || {},
      last_scraped: site.last_scraped,
      scraping_frequency: site.scraping_frequency || 3600,
      created_at: site.created_at,
      updated_at: site.updated_at
    }));

    console.log(`✅ Se encontraron ${transformedSites.length} sitios`);

    return NextResponse.json({
      success: true,
      sites: transformedSites,
      count: transformedSites.length
    });
  } catch (error) {
    console.error('❌ Error en /api/admin/sites GET:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔧 API: Actualizando configuración de sitios...');

    const body = await request.json();
    const { sites } = body;

    if (!Array.isArray(sites)) {
      return NextResponse.json(
        { success: false, error: 'Se requiere un array de sitios' },
        { status: 400 }
      );
    }

    // Validar estructura básica de cada sitio
    for (const site of sites) {
      if (!site.domain || !site.name) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cada sitio debe tener domain y name'
          },
          { status: 400 }
        );
      }
    }

    // En modo demo, simular actualización exitosa
    if (!supabase) {
      console.log('🎭 Modo demo - simulando actualización de sitios');
      return NextResponse.json({
        success: true,
        message: 'Sitios actualizados exitosamente (modo demo)',
        sites: sites,
        count: sites.length
      });
    }

    // Upsert de todos los sitios en Supabase
    const { data, error } = await supabase
      .from('site_configurations')
      .upsert(
        sites.map(site => ({
          domain: site.domain,
          name: site.name,
          description: site.description || '',
          category: site.category || 'news',
          country: site.country || 'CL',
          language: site.language || 'es',
          is_active: site.is_active !== false,
          scraper_config: site.scraper_config || {},
          last_scraped: site.last_scraped || null,
          scraping_frequency: site.scraping_frequency || 3600,
          created_at: site.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })),
        {
          onConflict: 'domain'
        }
      )
      .select();

    if (error) {
      console.error('Error actualizando sitios en Supabase:', error);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar los sitios', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Se actualizaron ${sites.length} sitios`);

    return NextResponse.json({
      success: true,
      sites: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('❌ Error en /api/admin/sites PUT:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}