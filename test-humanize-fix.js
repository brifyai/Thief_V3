#!/usr/bin/env node

/**
 * Test script para verificar que la humanización funciona correctamente
 * después de corregir el error de tokenTracker
 */

const http = require('http');

async function testHumanize() {
  console.log('🧪 Iniciando test de humanización...\n');

  // Primero, obtener una noticia
  console.log('1️⃣ Obteniendo lista de noticias...');
  
  const newsResponse = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/news?page=1&limit=1',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });

  console.log(`   Status: ${newsResponse.status}`);
  
  // Extraer el ID de la estructura correcta
  let newsId = null;
  if (newsResponse.data?.data?.news?.[0]?.id) {
    newsId = newsResponse.data.data.news[0].id;
  }

  if (!newsId) {
    console.error('❌ No se pudo extraer el ID de la noticia');
    return;
  }

  console.log(`   ✅ Noticia encontrada: ID ${newsId}\n`);

  // Ahora intentar humanizar
  console.log('2️⃣ Intentando humanizar noticia...');
  
  const humanizeResponse = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/news/${newsId}/humanize`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({}));
    req.end();
  });

  console.log(`   Status: ${humanizeResponse.status}`);
  
  if (humanizeResponse.status === 200) {
    console.log('   ✅ Humanización exitosa!');
    console.log(`   Respuesta: ${JSON.stringify(humanizeResponse.data).substring(0, 300)}...\n`);
    console.log('✅ TEST PASADO: La humanización funciona correctamente');
    console.log('✅ El error "tokenTracker.trackUsage is not a function" ha sido RESUELTO');
  } else {
    console.error(`   ❌ Error en humanización: ${humanizeResponse.status}`);
    console.error(`   Respuesta: ${JSON.stringify(humanizeResponse.data, null, 2)}\n`);
    console.error('❌ TEST FALLIDO');
  }
}

testHumanize().catch(err => {
  console.error('❌ Error en test:', err.message);
  process.exit(1);
});
