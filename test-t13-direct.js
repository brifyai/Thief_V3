const { extractNewsWithCheerio } = require('./server/backend/src/services/scraping.service');
const axios = require('axios');
const cheerio = require('cheerio');

async function testT13WithNewLogic() {
  console.log('🧪 TEST DIRECTO DE T13 CON NUEVA LÓGICA');
  console.log('='.repeat(50));
  
  try {
    // 1. Obtener HTML de T13
    console.log('📡 Descargando página de T13...');
    const response = await axios.get('https://www.t13.cl', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    console.log(`✅ Página descargada: ${response.data.length} caracteres`);
    
    // 2. Cargar en Cheerio
    const $ = cheerio.load(response.data);
    console.log('📄 HTML cargado en Cheerio');
    
    // 3. Configuración de T13
    const t13Config = {
      name: 'T13',
      domain: 't13.cl',
      selectors: {
        listing: {
          container: 'a[title][href*="noticia"]',
          title: 'a[title][href*="noticia"]', 
          link: 'a[title][href*="noticia"]',
          description: '.epigrafe'
        }
      }
    };
    
    const containerSelector = t13Config.selectors.listing.container;
    const listingSelectors = t13Config.selectors.listing;
    
    console.log(`🎯 Usando contenedor: "${containerSelector}"`);
    
    // 4. CONTEO DIRECTO ANTES DE EXTRACCIÓN
    const directCount = $(containerSelector).length;
    console.log(`📊 Elementos encontrados directamente: ${directCount}`);
    
    if (directCount > 0) {
      const firstElement = $(containerSelector).first();
      console.log(`🔍 Primer elemento:`);
      console.log(`   - href: ${firstElement.attr('href') || 'No encontrado'}`);
      console.log(`   - title: ${firstElement.attr('title') || 'No encontrado'}`);
      console.log(`   - text: "${firstElement.text().trim().substring(0, 50)}..."`);
    }
    
    // 5. USAR NUEVA LÓGICA DE EXTRACCIÓN
    console.log('🧠 Usando nueva lógica de extracción...');
    const noticias = extractNewsWithCheerio($, containerSelector, listingSelectors, 'https://www.t13.cl');
    
    console.log(`✅ Noticias extraídas: ${noticias.length}`);
    
    if (noticias.length > 0) {
      console.log('📰 Primeros resultados:');
      noticias.slice(0, 3).forEach((noticia, i) => {
        console.log(`   ${i+1}. ${noticia.titulo.substring(0, 60)}...`);
        console.log(`      Enlace: ${noticia.enlace.substring(0, 50)}...`);
      });
      
      console.log('\n🎉 ¡ÉXITO! T13 ahora funciona correctamente');
    } else {
      console.log('\n❌ PROBLEMA: La nueva lógica aún no extrae noticias');
      console.log('   Causa probable: Los selectores aún no coinciden correctamente');
    }
    
    return {
      success: noticias.length > 0,
      totalFound: directCount,
      totalExtracted: noticias.length,
      noticias: noticias
    };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

testT13WithNewLogic();