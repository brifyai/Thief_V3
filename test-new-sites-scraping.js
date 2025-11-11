const path = require('path');
const fs = require('fs');

// Cargar configuración directamente desde el archivo JSON
function loadConfigDirectly() {
  try {
    const configPath = path.join(__dirname, 'server/backend/src/config/site-configs.json');
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configFile);
    return config;
  } catch (error) {
    console.error('Error cargando configuración:', error);
    return { sites: [] };
  }
}

// Función simple para obtener configuración por dominio
function getConfigForDomain(url) {
  const config = loadConfigDirectly();
  if (!config.sites) return null;
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    return config.sites.find(site =>
      site.domain === domain ||
      site.domain === urlObj.hostname ||
      urlObj.hostname.includes(site.domain)
    );
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

// Smart scraper simplificado
async function testSmartScraper(url) {
  try {
    const cheerio = require('cheerio');
    const axios = require('axios');
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Intentar extraer título
    let title = $('h1').first().text().trim() ||
               $('title').text().trim() ||
               $('[title]').first().attr('title') ||
               $('meta[property="og:title"]').attr('content');
    
    // Intentar extraer contenido
    let content = '';
    const contentSelectors = [
      'article',
      '.content',
      '.entry-content',
      '.post-content',
      '.article-body',
      '.story-content',
      '.texto',
      'main p',
      '.description'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 100) break;
      }
    }
    
    // Extraer imágenes
    const images = [];
    $('img').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && src.startsWith('http')) {
        images.push(src);
      }
    });
    
    return {
      success: !!(title || content),
      title: title || null,
      contenido: content || null,
      imagenes: images.slice(0, 5) // Limitar a 5 imágenes
    };
    
  } catch (error) {
    return {
      success: false,
      reason: error.message,
      title: null,
      contenido: null,
      imagenes: []
    };
  }
}

// Lista de nuevos sitios agregados
const newSites = [
  'https://chocale.cl',
  'https://www.redgol.cl',
  'https://chile.as.com',
  'https://www.alairelibre.cl',
  'https://www.prensafutbol.cl',
  'https://www.ciperchile.cl',
  'https://www.elmostrador.cl',
  'https://interferencia.cl',
  'https://www.eldesconcierto.cl',
  'https://anid.cl',
  'https://www.minciencia.gob.cl',
  'https://chilecultura.gob.cl',
  'https://www.orbe.cl',
  'https://www.mediabanco.com',
  'https://enprensa.cl',
  'https://www.soychile.cl',
  'https://www.aricaldia.cl',
  'https://elmorrodearica.cl',
  'https://www.arica365.cl',
  'https://www.elmorrocotudo.cl',
  'https://cappissimamultimedial.cl/'
];

async function testNewSites() {
  console.log('🧪 Probando scraping de nuevos sitios agregados...\n');
  
  const results = [];
  
  for (const siteUrl of newSites) {
    try {
      console.log(`🔍 Probando: ${siteUrl}`);
      
      // Verificar que la configuración existe
      const config = getConfigForDomain(siteUrl);
      if (!config) {
        console.log(`❌ No se encontró configuración para ${siteUrl}`);
        results.push({ site: siteUrl, success: false, error: 'No configuration found' });
        continue;
      }
      
      console.log(`✅ Configuración encontrada: ${config.name}`);
      
      // Intentar extraer contenido con smart scraper simplificado
      const extractionResult = await testSmartScraper(siteUrl);
      
      if (extractionResult.success) {
        console.log(`✅ Extracción exitosa`);
        console.log(`   Título: ${extractionResult.titulo ? extractionResult.titulo.substring(0, 100) + '...' : 'N/A'}`);
        console.log(`   Contenido: ${extractionResult.contenido ? extractionResult.contenido.length + ' caracteres' : 'N/A'}`);
        console.log(`   Imágenes: ${extractionResult.imagenes ? extractionResult.imagenes.length : 0}`);
        
        results.push({
          site: siteUrl,
          success: true,
          title: extractionResult.titulo,
          contentLength: extractionResult.contenido ? extractionResult.contenido.length : 0,
          images: extractionResult.imagenes ? extractionResult.imagenes.length : 0
        });
      } else {
        console.log(`❌ Extracción fallida: ${extractionResult.reason || 'Unknown error'}`);
        results.push({
          site: siteUrl,
          success: false,
          error: extractionResult.reason || 'Extraction failed'
        });
      }
      
    } catch (error) {
      console.log(`❌ Error procesando ${siteUrl}: ${error.message}`);
      results.push({
        site: siteUrl,
        success: false,
        error: error.message
      });
    }
    
    console.log('---\n');
    
    // Pequeña pausa entre solicitudes para no sobrecargar los servidores
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumen final
  console.log('\n📊 RESUMEN DE RESULTADOS:');
  console.log('========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Sitios exitosos: ${successful.length}/${results.length}`);
  console.log(`❌ Sitios fallidos: ${failed.length}/${results.length}`);
  console.log(`📈 Tasa de éxito: ${((successful.length / results.length) * 100).toFixed(1)}%`);
  
  if (successful.length > 0) {
    console.log('\n✅ SITIOS QUE FUNCIONAN:');
    successful.forEach(result => {
      console.log(`   ${result.site}`);
      console.log(`      Título: ${result.title ? result.title.substring(0, 50) + '...' : 'N/A'}`);
      console.log(`      Contenido: ${result.contentLength} caracteres`);
      console.log(`      Imágenes: ${result.images}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ SITIOS CON PROBLEMAS:');
    failed.forEach(result => {
      console.log(`   ${result.site}: ${result.error}`);
    });
  }
  
  console.log('\n🎯 RECOMENDACIONES:');
  if (successful.length >= results.length * 0.7) {
    console.log('   ✅ Buena cobertura de sitios. La mayoría funciona correctamente.');
  } else if (successful.length >= results.length * 0.5) {
    console.log('   ⚠️  Cobertura moderada. Algunos sitios pueden necesitar configuración específica.');
  } else {
    console.log('   ❌ Cobertura baja. Se recomienda revisar las configuraciones o probar selectores específicos.');
  }
}

// Ejecutar pruebas
testNewSites().catch(console.error);