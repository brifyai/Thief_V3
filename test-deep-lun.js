const { getLunComDeepScraperService } = require('./server/backend/src/services/lunComDeepScraper.service');
const { loggers } = require('./server/backend/src/utils/logger');

const logger = loggers.scraping;

/**
 * Script para probar el Deep Scraper con LUN
 */
async function testDeepLun() {
  logger.info('🚀 Iniciando prueba de Deep Scraper con LUN.COM');
  
  try {
    // Obtener servicio Deep Scraper
    const deepService = getLunComDeepScraperService();
    
    // Medir tiempo de ejecución
    const startTime = Date.now();
    
    // Ejecutar scraping manual
    logger.info('🔧 Ejecutando scraping profundo...');
    const noticias = await deepService.scrapeManual();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Mostrar resultados
    logger.info(`✅ Prueba profunda completada en ${duration.toFixed(2)} segundos`);
    logger.info(`📰 Total de noticias extraídas: ${noticias.length}`);
    
    // Mostrar primeras 10 noticias como ejemplo
    if (noticias.length > 0) {
      logger.info('📋 Ejemplo de noticias extraídas:');
      noticias.slice(0, 10).forEach((noticia, index) => {
        logger.info(`${index + 1}. ${noticia.titulo}`);
        if (noticia.descripcion) {
          logger.info(`   📝 ${noticia.descripcion.substring(0, 150)}...`);
        }
        logger.info(`   🔗 ${noticia.url}`);
        logger.info(`   📊 Método: ${noticia.method}`);
        logger.info('');
      });
    }
    
    // Analizar calidad de los resultados
    if (noticias.length > 0) {
      const avgTitleLength = noticias.reduce((sum, n) => sum + n.titulo.length, 0) / noticias.length;
      const longTitles = noticias.filter(n => n.titulo.length > 50).length;
      const withDescriptions = noticias.filter(n => n.descripcion && n.descripcion.length > 50).length;
      const withUrls = noticias.filter(n => n.url && n.url !== 'https://www.lun.com').length;
      
      logger.info('📊 Análisis de calidad:');
      logger.info(`   • Longitud promedio de títulos: ${avgTitleLength.toFixed(1)} caracteres`);
      logger.info(`   • Títulos largos (>50 chars): ${longTitles}/${noticias.length} (${(longTitles/noticias.length*100).toFixed(1)}%)`);
      logger.info(`   • Con descripciones largas: ${withDescriptions}/${noticias.length} (${(withDescriptions/noticias.length*100).toFixed(1)}%)`);
      logger.info(`   • Con URLs individuales: ${withUrls}/${noticias.length} (${(withUrls/noticias.length*100).toFixed(1)}%)`);
      
      // Evaluar calidad del texto (menos caracteres extraños)
      const cleanTitles = noticias.filter(n => {
        const strangeChars = (n.titulo.match(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ¿¡°ºª.,;:¡!¿?()-_"\'/\\@#$%&+*=<>]/g) || []).length;
        return strangeChars <= n.titulo.length * 0.05; // Menos del 5% de caracteres extraños
      });
      
      logger.info(`   • Títulos muy limpios: ${cleanTitles.length}/${noticias.length} (${(cleanTitles.length/noticias.length*100).toFixed(1)}%)`);
      
      // Mostrar ejemplos de contenido
      if (noticias.length > 0) {
        logger.info('📄 Ejemplos de contenido extraído:');
        noticias.slice(0, 3).forEach((noticia, index) => {
          logger.info(`${index + 1}. Título: ${noticia.titulo}`);
          if (noticia.descripcion) {
            logger.info(`   Contenido: ${noticia.descripcion.substring(0, 200)}...`);
          }
          logger.info('');
        });
      }
    }
    
    return noticias;
    
  } catch (error) {
    logger.error(`❌ Error en prueba profunda: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  testDeepLun()
    .then(() => {
      logger.info('🎉 Prueba de Deep Scraper finalizada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Prueba profunda falló:', error.message);
      process.exit(1);
    });
}

module.exports = { testDeepLun };