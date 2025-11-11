import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
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