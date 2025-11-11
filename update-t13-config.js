const { scrapeSite } = require('./server/backend/src/services/scraping.service');

async function updateT13Config() {
  console.log('🔧 ACTUALIZANDO CONFIGURACIÓN DE T13 EN PRODUCCIÓN');
  console.log('='.repeat(60));
  
  try {
    // Test con la configuración temporal que sabemos que funciona
    console.log('🧪 Probando configuración corregida...');
    
    const result = await scrapeSite('https://www.t13.cl', {
      temporaryConfig: {
        name: 'Tele13 Radio',
        domain: 't13.cl',
        selectors: {
          listing: {
            container: 'a[title][href*="noticia"]',
            title: 'a[title][href*="noticia"]', // 🎯 CLAVE: El título se extrae desde el atributo 'title'
            link: 'a[title][href*="noticia"]',
            description: null
          }
        }
      }
    });
    
    console.log('\n📊 RESULTADOS DEL TEST:');
    console.log(`   Total noticias extraídas: ${result.total_noticias}`);
    console.log(`   Configuración usada: ${result.metadata.configType}`);
    console.log(`   Método: ${result.metadata.method}`);
    
    if (result.total_noticias >= 50) {
      console.log('✅ ¡ÉXITO! La configuración funciona correctamente');
      console.log('🎉 T13 ahora puede extraer las noticias esperadas');
      
      // Mostrar algunas noticias de ejemplo
      console.log('\n📰 EJEMPLOS DE NOTICIAS EXTRAÍDAS:');
      result.noticias.slice(0, 5).forEach((noticia, i) => {
        console.log(`   ${i+1}. ${noticia.titulo.substring(0, 80)}...`);
        console.log(`      Enlace: ${noticia.enlace}`);
        console.log('');
      });
      
      return { success: true, noticias: result.total_noticias };
      
    } else {
      console.log(`⚠️ La configuración no está extrayendo suficientes noticias (${result.total_noticias})`);
      
      if (result.noticias && result.noticias.length > 0) {
        console.log('🔍 Primeras noticias encontradas:');
        result.noticias.forEach((noticia, i) => {
          console.log(`   ${i+1}. ${noticia.titulo.substring(0, 50)}...`);
        });
      }
      
      return { success: false, noticias: result.total_noticias, error: 'Insuficientes noticias extraídas' };
    }
    
  } catch (error) {
    console.log(`❌ Error en el test: ${error.message}`);
    console.log(`🔍 Stack: ${error.stack}`);
    return { success: false, error: error.message };
  }
}

updateT13Config().then(result => {
  if (result.success) {
    console.log('\n🎯 SIGUIENTE PASO: Actualizar la configuración en la base de datos');
    console.log('   La lógica ya está implementada en scraping.service.js');
    console.log('   Solo necesitamos asegurar que use la configuración correcta');
  } else {
    console.log('\n❌ Se necesita revisar la configuración');
  }
});