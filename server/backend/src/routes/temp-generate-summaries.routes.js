const express = require('express');
const router = express.Router();
const { supabase } = require('../config/database');
const { generateTitleAndSummary } = require('../services/aiEnhancer.service');
const { loggers } = require('../utils/logger');

const logger = loggers.scraping;

/**
 * GET /api/temp/generate-summaries
 * Genera resúmenes faltantes para noticias
 * SOLO PARA DESARROLLO - Eliminar en producción
 */
router.get('/generate-summaries', async (req, res) => {
  try {
    logger.info('🔍 Iniciando generación de resúmenes faltantes...');
    
    // Buscar noticias con resumen predeterminado
    const { data: news, error } = await supabase
      .from('news')
      .select('id, title, content, summary')
      .eq('summary', 'No hay descripción disponible...')
      .limit(10); // Procesar 10 a la vez para evitar sobrecarga

    if (error) {
      throw error;
    }

    if (!news || news.length === 0) {
      return res.json({
        success: true,
        message: 'No hay noticias que necesiten resumen',
        processed: 0,
        totalProcessed: 0
      });
    }

    logger.info(`📰 Encontradas ${news.length} noticias para actualizar`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const article of news) {
      try {
        logger.info(`🤖 Generando resumen para: "${article.title.substring(0, 50)}..."`);
        
        // Generar título y resumen con IA
        const aiResult = await generateTitleAndSummary(article.content);
        
        if (aiResult.error) {
          logger.warn(`⚠️ Error generando resumen: ${aiResult.error}`);
          results.push({
            id: article.id,
            title: article.title,
            success: false,
            error: aiResult.error
          });
          errorCount++;
          continue;
        }

        // Actualizar en la base de datos
        const { error: updateError } = await supabase
          .from('news')
          .update({
            summary: aiResult.summary,
            title: aiResult.title || article.title, // Actualizar título si es mejor
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id);

        if (updateError) {
          logger.error(`❌ Error actualizando BD para noticia ${article.id}: ${updateError.message}`);
          results.push({
            id: article.id,
            title: article.title,
            success: false,
            error: `DB Error: ${updateError.message}`
          });
          errorCount++;
        } else {
          logger.info(`✅ Resumen actualizado para noticia ${article.id}`);
          results.push({
            id: article.id,
            title: article.title,
            success: true,
            summary: aiResult.summary,
            newTitle: aiResult.title
          });
          successCount++;
        }

        // Pausa entre llamadas para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (err) {
        logger.error(`❌ Error procesando noticia ${article.id}: ${err.message}`);
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

    logger.info(`📊 Resumen final: ${successCount} éxitos, ${errorCount} errores`);
    
    res.json(response);
    
  } catch (error) {
    logger.error('💥 Error en generación de resúmenes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;