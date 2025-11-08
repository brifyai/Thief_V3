import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// API endpoint para gestionar configuración de sitios
const SITES_CONFIG_PATH = path.join(process.cwd(), 'server/backend/src/config/site-configs.json');

export async function GET() {
  try {
    // Leer el archivo de configuración de sitios
    const configData = fs.readFileSync(SITES_CONFIG_PATH, 'utf8');
    const config = JSON.parse(configData);
    
    return NextResponse.json({
      success: true,
      sites: config.sites
    });
  } catch (error) {
    console.error('Error leyendo configuración de sitios:', error);
    return NextResponse.json(
      { error: 'Error al leer la configuración de sitios' },
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

    // Leer configuración actual
    const configData = fs.readFileSync(SITES_CONFIG_PATH, 'utf8');
    const config = JSON.parse(configData);

    // Actualizar sitios manteniendo la estructura
    config.sites = sites;

    // Escribir nueva configuración
    fs.writeFileSync(SITES_CONFIG_PATH, JSON.stringify(config, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Sitios actualizados exitosamente',
      sites: config.sites
    });
  } catch (error) {
    console.error('Error actualizando sitios:', error);
    return NextResponse.json(
      { error: 'Error al actualizar los sitios' },
      { status: 500 }
    );
  }
}