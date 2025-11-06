const fs = require('fs');
const cheerio = require('cheerio');

function analyzeStructure(filename, siteName) {
  try {
    console.log(`\n🔍 Analizando estructura de: ${siteName}`);
    console.log('='.repeat(50));
    
    const html = fs.readFileSync(filename, 'utf8');
    const $ = cheerio.load(html);
    
    // Patrones comunes de noticias
    const newsPatterns = [
      // Enlaces de noticias comunes
      'a[href*="noticia"]',
      'a[href*="article"]', 
      'a[href*="news"]',
      'a[href*="story"]',
      'a[href*="/"]',
      
      // Contenedores de noticias
      '.noticia',
      '.article',
      '.news',
      '.story',
      '.card',
      '.post',
      '.item',
      
      // Títulos
      'h1 a', 'h2 a', 'h3 a', 'h4 a',
      '.titulo', '.title', '.headline',
      '.entry-title', '.post-title',
      
      // Contenedores de contenido
      '.contenido', '.content', '.texto',
      '.entry-content', '.post-content'
    ];
    
    // Analizar cada patrón
    let foundPatterns = [];
    
    newsPatterns.forEach(pattern => {
      const elements = $(pattern);
      if (elements.length > 0) {
        foundPatterns.push({
          pattern: pattern,
          count: elements.length,
          sample: elements.first().attr('href') || elements.first().text().substring(0, 50) + '...'
        });
      }
    });
    
    // Mostrar patrones encontrados
    if (foundPatterns.length > 0) {
      console.log('📊 Patrones encontrados:');
      foundPatterns.forEach(p => {
        console.log(`   ${p.pattern}: ${p.count} elementos - Ej: ${p.sample}`);
      });
      
      // Buscar URLs de noticias específicas
      const newsLinks = $('a[href*="noticia"], a[href*="article"], a[href*="news"]');
      if (newsLinks.length > 0) {
        console.log('\n📰 Ejemplos de URLs de noticias:');
        newsLinks.slice(0, 5).each((i, el) => {
          const href = $(el).attr('href');
          const title = $(el).attr('title') || $(el).text().trim().substring(0, 60);
          console.log(`   ${i+1}. ${href} - ${title}`);
        });
      }
    } else {
      console.log('⚠️ No se encontraron patrones comunes de noticias');
    }
    
    return foundPatterns;
    
  } catch (error) {
    console.log(`❌ Error analizando ${siteName}: ${error.message}`);
    return [];
  }
}

function main() {
  console.log('🔍 ANÁLISIS DE ESTRUCTURA DE SITIOS DE NOTICIAS');
  console.log('='.repeat(60));
  
  const sites = [
    { file: 'www_lacuarta_com.html', name: 'La Cuarta' },
    { file: 'www_lanacion_cl.html', name: 'La Nación' },
    { file: 'www_24horas_cl.html', name: '24 Horas' },
    { file: 'www_meganoticias_cl.html', name: 'Mega Noticias' },
    { file: 'www_chilevision_cl.html', name: 'Chilevisión' },
    { file: 'www_biobiochile_cl.html', name: 'Biobío Chile' },
    { file: 'www_cooperativa_cl.html', name: 'Cooperativa' },
    { file: 'www_adnradio_cl.html', name: 'ADN Radio' },
    { file: 'tele13radio_cl.html', name: 'Tele13 Radio' },
    { file: 'www_bloomberglinea_com_latinoamerica_chile_.html', name: 'Bloomberg Línea' },
    { file: 'chocale_cl.html', name: 'Chocale' }
  ];
  
  sites.forEach(site => {
    analyzeStructure(site.file, site.name);
  });
  
  console.log('\n🎉 Análisis completado');
}

main();