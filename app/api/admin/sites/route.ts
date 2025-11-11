import { NextRequest, NextResponse } from 'next/server';
import { siteConfigService } from '@/services/site-config.service';
import { getAuthHeaders } from '@/lib/api-secure';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Obteniendo configuración de sitios...');
    
    const headers = getAuthHeaders();
    console.log('📤 Headers de autenticación configurados');

    // Obtener todos los sitios desde Supabase
    const sites = await siteConfigService.getAll();
    console.log(`✅ Se encontraron ${sites.length} sitios`);

    return NextResponse.json({
      success: true,
      sites,
      count: sites.length
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
      if (!site.id || !site.name || !site.url) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cada sitio debe tener id, name y url' 
          },
          { status: 400 }
        );
      }
    }

    // Actualizar sitios en Supabase
    // Para actualizar múltiples sitios, necesitamos actualizarlos uno por uno
    // ya que el servicio solo tiene método update para un sitio a la vez
    const updatedSites = [];
    for (const site of sites) {
      const updated = await siteConfigService.update(site.domain, {
        name: site.name,
        titleSelector: site.titleSelector,
        contentSelector: site.contentSelector,
        dateSelector: site.dateSelector,
        authorSelector: site.authorSelector,
        imageSelector: site.imageSelector,
        listingSelectors: site.listingSelectors
      });
      updatedSites.push(updated);
    }
    console.log(`✅ Se actualizaron ${updatedSites.length} sitios`);

    return NextResponse.json({
      success: true,
      sites: updatedSites,
      count: updatedSites.length
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