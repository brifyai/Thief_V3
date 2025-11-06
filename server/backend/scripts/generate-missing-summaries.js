/**
 * Script para generar resúmenes faltantes con IA
 * Actualiza las noticias que tienen "No hay descripción disponible..."
 */

const { supabase } = require('../src/config/database');
const { generateTitleAndSummary } = require('../src/services/aiEnhancer.service');
const { loggers } = require('../src/utils/logger');

const logger = loggers.scraping;

async function generateMissingSummaries() {
  try {
    console.log('🔍 Buscando noticias sin resumen real...');
    
    // Buscar noticias con resumen predeterminado
    const { data: news, error } = await supabase
      .from('news')
      .select('id, title, content, summary')
      .eq('summary', 'No hay descripción disponible...')
      .or('summary.is.null')
      .limit(20); // Limitar para pruebas

    if (error) {
      throw error;
    }

    if (!news || news.length === 0) {
      console.log('✅ No hay noticias que necesiten resumen');
      return;
    }

    console.log(`📰 Encontradas ${news.length} noticias para actualizar`);

    let successCount = 0;
    let errorCount = 0;

    for (const article of news) {
      try {
        console.log(`🤖 Generando resumen para: "${article.title.substring(0, 50)}..."`);
        
        // Generar título y resumen con IA
        const result = await generateTitleAndSummary(article.content);
        
        if (result.error) {
          console.log(`❌ Error generando resumen: ${result.error}`);
          errorCount++;
          continue;
        }

        // Actualizar en la base de datos
        const { error: updateError } = await supabase
          .from('news')
          .update({
            summary: result.summary,
            title: result.title || article.title, // Actualizar título si es mejor
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id);

        if (updateError) {
          console.log(`❌ Error actualizando BD: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`✅ Resumen actualizado para noticia ${article.id}`);
          successCount++;
        }

        // Pausa entre llamadas para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.log(`❌ Error procesando noticia ${article.id}: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Resumen final:`);
    console.log(`✅ Éxito: ${successCount} noticias actualizadas`);
    console.log(`❌ Errores: ${errorCount} noticias fallidas`);
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar el script
if (require.main === module) {
  generateMissingSummaries().then(() => {
    console.log('🏁 Script completado');
    process.exit(0);
  }).catch(err => {
    console.error('💥 Error en script:', err);
    process.exit(1);
  });
}

module.exports = { generateMissingSummaries };