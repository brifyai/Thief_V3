// ========================================
// AI WRAPPER
// Wrapper para tracking automático de llamadas a IA
// ========================================

const { tokenTracker } = require('../services/tokenTracker.service');

/**
 * Wrapper para llamadas a IA con tracking automático
 * 
 * @param {string} operationType - Tipo de operación: 'search', 'sentiment', 'entity', 'clustering', 'synonym', 'pattern'
 * @param {Function} aiFunction - Función async que ejecuta la llamada a IA
 * @param {Object} options - Opciones adicionales
 * @param {string} options.operationId - ID de la operación específica
 * @param {number} options.userId - ID del usuario
 * @param {string} options.model - Modelo usado
 * @param {number} options.promptLength - Longitud del prompt
 * @param {boolean} options.cacheHit - Si fue un cache hit
 * @param {string} options.endpoint - Endpoint que inició la llamada
 * @param {string} options.ipAddress - IP del cliente
 * @param {string} options.userAgent - User agent del cliente
 * @returns {Promise<Object>} Resultado de la llamada a IA
 */
async function trackAICall(operationType, aiFunction, options = {}) {
  const startTime = Date.now();
  
  try {
    // Ejecutar llamada a IA
    const result = await aiFunction();
    
    const durationMs = Date.now() - startTime;
    
    // Extraer tokens de la respuesta
    const inputTokens = result.usage?.prompt_tokens || 0;
    const outputTokens = result.usage?.completion_tokens || 0;
    const modelUsed = result.model || options.model || process.env.AI_MODEL || 'llama3-8b-8192';
    
    // Registrar uso
    const trackingResult = await tokenTracker.trackUsage({
      operationType,
      operationId: options.operationId,
      userId: options.userId,
      inputTokens,
      outputTokens,
      modelUsed,
      promptLength: options.promptLength,
      responseLength: result.choices?.[0]?.message?.content?.length,
      cacheHit: options.cacheHit || false,
      endpoint: options.endpoint,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      durationMs
    });
    
    // Agregar metadata de tracking al resultado
    if (trackingResult) {
      result._tracking = trackingResult;
    }
    
    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`Error en llamada IA (${operationType}):`, error.message);
    
    // Registrar error (con tokens estimados si es posible)
    if (options.estimatedTokens) {
      await tokenTracker.trackUsage({
        operationType,
        operationId: options.operationId,
        userId: options.userId,
        inputTokens: options.estimatedTokens,
        outputTokens: 0,
        modelUsed: options.model || process.env.AI_MODEL || 'llama3-8b-8192',
        promptLength: options.promptLength,
        responseLength: 0,
        cacheHit: false,
        endpoint: options.endpoint,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        durationMs
      });
    }
    
    throw error;
  }
}

/**
 * Wrapper simplificado para llamadas sin request context
 */
async function trackAICallSimple(operationType, aiFunction, options = {}) {
  return trackAICall(operationType, aiFunction, {
    ...options,
    endpoint: options.endpoint || 'internal',
    ipAddress: null,
    userAgent: null
  });
}

module.exports = { 
  trackAICall,
  trackAICallSimple
};
