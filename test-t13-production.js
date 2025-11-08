#!/usr/bin/env node

/**
 * Test para verificar que T13 extrae 57 noticias en producción
 * Usa la API del servidor backend para validar la extracción
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api/scraping/scrape-site';
const T13_URL = 'https://www.t13.cl';

async function testT13Production() {
  console.log('🎯 TEST: Verificar extracción de T13 en producción\n');
  console.log(`📡 URL: ${T13_URL}`);
  console.log(`🔗 API: ${API_URL}\n`);

  try {
    console.log('⏳ Enviando solicitud al servidor backend...\n');
    
    const response = await axios.post(API_URL, {
      url: T13_URL
    }, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = response.data;

    console.log('✅ Respuesta recibida del servidor\n');
    console.log('📊 RESULTADOS:');
    console.log(`   Sitio: ${result.sitio}`);
    console.log(`   Total de noticias: ${result.total_noticias}`);
    console.log(`   Método: ${result.metadata?.method || 'unknown'}`);
    console.log(`   Tipo de config: ${result.metadata?.configType || 'unknown'}`);
    console.log(`   Fuente de config: ${result.metadata?.configSource || 'unknown'}\n`);

    // Validar resultados
    if (result.total_noticias >= 50) {
      console.log(`✅ ÉXITO: T13 extrae ${result.total_noticias} noticias (esperadas: 57)`);
      console.log(`   Tasa de éxito: ${((result.total_noticias / 57) * 100).toFixed(1)}%\n`);
    } else if (result.total_noticias >= 30) {
      console.log(`⚠️  PARCIAL: T13 extrae ${result.total_noticias} noticias (esperadas: 57)`);
      console.log(`   Tasa de éxito: ${((result.total_noticias / 57) * 100).toFixed(1)}%\n`);
    } else {
      console.log(`❌ FALLO: T13 extrae solo ${result.total_noticias} noticias (esperadas: 57)`);
      console.log(`   Tasa de éxito: ${((result.total_noticias / 57) * 100).toFixed(1)}%\n`);
    }

    // Mostrar primeras 5 noticias
    if (result.noticias && result.noticias.length > 0) {
      console.log('📰 PRIMERAS 5 NOTICIAS EXTRAÍDAS:\n');
      result.noticias.slice(0, 5).forEach((noticia, index) => {
        console.log(`   ${index + 1}. ${noticia.titulo}`);
        console.log(`      URL: ${noticia.enlace}\n`);
      });
    }

    return result.total_noticias >= 50;

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.response?.data) {
      console.error('   Detalles:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Ejecutar test
testT13Production().then(success => {
  process.exit(success ? 0 : 1);
});