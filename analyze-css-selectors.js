const axios = require('axios');
const cheerio = require('cheerio');

const sites = [
  { name: 'T13', url: 'https://www.t13.cl' },
  { name: 'La Cuarta', url: 'https://www.lacuarta.com' },
  { name: 'Mega Noticias', url: 'https://www.meganoticias.cl' },
  { name: 'Biobío Chile', url: 'https://www.biobiochile.cl' }
];

async function analyzeContainerStructure(site) {
  try {
    console.log(`\n🔍 Analizando estructura real de: ${site.name}`);
    console.log('='.repeat(50));
    
    const response = await axios.get(site.url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Analizar diferentes selectores de contenedores reales
    const selectors = [
      // T13
      'a.card[title]',
      'section.comp-destacados .card',
      'section[class*="grilla"] .card',
      'a[href^="/noticia/"]',
      
      // La Cuarta  
      'h2 a[href*="/noticia/"]',
      'a[href*="/chile/noticia/"]',
      'a[href*="/deportes/noticia/"]',
      
      // Mega Noticias
      'a[href*="/nacional/"]',
      'a[href*="/deportes/"]',
      '.item a[href]',
      
      // Biobío Chile
      'a[href*="/noticias/"]',
      '.article a[href]',
      'h2 a[href]'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`\n📋 Selector: "${selector}" (${elements.length} elementos)`);
        
        // Analizar los primeros 2 elementos
        elements.slice(0, 2).each((i, el) => {
          const $el = $(el);
          const href = $el.attr('href');
          const title = $el.attr('title') || $el.text().trim().substring(0, 80);
          const className = $el.attr('class');
          const parentClass = $el.parent().attr('class');
          
          console.log(`   ${i+1}. href: ${href || 'N/A'}`);
          console.log(`      title: ${title.substring(0, 60)}...`);
          console.log(`      class: ${className || 'N/A'}`);
          console.log(`      parent: ${parentClass || 'N/A'}`);
        });
      }
    }
    
    // Buscar patrones de news articles
    console.log(`\n🔍 Buscando patrones de noticias...`);
    
    const newsPatterns = [
      // Buscar por palabras clave en href
      'a[href*="noticia"]',
      'a[href*="noticias"]', 
      'a[href*="nacional"]',
      'a[href*="deportes"]',
      'a[href*="chile"]',
      'a[href*="mundo"]'
    ];
    
    for (const pattern of newsPatterns) {
      const elements = $(pattern);
      if (elements.length > 0) {
        console.log(`\n✅ Patrón válido: "${pattern}" - ${elements.length} elementos`);
        
        // Ver si los primeros elementos tienen títulos válidos
        const validLinks = elements.filter((i, el) => {
          const $el = $(el);
          const href = $el.attr('href');
          const text = $el.text().trim();
          return href && text && text.length > 10;
        });
        
        console.log(`   Válidos (con href y texto): ${validLinks.length}/${elements.length}`);
        
        if (validLinks.length > 0) {
          const firstValid = validLinks.first();
          const firstHref = firstValid.attr('href');
          const firstTitle = firstValid.text().trim();
          console.log(`   Ejemplo: "${firstHref}" - "${firstTitle.substring(0, 50)}..."`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Error con ${site.name}: ${error.message}`);
  }
}

async function main() {
  console.log('🔧 ANÁLISIS DETALLADO DE ESTRUCTURA PARA SELECTORES CSS');
  console.log('='.repeat(70));
  
  for (const site of sites) {
    await analyzeContainerStructure(site);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Análisis completado');
}

main();