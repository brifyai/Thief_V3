const axios = require('axios');
const cheerio = require('cheerio');

const sites = [
  { name: 'T13', url: 'https://www.t13.cl' },
  { name: 'La Cuarta', url: 'https://www.lacuarta.com' },
  { name: 'Mega Noticias', url: 'https://www.meganoticias.cl' },
  { name: 'Biobío Chile', url: 'https://www.biobiochile.cl' }
];

async function testCorrectedScraping(site) {
  try {
    console.log(`\n🧪 Test corregido: ${site.name}`);
    console.log('='.repeat(50));
    
    const response = await axios.get(site.url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Usar los selectores que sabemos que funcionan
    let selector;
    if (site.name === 'T13') selector = 'a[href*="noticia"]';
    else if (site.name === 'La Cuarta') selector = 'h2 a[href*="/noticia/"]';
    else if (site.name === 'Mega Noticias') selector = 'a[href*="noticia"]';
    else if (site.name === 'Biobío Chile') selector = 'a[href*="noticia"]';
    else selector = 'a[href*="noticia"]';
    
    const elements = $(selector);
    console.log(`🔍 Elementos encontrados: ${elements.length}`);
    
    if (elements.length > 0) {
      console.log(`\n📰 Primeros 5 elementos:`);
      elements.slice(0, 5).each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.attr('title') || $el.text().trim().substring(0, 80);
        const text = $el.text().trim();
        
        console.log(`   ${i+1}. href: ${href || 'N/A'}`);
        console.log(`      title attr: ${$el.attr('title') || 'N/A'}`);
        console.log(`      text: "${text.substring(0, 60)}..."`);
        console.log(`      full text: "${text}"`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Error con ${site.name}: ${error.message}`);
  }
}

async function main() {
  console.log('🔧 TEST CORREGIDO DE SCRAPING');
  console.log('='.repeat(60));
  
  for (const site of sites) {
    await testCorrectedScraping(site);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Test completado');
}

main();