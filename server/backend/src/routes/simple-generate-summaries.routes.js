const express = require('express');
const router = express.Router();
const { supabase } = require('../config/database');

/**
 * GET /api/simple/generate-summaries
 * Genera resúmenes simples del contenido existente
 * NO USA IA EXTERNA - Solo procesa el contenido disponible
 */
router.get('/generate-summaries', async (req, res) => {
  try {
    console.log('🔍 Buscando noticias sin resumen real...');
    
    // Buscar noticias con resumen predeterminado
    const { data: news, error } = await supabase
      .from('news')
      .select('id, title, content, summary')
      .eq('summary', 'No hay descripción disponible...')
      .limit(15); // Procesar 15 a la vez

    if (error) {
      throw error;
    }

    if (!news || news.length === 0) {
      return res.json({
        success: true,
        message: 'No hay noticias que necesiten resumen',
        processed: 0
      });
    }

    console.log(`📰 Encontradas ${news.length} noticias para actualizar`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const article of news) {
      try {
        console.log(`📝 Procesando: "${article.title.substring(0, 50)}..."`);
        
        // Generar resumen simple del contenido
        let summary = generateSimpleSummary(article.content);
        
        if (!summary) {
          // Si no hay contenido, usar una descripción genérica
          summary = `Noticia de ${article.source || 'fuente desconocida'} sobre ${article.title.substring(0, 50)}...`;
        }

        // Actualizar en la base de datos
        const { error: updateError } = await supabase
          .from('news')
          .update({
            summary: summary,
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id);

        if (updateError) {
          console.log(`❌ Error actualizando BD: ${updateError.message}`);
          results.push({
            id: article.id,
            title: article.title,
            success: false,
            error: updateError.message
          });
          errorCount++;
        } else {
          console.log(`✅ Resumen actualizado para noticia ${article.id}`);
          results.push({
            id: article.id,
            title: article.title,
            success: true,
            summary: summary
          });
          successCount++;
        }

        // Pausa pequeña entre actualizaciones
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.log(`❌ Error procesando noticia ${article.id}: ${err.message}`);
        results.push({
          id: article.id,
          title: article.title,
          success: false,
          error: err.message
        });
        errorCount++;
      }
    }

    const response = {
      success: true,
      message: `Procesamiento completado: ${successCount} éxitos, ${errorCount} errores`,
      processed: successCount,
      errors: errorCount,
      totalNews: news.length,
      results: results
    };

    console.log(`📊 Resumen final: ${successCount} éxitos, ${errorCount} errores`);
    
    res.json(response);
    
  } catch (error) {
    console.error('💥 Error en generación de resúmenes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Genera un resumen simple del contenido
 * @param {string} content - Contenido de la noticia
 * @returns {string} Resumen generado
 */
function generateSimpleSummary(content) {
  try {
    // Verificar que el contenido existe
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return null;
    }

    // Limpiar el contenido
    const cleanedContent = content
      .replace(/<[^>]*>/g, '') // Remover HTML
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();

    if (cleanedContent.length < 50) {
      return null; // Contenido muy corto
    }

    // Dividir en oraciones
    const sentences = cleanedContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      return cleanedContent.substring(0, 200) + '...';
    }

    // Tomar las primeras 2-3 oraciones más relevantes
    let summary = '';
    let sentenceCount = 0;
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 15) { // Solo oraciones con contenido significativo
        summary += (summary ? '. ' : '') + trimmed;
        sentenceCount++;
        
        if (sentenceCount >= 3) break; // Máximo 3 oraciones
      }
    }

    // Si el resumen es muy corto, tomar más texto
    if (summary.length < 100 && sentences.length > 0) {
      const firstSentences = sentences.slice(0, 4).join('. ');
      summary = firstSentences.length > 200 ? firstSentences.substring(0, 200) + '...' : firstSentences;
    }

    return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
    
  } catch (error) {
    console.error('Error generando resumen simple:', error);
    return null;
  }
}

module.exports = router;