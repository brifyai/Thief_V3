const axios = require('axios');

const sites = [
  'https://www.t13.cl',
  'https://www.lacuarta.com', 
  'https://www.meganoticias.cl',
  'https://www.biobiochile.cl'
];

async function testSystemScraper(siteUrl) {
  try {
    console.log(`\n🧪 Probando sistema real de scraping: ${siteUrl}`);
    console.log('='.repeat(60));
    
    const response = await axios.post('http://localhost:3005/api/simple-test', {
      url: siteUrl
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Resultado del sistema:`);
    console.log(`   Sitio: ${response.data.sitio || response.data.siteName}`);
    console.log(`   Total noticias: ${response.data.total_noticias || response.data.noticias?.length || 0}`);
    console.log(`   Config type: ${response.data.metadata?.configType || 'N/A'}`);
    console.log(`   Config source: ${response.data.metadata?.configSource || 'N/A'}`);
    
    if (response.data.noticias && response.data.noticias.length > 0) {
      console.log(`\n📰 Primeras 3 noticias:`);
      response.data.noticias.slice(0, 3).forEach((noticia, i) => {
        console.log(`   ${i+1}. "${noticia.titulo.substring(0, 80)}..."`);
        console.log(`      URL: ${noticia.enlace.substring(0, 80)}...`);
        console.log(`      Descripción: ${noticia.descripcion?.substring(0, 60)}...`);
      });
    } else {
      console.log(`❌ No se encontraron noticias`);
    }
    
    return response.data;
    
  } catch (error) {
    console.log(`❌ Error con ${siteUrl}: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2).substring(0, 500)}...`);
    }
    return null;
  }
}

async function main() {
  console.log('🔧 VERIFICACIÓN FINAL DEL SISTEMA DE SCRAPING');
  console.log('='.repeat(70));
  
  for (const site of sites) {
    await testSystemScraper(site);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 Verificación completada');
}

main();