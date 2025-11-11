const axios = require('axios');

async function testSaveNews() {
  try {
    console.log('🧪 Probando guardado de noticias desde df.cl...');

    // Primero hacer scraping sin guardar
    console.log('📡 Paso 1: Obteniendo vista previa de noticias...');
    const previewResponse = await axios.post('http://localhost:3000/api/simple-test', {
      url: 'https://www.df.cl',
      save: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token' // Token de demo para bypass
      }
    });

    if (!previewResponse.data.success) {
      console.error('❌ Error en scraping:', previewResponse.data.error);
      return;
    }

    console.log(`✅ Encontradas ${previewResponse.data.news_count} noticias`);
    console.log('📋 Vista previa:');
    previewResponse.data.preview.forEach((news, i) => {
      console.log(`   ${i+1}. ${news.title.substring(0, 60)}...`);
    });

    // Ahora guardar las noticias
    console.log('\n💾 Paso 2: Guardando noticias en la base de datos...');
    const saveResponse = await axios.post('http://localhost:3000/api/simple-test', {
      url: 'https://www.df.cl',
      save: true
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token'
      }
    });

    if (saveResponse.data.success) {
      console.log(`🎉 ÉXITO! Se guardaron ${saveResponse.data.saved_count} de ${saveResponse.data.news_count} noticias`);
      console.log(`📊 Mensaje: ${saveResponse.data.message}`);
    } else {
      console.error('❌ Error guardando:', saveResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Respuesta:', error.response.data);
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
    } else {
      console.error('Error de configuración:', error);
    }
  }
}

testSaveNews();