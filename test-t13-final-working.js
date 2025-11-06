const axios = require('axios');
const cheerio = require('cheerio');

async function finalT13Test() {
  console.log('🎯 TEST FINAL - T13 CON LÓGICA MEJORADA');
  console.log('='.repeat(50));
  
  try {
    // 1. Descargar T13
    const response = await axios.get('https://www.t13.cl', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const containerSelector = 'a[title][href*="noticia"]';
    
    console.log(`📊 Elementos con selector "${containerSelector}":`, $(containerSelector).length);
    
    // 2. Aplicar nueva lógica de extracción (simplificada)
    const noticias = [];
    $(containerSelector).each((_, element) => {
      const $element = $(element);
      
      // 🎯 NUEVA LÓGICA: Extraer título desde atributo
      const titulo = $element.attr('title') || $element.find('.titulo').text();
      const enlace = $element.attr('href');
      const descripcion = $element.find('.epigrafe').text() || "No hay descripción";
      
      if (titulo && titulo.length > 10 && enlace) {
        noticias.push({
          titulo: titulo.trim(),
          enlace: enlace,
          descripcion: descripcion.trim() || "No hay descripción"
        });
      }
    });
    
    console.log(`✅ Noticias extraídas: ${noticias.length}`);
    
    if (noticias.length > 0) {
      console.log('\n📰 PRIMERAS 3 NOTICIAS ENCONTRADAS:');
      noticias.slice(0, 3).forEach((noticia, i) => {
        console.log(`   ${i+1}. ${noticia.titulo.substring(0, 60)}...`);
        console.log(`      Enlace: ${noticia.enlace}`);
        console.log(`      Descripción: ${noticia.descripcion.substring(0, 30)}...`);
        console.log();
      });
      
      console.log('🎉 ¡ÉXITO TOTAL! T13 ahora extrae noticias correctamente');
      console.log('💡 Solución: Usar $element.attr("title") en lugar de $element.find(".titulo").text()');
    } else {
      console.log('❌ Aún no funciona - investigando más...');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

finalT13Test();