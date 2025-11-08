const { getLunComHybridService } = require('./server/backend/src/services/lunComHybrid.service');
const { loggers } = require('./server/backend/src/utils/logger');

const logger = loggers.scraping;

/**
 * Script para probar el scraper híbrido con LUN
 */
async function testHybridLun() {
  logger.info('🚀 Iniciando prueba de scraper híbrido con LUN.COM');
  
  try {
    // Obtener servicio híbrido
    const hybridService = getLunComHybridService();
    
    // Medir tiempo de ejecución
    const startTime = Date.now();
    
    // Ejecutar scraping manual
    logger.info('🔧 Ejecutando scraping híbrido...');
    const noticias = await hybridService.scrapeManual();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Mostrar resultados
    logger.info(`✅ Prueba híbrida completada en ${duration.toFixed(2)} segundos`);
    logger.info(`📰 Total de noticias extraídas: ${noticias.length}`);
    
    // Mostrar método utilizado
    if (noticias.length > 0) {
      const method = noticias[0].method;
      logger.info(`🔧 Método utilizado: ${method}`);
    }
    
    // Mostrar primeras 10 noticias como ejemplo
    if (noticias.length > 0) {
      logger.info('📋 Ejemplo de noticias extraídas:');
      noticias.slice(0, 10).forEach((noticia, index) => {
        logger.info(`${index + 1}. ${noticia.titulo}`);
        if (noticia.descripcion) {
          logger.info(`   📝 ${noticia.descripcion.substring(0, 100)}...`);
        }
        logger.info(`   🔗 ${noticia.url}`);
        logger.info(`   📊 Método: ${noticia.method}`);
      });
    }
    
    // Analizar calidad de los resultados
    if (noticias.length > 0) {
      const avgTitleLength = noticias.reduce((sum, n) => sum + n.titulo.length, 0) / noticias.length;
      const longTitles = noticias.filter(n => n.titulo.length > 50).length;
      const withUrls = noticias.filter(n => n.url && n.url !== 'https://www.lun.com').length;
      const htmlMethod = noticias.filter(n => n.method === 'html').length;
      const ocrMethod = noticias.filter(n => n.method && n.method.includes('ocr')).length;
      
      logger.info('📊 Análisis de calidad:');
      logger.info(`   • Longitud promedio de títulos: ${avgTitleLength.toFixed(1)} caracteres`);
      logger.info(`   • Títulos largos (>50 chars): ${longTitles}/${noticias.length} (${(longTitles/noticias.length*100).toFixed(1)}%)`);
      logger.info(`   • Con URLs válidas: ${withUrls}/${noticias.length} (${(withUrls/noticias.length*100).toFixed(1)}%)`);
      logger.info(`   • Método HTML: ${htmlMethod}/${noticias.length} (${(htmlMethod/noticias.length*100).toFixed(1)}%)`);
      logger.info(`   • Método OCR: ${ocrMethod}/${noticias.length} (${(ocrMethod/noticias.length*100).toFixed(1)}%)`);
      
      // Evaluar calidad del texto
      const cleanTitles = noticias.filter(n => {
        const strangeChars = (n.titulo.match(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ¿¡°ºª.,;:¡!¿?()-_"\'/\\@#$%&+*=<>]/g) || []).length;
        return strangeChars <= n.titulo.length * 0.1; // Menos del 10% de caracteres extraños
      });
      
      logger.info(`   • Títulos limpios: ${cleanTitles.length}/${noticias.length} (${(cleanTitles.length/noticias.length*100).toFixed(1)}%)`);
    }
    
    return noticias;
    
  } catch (error) {
    logger.error(`❌ Error en prueba híbrida: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  testHybridLun()
    .then(() => {
      logger.info('🎉 Prueba de scraper híbrido finalizada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Prueba híbrida falló:', error.message);
      process.exit(1);
    });
}

module.exports = { testHybridLun };