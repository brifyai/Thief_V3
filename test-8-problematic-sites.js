/**
 * Test para validar extracción de 8 sitios problemáticos
 * Usando el nuevo scraper avanzado con lógica de T13
 */

const { AdvancedProblematicSitesScraper } = require('./server/backend/src/services/advancedProblematicSitesScraper.service');

const testSites = [
  { name: 'Diario Coquimbo', url: 'https://diariocoquimbo.cl' },
  { name: 'Diario Temuco', url: 'https://diariotemuco.cl' },
  { name: 'Diario Valdivia', url: 'https://diariovaldivia.cl' },
  { name: 'Diario Puerto Montt', url: 'https://diariopuertomontt.cl' },
  { name: 'Diario Punta Arenas', url: 'https://diariopuntaarenas.cl' },
  { name: 'Orbe', url: 'https://orbe.cl' },
  { name: 'Reuters Chile', url: 'https://www.reuters.com/places/chile' },
  { name: 'France24 Español', url: 'https://www.france24.com/es' }
];

async function testProblematicSites() {
  console.log('🚀 Iniciando test de 8 sitios problemáticos...\n');
  
  const scraper = new AdvancedProblematicSitesScraper();
  const results = [];
  
  for (const site of testSites) {
    console.log(`\n📡 Scrapeando: ${site.name}`);
    console.log(`   URL: ${site.url}`);
    
    try {
      const result = await scraper.scrapeProblematicSite(site.url);
      
      if (result && result.noticias && result.noticias.length > 0) {
        console.log(`   ✅ Éxito: ${result.noticias.length} noticias extraídas`);
        results.push({
          sitio: site.name,
          url: site.url,
          status: 'success',
          noticias: result.noticias.length,
          ejemplos: result.noticias.slice(0, 2).map(n => ({
            titulo: n.titulo.substring(0, 60) + '...',
            enlace: n.enlace
          }))
        });
      } else {
        console.log(`   ⚠️ Sin noticias extraídas`);
        results.push({
          sitio: site.name,
          url: site.url,
          status: 'no-news',
          noticias: 0
        });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        sitio: site.name,
        url: site.url,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // Resumen
  console.log('\n\n📊 RESUMEN DE RESULTADOS:');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.status === 'success');
  const noNews = results.filter(r => r.status === 'no-news');
  const errors = results.filter(r => r.status === 'error');
  
  console.log(`✅ Exitosos: ${successful.length}/8`);
  console.log(`⚠️  Sin noticias: ${noNews.length}/8`);
  console.log(`❌ Errores: ${errors.length}/8`);
  
  console.log('\n📋 Detalles:');
  results.forEach(r => {
    const icon = r.status === 'success' ? '✅' : r.status === 'no-news' ? '⚠️' : '❌';
    console.log(`${icon} ${r.sitio}: ${r.noticias || 0} noticias`);
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
  });
  
  // Total de noticias
  const totalNoticias = successful.reduce((sum, r) => sum + r.noticias, 0);
  console.log(`\n🎉 Total de noticias extraídas: ${totalNoticias}`);
  
  // Mostrar ejemplos
  if (successful.length > 0) {
    console.log('\n📰 Ejemplos de noticias extraídas:');
    successful.forEach(site => {
      console.log(`\n${site.sitio}:`);
      site.ejemplos.forEach((noticia, idx) => {
        console.log(`  ${idx + 1}. ${noticia.titulo}`);
        console.log(`     ${noticia.enlace}`);
      });
    });
  }
}

// Ejecutar test
testProblematicSites().catch(console.error);
