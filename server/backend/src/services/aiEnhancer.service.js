/**
 * Servicio para mejorar contenido con IA
 * Genera títulos y resúmenes cuando faltan o son de baja calidad
 */

const { generateText } = require('./ai.service');
const { aiCostOptimizer } = require('./aiCostOptimizer.service');
const { trackAICallSimple } = require('../utils/aiWrapper');
const { loggers } = require('../utils/logger');
const logger = loggers.scraping;

// Inicializar el optimizador de costos
aiCostOptimizer.initialize().catch(console.warn);

/**
 * Genera título y resumen usando IA
 * @param {string} content - Contenido de la noticia
 * @returns {Promise<{title: string|null, summary: string|null, error: string|null}>}
 */
async function generateTitleAndSummary(content) {
  try {
    if (!content || content.length < 100) {
      return {
        title: null,
        summary: null,
        error: 'Contenido muy corto para generar título'
      };
    }
    
    logger.info('🤖 Generando título y resumen con IA (optimizado)...');
    
    // Usar aiCostOptimizer para cache y optimización
    const optimizedResult = await aiCostOptimizer.executeWithOptimization(
      'categorization', // Reutilizar tipo similar
      content,
      async (optimizedContent) => {
        const prompt = `Analiza este contenido de noticia y genera:
1. Un título conciso y descriptivo (máximo 100 caracteres)
2. Un resumen breve (máximo 200 caracteres)

Contenido:
${optimizedContent}

Responde SOLO con un JSON válido en este formato exacto:
{"title": "título aquí", "summary": "resumen aquí"}`;

        // Usar tracking de tokens
        const result = await trackAICallSimple(
          'title_generation', // Tipo de operación
          async () => {
            return await generateText(prompt, {
              temperature: 0.3,
              maxTokens: 200
            });
          },
          {
            operationId: `title_gen_${Date.now()}`,
            promptLength: prompt.length,
            model: 'llama3-8b-8192'
          }
        );
        
        return { response: result.text };
      },
      {
        maxLength: 1500,
        fallback: () => generateFallbackTitleSummary(content)
      }
    );
    
    const response = optimizedResult.response;
    
    // Intentar parsear la respuesta
    let result;
    try {
      // Limpiar la respuesta por si tiene texto extra
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se encontró JSON en la respuesta');
      }
    } catch (parseError) {
      logger.warn('⚠️ Error parseando respuesta de IA, usando fallback');
      
      // Fallback: extraer título y resumen de forma manual
      const lines = response.split('\n').filter(l => l.trim());
      result = {
        title: lines[0]?.substring(0, 100) || null,
        summary: lines[1]?.substring(0, 200) || null
      };
    }
    
    // Validar que tenga contenido útil
    if (!result.title || result.title.length < 10) {
      logger.warn('⚠️ Título generado muy corto o vacío');
      return {
        title: null,
        summary: result.summary,
        error: 'Título generado inválido'
      };
    }
    
    logger.info(`✅ IA generó título: "${result.title}"`);
    
    return {
      title: result.title,
      summary: result.summary,
      error: null
    };
    
  } catch (error) {
    logger.error(`❌ Error generando título/resumen con IA: ${error.message}`);
    return {
      title: null,
      summary: null,
      error: error.message
    };
  }
}

/**
 * Fallback: Genera título y resumen sin IA
 * @param {string} content - Contenido de la noticia
 * @returns {Object}
 */
function generateFallbackTitleSummary(content) {
  const lines = content.split('\n').filter(l => l.trim() && l.length > 20);
  
  return {
    title: lines[0]?.substring(0, 100) || 'Sin título',
    summary: lines.slice(0, 3).join(' ').substring(0, 200) || content.substring(0, 200),
    confidence: 0.3,
    fallback: true
  };
}

/**
 * Genera solo un título usando IA
 * @param {string} content - Contenido de la noticia
 * @returns {Promise<string|null>}
 */
async function generateTitle(content) {
  const result = await generateTitleAndSummary(content);
  return result.title;
}

/**
 * Genera solo un resumen usando IA
 * @param {string} content - Contenido de la noticia
 * @returns {Promise<string|null>}
 */
async function generateSummary(content) {
  const result = await generateTitleAndSummary(content);
  return result.summary;
}

module.exports = {
  generateTitleAndSummary,
  generateTitle,
  generateSummary
};
