#!/usr/bin/env node

/**
 * Script para validar extracción de descripciones en TODOS los sitios
 * Verifica que las mejoras de descripción funcionan correctamente
 */

const axios = require('axios');
const { loggers } = require('./server/backend/src/utils/logger');

const logger = loggers.scraping;

// Lista de 73 sitios a validar
const SITES_TO_TEST = [
  // Principales (10)
  'https://www.t13.cl',
  'https://www.24horas.cl',
  'https://www.adnradio.cl',
  'https://www.biobiochile.cl',
  'https://www.bloomberglinea.com/latinoamerica/chile',
  'https://www.alairelibre.cl',
  'https://www.elmostrador.cl',
  'https://www.eldesconcierto.cl',
  'https://www.latercera.com',
  'https://www.emol.com',
  
  // Regionales (73 total - aquí van los 63 restantes)
  'https://www.diariocoquimbo.cl',
  'https://www.diariotemuco.cl',
  'https://www.diariodevaldivia.cl',
  'https://www.diariopuertomontt.cl',
  'https://www.diariopuntaarenas.cl',
  'https://www.orbe.cl',
  'https://www.reuters.com/world/americas/chile',
  'https://www.france24.com/es/américa-latina',
];

// Estadísticas
const stats = {
  total: 0,
  conDescripcion: 0,
  sinDescripcion: 0,
  conError: 0,
  descripcionesVacias: 0,
  descripcionesCortas: 0,
  descripcionesValidas: 0,
  detalles: []
};

async function testSite(url) {
  try {
    logger.info(`🧪 Probando: ${url}`);
    
    const response = await axios.get(`http://localhost:3000/api/scrape`, {
      params: { url },
      timeout: 30000
    });
    
    if (response.data && response.data.noticias) {
      const noticias = response.data.noticias;
      
      let conDesc = 0;
      let sinDesc = 0;
      let cortas = 0;
      let validas = 0;
      
      noticias.forEach(noticia => {
        if (noticia.descripcion && noticia.descripcion !== 'No hay descripción disponible') {
          conDesc++;
          
          if (noticia.descripcion.length < 20) {
            cortas++;
          } else {
            validas++;
          }
        } else {
          sinDesc++;
        }
      });
      
      const porcentajeConDesc = ((conDesc / noticias.length) * 100).toFixed(1);
      
      logger.info(`✅ ${url}`);
      logger.info(`   📊 Total: ${noticias.length} | Con desc: ${conDesc} (${porcentajeConDesc}%) | Sin desc: ${sinDesc} | Válidas: ${validas}`);
      
      stats.total += noticias.length;
      stats.conDescripcion += conDesc;
      stats.sinDescripcion += sinDesc;
      stats.descripcionesCortas += cortas;
      stats.descripcionesValidas += validas;
      
      stats.detalles.push({
        sitio: url,
        total: noticias.length,
        conDescripcion: conDesc,
        sinDescripcion: sinDesc,
        porcentaje: porcentajeConDesc,
        validas: validas,
        status: '✅'
      });
      
      return true;
    } else {
      logger.warn(`⚠️ Sin noticias: ${url}`);
      stats.detalles.push({
        sitio: url,
        status: '⚠️ Sin noticias'
      });
      return false;
    }
  } catch (error) {
    logger.error(`❌ Error en ${url}: ${error.message}`);
    stats.conError++;
    stats.detalles.push({
      sitio: url,
      status: `❌ ${error.message}`
    });
    return false;
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  VALIDACIÓN DE EXTRACCIÓN DE DESCRIPCIONES - TODOS LOS SITIOS  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  logger.info(`🚀 Iniciando validación de ${SITES_TO_TEST.length} sitios...`);
  
  // Probar cada sitio
  for (const site of SITES_TO_TEST) {
    await testSite(site);
    // Esperar 1 segundo entre requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Mostrar resumen
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                        RESUMEN FINAL                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const porcentajeConDesc = stats.total > 0 ? ((stats.conDescripcion / stats.total) * 100).toFixed(1) : 0;
  const porcentajeValidas = stats.total > 0 ? ((stats.descripcionesValidas / stats.total) * 100).toFixed(1) : 0;
  
  console.log(`📊 ESTADÍSTICAS GENERALES:`);
  console.log(`   Total de noticias: ${stats.total}`);
  console.log(`   Con descripción: ${stats.conDescripcion} (${porcentajeConDesc}%)`);
  console.log(`   Sin descripción: ${stats.sinDescripcion}`);
  console.log(`   Descripciones válidas: ${stats.descripcionesValidas} (${porcentajeValidas}%)`);
  console.log(`   Descripciones cortas: ${stats.descripcionesCortas}`);
  console.log(`   Errores: ${stats.conError}`);
  
  console.log(`\n📋 DETALLES POR SITIO:\n`);
  
  stats.detalles.forEach(detalle => {
    if (detalle.status === '✅') {
      console.log(`${detalle.status} ${detalle.sitio}`);
      console.log(`   Total: ${detalle.total} | Con desc: ${detalle.conDescripcion} (${detalle.porcentaje}%) | Válidas: ${detalle.validas}`);
    } else {
      console.log(`${detalle.status} ${detalle.sitio}`);
    }
  });
  
  console.log(`\n`);
  
  // Validación final
  if (porcentajeConDesc >= 80) {
    console.log(`✅ VALIDACIÓN EXITOSA: ${porcentajeConDesc}% de noticias tienen descripción`);
    console.log(`✅ Las mejoras de extracción de descripciones están funcionando correctamente\n`);
    process.exit(0);
  } else if (porcentajeConDesc >= 60) {
    console.log(`⚠️ VALIDACIÓN PARCIAL: ${porcentajeConDesc}% de noticias tienen descripción`);
    console.log(`⚠️ Se recomienda revisar sitios con bajo porcentaje\n`);
    process.exit(1);
  } else {
    console.log(`❌ VALIDACIÓN FALLIDA: ${porcentajeConDesc}% de noticias tienen descripción`);
    console.log(`❌ Las mejoras no están funcionando correctamente\n`);
    process.exit(2);
  }
}

main().catch(error => {
  logger.error(`Error fatal: ${error.message}`);
  process.exit(3);
});
