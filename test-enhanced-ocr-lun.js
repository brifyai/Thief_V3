const { getLunComScraperServiceV2 } = require('./server/backend/src/services/lunComScraper-v2.service');
const { loggers } = require('./server/backend/src/utils/logger');

const logger = loggers.scraping;

/**
 * Script para probar el OCR mejorado con LUN
 */
async function testEnhancedOCRWithLun() {
  logger.info('🚀 Iniciando prueba de OCR mejorado con LUN.COM');
  
  try {
    // Obtener servicio V2 con OCR mejorado
    const scraperV2 = getLunComScraperServiceV2();
    
    // Medir tiempo de ejecución
    const startTime = Date.now();
    
    // Ejecutar scraping manual
    logger.info('🔧 Ejecutando scraping V2 con OCR mejorado...');
    const noticias = await scraperV2.scrapeManual();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Mostrar resultados
    logger.info(`✅ Prueba completada en ${duration.toFixed(2)} segundos`);
    logger.info(`📰 Total de noticias extraídas: ${noticias.length}`);
    
    // Mostrar primeras 5 noticias como ejemplo
    if (noticias.length > 0) {
      logger.info('📋 Ejemplo de noticias extraídas:');
      noticias.slice(0, 5).forEach((noticia, index) => {
        logger.info(`${index + 1}. ${noticia.titulo}`);
        if (noticia.descripcion) {
          logger.info(`   📝 ${noticia.descripcion.substring(0, 100)}...`);
        }
      });
    }
    
    // Analizar calidad de los resultados
    const avgTitleLength = noticias.reduce((sum, n) => sum + n.titulo.length, 0) / noticias.length;
    const longTitles = noticias.filter(n => n.titulo.length > 50).length;
    const titlesWithDescriptions = noticias.filter(n => n.descripcion && n.descripcion.length > 10).length;
    
    logger.info('📊 Análisis de calidad:');
    logger.info(`   • Longitud promedio de títulos: ${avgTitleLength.toFixed(1)} caracteres`);
    logger.info(`   • Títulos largos (>50 chars): ${longTitles}/${noticias.length} (${(longTitles/noticias.length*100).toFixed(1)}%)`);
    logger.info(`   • Con descripciones: ${titlesWithDescriptions}/${noticias.length} (${(titlesWithDescriptions/noticias.length*100).toFixed(1)}%)`);
    
    return noticias;
    
  } catch (error) {
    logger.error(`❌ Error en prueba de OCR mejorado: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  testEnhancedOCRWithLun()
    .then(() => {
      logger.info('🎉 Prueba de OCR mejorado finalizada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Prueba falló:', error.message);
      process.exit(1);
    });
}

module.exports = { testEnhancedOCRWithLun };