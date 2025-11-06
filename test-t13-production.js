// Cargar variables de entorno
require('dotenv').config();

const { scrapeSite } = require('./server/backend/src/services/scraping.service');

async function testT13Production() {
  console.log('🎯 TEST DE PRODUCCIÓN T13 - EXTRACCIÓN DE NOTICIAS');
  console.log('=' .repeat(60));
  
  try {
    const t13Url = 'https://www.t13.cl';
    
    console.log(`✅ Probando extracción de T13: ${t13Url}`);
    
    // Extraer noticias de T13 usando la nueva configuración
    console.log('\n🔍 Extrayendo noticias de T13 con configuración mejorada...');
    const startTime = Date.now();
    
    const result = await scrapeSite(t13Url, {}, null, 3);
    
    const extractionTime = Date.now() - startTime;
    
    console.log(`\n📊 RESULTADOS:`);
    console.log(`⏱️  Tiempo de extracción: ${extractionTime}ms`);
    console.log(`📰 Noticias extraídas: ${result.total_noticias || 0}`);
    console.log(`🔗 Sitio: ${result.sitio}`);
    console.log(`📋 Tipo de configuración: ${result.metadata?.configType || 'unknown'}`);
    console.log(`🌐 Método: ${result.metadata?.method || 'unknown'}`);
    console.log(`\n🔗 Últimas 3 noticias:`);
    
    if (result.noticias && result.noticias.length > 0) {
      result.noticias.slice(0, 3).forEach((news, index) => {
        console.log(`   ${index + 1}. ${news.titulo?.substring(0, 80)}...`);
        console.log(`      📍 ${news.enlace}`);
        console.log(`      📝 ${news.descripcion?.substring(0, 100)}...`);
        console.log('');
      });
    }
    
    // Verificar si se alcanzó el objetivo
    const targetNews = 57;
    const extractedCount = result.total_noticias || 0;
    const successRate = Math.round((extractedCount / targetNews) * 100);
    
    console.log(`🎯 OBJETIVO ALCANZADO:`);
    console.log(`   📊 Extraído: ${extractedCount}/${targetNews} (${successRate}%)`);
    
    if (successRate >= 80) {
      console.log(`   ✅ ÉXITO: T13 está funcionando correctamente en producción`);
      console.log(`   🚀 La nueva lógica de atributos está funcionando`);
    } else if (successRate >= 50) {
      console.log(`   ⚠️  PARCIAL: T13 funciona pero podría mejorar`);
    } else {
      console.log(`   ❌ PROBLEMA: T13 necesita más ajustes`);
      console.log(`   🔍 Revisar configuración de selectores`);
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar la prueba
testT13Production()
  .then(() => {
    console.log('\n🏁 Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Prueba fallida:', error);
    process.exit(1);
  });