const { AdvancedAlAireLibreScraper } = require('./server/backend/src/services/advancedAlAireLibreScraper.service');

async function testAdvancedScraper() {
  console.log('🚀 Iniciando test del scraper avanzado para Al Aire Libre v2...\n');

  const scraper = new AdvancedAlAireLibreScraper();

  try {
    console.log('📊 Ejecutando scraper completo (Puppeteer + Axios con 6 estrategias)...\n');
    const allResults = await scraper.scrape();
    
    console.log(`✅ Total encontrado: ${allResults.length} noticias\n`);

    if (allResults.length > 0) {
      console.log('📰 Primeras 30 noticias encontradas:');
      allResults.slice(0, 30).forEach((article, i) => {
        console.log(`${i + 1}. ${article.title}`);
        console.log(`   URL: ${article.url}`);
        console.log(`   Método: ${article.method}`);
        if (article.image) console.log(`   Imagen: ${article.image}`);
        console.log('');
      });

      console.log(`\n✨ RESUMEN:`);
      console.log(`Total de noticias extraídas: ${allResults.length}`);
      console.log(`Objetivo: 57+ noticias`);
      console.log(`Estado: ${allResults.length >= 57 ? '✅ OBJETIVO ALCANZADO' : '⚠️ Aún por mejorar'}`);
      
      // Estadísticas por método
      const methodStats = {};
      allResults.forEach(article => {
        methodStats[article.method] = (methodStats[article.method] || 0) + 1;
      });
      
      console.log(`\n📊 Estadísticas por método:`);
      Object.entries(methodStats).forEach(([method, count]) => {
        console.log(`   ${method}: ${count} noticias`);
      });
    }
  } catch (error) {
    console.error('❌ Error durante el test:', error);
  }
}

testAdvancedScraper();