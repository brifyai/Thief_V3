// Script para procesar TODAS las noticias sin resumen
// Ejecutar con: node process-all-summaries.js

const axios = require('axios');

async function processAllSummaries() {
  try {
    console.log('🚀 Iniciando procesamiento masivo de resúmenes...');
    
    // Endpoint que procesa 15 noticias a la vez
    const baseUrl = 'http://localhost:3005/api/simple/generate-summaries';
    
    let totalProcessed = 0;
    let batchNumber = 0;
    
    // Procesar hasta que no queden noticias pendientes
    while (true) {
      batchNumber++;
      console.log(`\n🔄 Procesando lote #${batchNumber}...`);
      
      try {
        const response = await axios.get(baseUrl, { timeout: 60000 });
        const data = response.data;
        
        if (data.success && data.processed > 0) {
          totalProcessed += data.processed;
          console.log(`✅ Lote ${batchNumber}: ${data.processed} noticias procesadas`);
          console.log(`📊 Total procesado: ${totalProcessed} noticias`);
          
          // Si el batch es menor a 15, probablemente ya no hay más noticias
          if (data.processed < 15) {
            console.log('🏁 No hay más noticias pendientes de procesar');
            break;
          }
        } else {
          console.log('⚠️ No se procesaron noticias en este lote');
          break;
        }
        
        // Pausa pequeña entre lotes para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error en lote ${batchNumber}:`, error.message);
        break;
      }
    }
    
    console.log(`\n🎉 PROCESAMIENTO COMPLETADO!`);
    console.log(`📈 Total de noticias procesadas: ${totalProcessed}`);
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

processAllSummaries();