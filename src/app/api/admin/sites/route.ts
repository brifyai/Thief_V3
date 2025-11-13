import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Crear cliente de Supabase solo si tenemos credenciales válidas
const supabase = supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('demo') && !supabaseServiceKey.includes('demo')
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET() {
  try {
    // Verificar si tenemos configuración de Supabase válida
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
        sites: mockSites
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
        sites: mockSites
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
        { error: 'Error al obtener los sitios', details: error.message },
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

    return NextResponse.json({
      success: true,
      sites: transformedSites
    });
  } catch (error) {
    console.error('Error en GET /api/admin/sites:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sites } = body;

    if (!Array.isArray(sites)) {
      return NextResponse.json(
        { error: 'Los sitios deben ser un array' },
        { status: 400 }
      );
    }

    // Validar estructura básica de cada sitio
    for (const site of sites) {
      if (!site.domain || !site.name) {
        return NextResponse.json(
          { error: 'Cada sitio debe tener domain y name' },
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
        sites: sites
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
        { error: 'Error al actualizar los sitios', details: error.message },
        { status: 500 }
      );
    }

    // Obtener los sitios actualizados para devolverlos
    const { data: updatedSites, error: fetchError } = await supabase
      .from('site_configurations')
      .select('*')
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('Error obteniendo sitios actualizados:', fetchError);
      return NextResponse.json(
        { error: 'Error al obtener los sitios actualizados', details: fetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sitios actualizados exitosamente',
      sites: updatedSites || []
    });
  } catch (error) {
    console.error('Error en PUT /api/admin/sites:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, name, description, category, country, language, scraper_config } = body;

    if (!domain || !name) {
      return NextResponse.json(
        { error: 'domain y name son requeridos' },
        { status: 400 }
      );
    }

    // En modo demo, simular creación exitosa
    if (!supabase) {
      console.log('🎭 Modo demo - simulando creación de sitio');
      const newSite = {
        id: Date.now(),
        domain,
        name,
        description: description || '',
        category: category || 'news',
        country: country || 'CL',
        language: language || 'es',
        is_active: true,
        scraper_config: scraper_config || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        message: 'Sitio creado exitosamente (modo demo)',
        site: newSite
      });
    }

    // Insertar nuevo sitio en Supabase
    const { data, error } = await supabase
      .from('site_configurations')
      .insert({
        domain,
        name,
        description: description || '',
        category: category || 'news',
        country: country || 'CL',
        language: language || 'es',
        is_active: true,
        scraper_config: scraper_config || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando sitio en Supabase:', error);
      return NextResponse.json(
        { error: 'Error al crear el sitio', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sitio creado exitosamente',
      site: data
    });
  } catch (error) {
    console.error('Error en POST /api/admin/sites:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json(
        { error: 'domain es requerido para eliminar' },
        { status: 400 }
      );
    }

    // En modo demo, simular eliminación exitosa
    if (!supabase) {
      console.log('🎭 Modo demo - simulando eliminación de sitio:', domain);
      return NextResponse.json({
        success: true,
        message: 'Sitio eliminado exitosamente (modo demo)'
      });
    }

    // Eliminar sitio de Supabase
    const { error } = await supabase
      .from('site_configurations')
      .delete()
      .eq('domain', domain);

    if (error) {
      console.error('Error eliminando sitio de Supabase:', error);
      return NextResponse.json(
        { error: 'Error al eliminar el sitio', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sitio eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error en DELETE /api/admin/sites:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}