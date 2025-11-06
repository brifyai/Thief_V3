const { scrapeSite } = require('./server/backend/src/services/scraping.service');

// Test directo de T13 con configuración temporal que extrae del atributo title
async function testT13Working() {
  console.log('🧪 TEST FINAL: T13 con extracción correcta');
  console.log('='.repeat(50));
  
  try {
    const result = await scrapeSite('https://www.t13.cl', {
      temporaryConfig: {
        name: 'T13 Test',
        domain: 't13.cl',
        selectors: {
          listing: {
            container: 'a[title][href*="noticia"]',
            title: 'a[title][href*="noticia"]',
            link: 'a[title][href*="noticia"]'
          }
        }
      }
    });
    
    console.log('📊 Resultado del test:');
    console.log(`   - Total noticias: ${result.total_noticias}`);
    console.log(`   - Config type: ${result.metadata.configType}`);
    console.log(`   - Config source: ${result.metadata.configSource}`);
    
    if (result.total_noticias > 0) {
      console.log('✅ ÉXITO: T13 se puede scrapear correctamente');
      console.log('📰 Primeras noticias:');
      result.noticias.slice(0, 3).forEach((noticia, i) => {
        console.log(`   ${i+1}. ${noticia.titulo}`);
      });
    } else {
      console.log('❌ FALLO: Sigue sin encontrar noticias');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testT13Working();