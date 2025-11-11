const axios = require('axios');
const cheerio = require('cheerio');
const configLoader = require('./server/backend/src/services/configLoader.service');

const sites = [
  { name: 'La Cuarta', url: 'https://www.lacuarta.com' },
  { name: 'La Nación', url: 'https://www.lanacion.cl' },
  { name: '24 Horas', url: 'https://www.24horas.cl' },
  { name: 'Mega Noticias', url: 'https://www.meganoticias.cl' },
  { name: 'Chilevisión', url: 'https://www.chilevision.cl' },
  { name: 'Biobío Chile', url: 'https://www.biobiochile.cl' },
  { name: 'Cooperativa', url: 'https://www.cooperativa.cl' },
  { name: 'ADN Radio', url: 'https://www.adnradio.cl' },
  { name: 'Bloomberg Línea', url: 'https://www.bloomberglinea.com/latinoamerica/chile/' },
  { name: 'Chocale', url: 'https://chocale.cl' }
];

async function testSite(site) {
  try {
    console.log(`\n🔍 Probando: ${site.name} (${site.url})`);
    
    const response = await axios.get(site.url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Buscar configuración
    const config = configLoader.getConfigForDomain(site.url);
    
    if (!config) {
      console.log(`❌ No se encontró configuración para ${site.name}`);
      return { success: false, site: site.name, error: 'No configuration found' };
    }
    
    console.log(`📋 Configuración encontrada: ${config.name}`);
    
    // Probar selectores de listado
    const selectors = config.selectors.listing;
    let totalNews = 0;
    
    // Intentar diferentes selectores de noticias
    const newsSelectors = [
      'a[href*="/noticia/"]',
      'a[href*="/nacional/"]',
      'a[href*="/deportes/"]',
      'h2 a',
      'h3 a',
      '.card a',
      '.article a'
    ];
    
    for (const selector of newsSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`   Selector "${selector}": ${elements.length} elementos encontrados`);
        totalNews = Math.max(totalNews, elements.length);
        
        // Mostrar ejemplos
        if (elements.length > 0) {
          const first = elements.first();
          const href = first.attr('href') || 'No href';
          const title = first.attr('title') || first.text().trim().substring(0, 50) + '...';
          console.log(`   Ejemplo: ${href} - ${title}`);
          break;
        }
      }
    }
    
    const success = totalNews > 0;
    console.log(`✅ Resultado: ${totalNews} noticias encontradas`);
    
    return { 
      success, 
      site: site.name, 
      newsFound: totalNews,
      config: config.name 
    };
    
  } catch (error) {
    console.log(`❌ Error con ${site.name}: ${error.message}`);
    return { success: false, site: site.name, error: error.message };
  }
}

async function main() {
  console.log('🧪 PROBANDO TODAS LAS CONFIGURACIONES DE NOTICIAS');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const site of sites) {
    const result = await testSite(site);
    results.push(result);
    
    // Pausa entre pruebas
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE RESULTADOS');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Sitios funcionando: ${successful.length}/${results.length}`);
  console.log(`❌ Sitios con problemas: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Sitios que funcionan:');
    successful.forEach(site => {
      console.log(`   - ${site.site}: ${site.newsFound} noticias encontradas`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Sitios con problemas:');
    failed.forEach(site => {
      console.log(`   - ${site.site}: ${site.error}`);
    });
  }
  
  console.log('\n🎉 Prueba completada');
}

main();