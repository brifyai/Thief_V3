/**
 * Test del sistema LUN.COM con OCR.space
 */

const { getLunComScraperService } = require('./server/backend/src/services/lunComScraper.service');

async function testLunComOCR() {
  console.log('🎬 Iniciando test de LUN.COM con OCR.space\n');
  
  try {
    // Obtener instancia del servicio
    const lunComScraper = getLunComScraperService();
    
    console.log('✅ Servicio de LUN.COM inicializado');
    console.log(`   - OCR Service: OCR.space`);
    console.log(`   - API Key: K88796830988957 (gratuita)`);
    console.log(`   - Límite: 25,000 requests/mes\n`);
    
    // Ejecutar scraping manual
    console.log('🚀 Ejecutando scraping manual...\n');
    
    const inicio = Date.now();
    const noticias = await lunComScraper.scrapeManual();
    const duracion = ((Date.now() - inicio) / 1000).toFixed(2);
    
    console.log(`\n✅ Scraping completado en ${duracion} segundos`);
    console.log(`📰 Total de noticias extraídas: ${noticias.length}\n`);
    
    if (noticias.length > 0) {
      console.log('📋 Primeras 5 noticias:\n');
      noticias.slice(0, 5).forEach((noticia, index) => {
        console.log(`${index + 1}. ${noticia.titulo}`);
        console.log(`   URL: ${noticia.url}`);
        console.log(`   Descripción: ${noticia.descripcion || 'N/A'}\n`);
      });
      
      console.log('✅ Test EXITOSO - Sistema funcionando correctamente\n');
    } else {
      console.log('⚠️ No se extrajeron noticias. Posibles causas:');
      console.log('   1. OCR.space no pudo extraer texto de la imagen');
      console.log('   2. Los filtros son demasiado restrictivos');
      console.log('   3. La imagen capturada no tiene contenido de noticias\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error en test:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar test
testLunComOCR().then(() => {
  console.log('✨ Test completado\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});