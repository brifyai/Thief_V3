const cacheService = require('../utils/cacheService');

/**
 * Middleware para invalidación automática de caché
 * Se ejecuta después de operaciones que modifican datos
 */

/**
 * Invalidar caché después de crear un scraping result
 * Invalida búsquedas y estadísticas del usuario
 */
const invalidateAfterScrapingResult = async (userId, resultId = null) => {
  try {
    console.log(`🧹 Invalidando caché después de crear/actualizar scraping result (usuario: ${userId})`);
    
    // Invalidar búsquedas del usuario
    await cacheService.invalidatePattern(`search:${userId}:*`);
    
    // Invalidar estadísticas del usuario
    await cacheService.deleteCached(cacheService.keys.stats(userId));
    
    // Invalidar filtros del usuario
    await cacheService.deleteCached(`filters:${userId}`);
    
    // Si se proporciona resultId, invalidar ese resultado específico
    if (resultId) {
      await cacheService.deleteCached(cacheService.keys.result(resultId));
    }
    
    console.log(`✅ Caché invalidado para usuario ${userId}`);
  } catch (error) {
    console.error('Error invalidando caché:', error.message);
    // No lanzar error, solo loguear
  }
};

/**
 * Invalidar caché después de eliminar un scraping result
 */
const invalidateAfterDelete = async (userId, resultId) => {
  try {
    console.log(`🧹 Invalidando caché después de eliminar result ${resultId}`);
    
    // Invalidar búsquedas del usuario
    await cacheService.invalidatePattern(`search:${userId}:*`);
    
    // Invalidar estadísticas del usuario
    await cacheService.deleteCached(cacheService.keys.stats(userId));
    
    // Invalidar filtros del usuario
    await cacheService.deleteCached(`filters:${userId}`);
    
    // Invalidar el resultado específico
    await cacheService.deleteCached(cacheService.keys.result(resultId));
    
    console.log(`✅ Caché invalidado después de eliminar result ${resultId}`);
  } catch (error) {
    console.error('Error invalidando caché:', error.message);
  }
};

/**
 * Invalidar caché después de crear/actualizar una URL guardada
 */
const invalidateAfterUrlChange = async (userId) => {
  try {
    console.log(`🧹 Invalidando caché después de cambio en URLs (usuario: ${userId})`);
    
    // Invalidar estadísticas del usuario
    await cacheService.deleteCached(cacheService.keys.stats(userId));
    
    // Invalidar URLs del usuario
    await cacheService.deleteCached(cacheService.keys.userUrls(userId));
    
    console.log(`✅ Caché invalidado para URLs del usuario ${userId}`);
  } catch (error) {
    console.error('Error invalidando caché:', error.message);
  }
};

/**
 * Invalidar caché después de crear un AI rewrite
 */
const invalidateAfterAIRewrite = async (userId) => {
  try {
    console.log(`🧹 Invalidando caché después de AI rewrite (usuario: ${userId})`);
    
    // Invalidar estadísticas del usuario
    await cacheService.deleteCached(cacheService.keys.stats(userId));
    
    console.log(`✅ Caché invalidado para AI rewrite del usuario ${userId}`);
  } catch (error) {
    console.error('Error invalidando caché:', error.message);
  }
};

/**
 * Middleware Express para invalidar caché automáticamente
 * Usar después de operaciones de escritura
 */
const autoInvalidate = (type) => {
  return async (req, res, next) => {
    // Guardar el método send original
    const originalSend = res.send;
    
    // Sobrescribir el método send
    res.send = function (data) {
      // Restaurar el método original
      res.send = originalSend;
      
      // Si la respuesta fue exitosa, invalidar caché
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id;
        
        if (userId) {
          // Ejecutar invalidación en background (no bloquear respuesta)
          setImmediate(async () => {
            try {
              switch (type) {
                case 'scraping_result':
                  await invalidateAfterScrapingResult(userId, req.body?.resultId);
                  break;
                case 'delete_result':
                  await invalidateAfterDelete(userId, req.params?.id);
                  break;
                case 'url_change':
                  await invalidateAfterUrlChange(userId);
                  break;
                case 'ai_rewrite':
                  await invalidateAfterAIRewrite(userId);
                  break;
                default:
                  console.warn(`Tipo de invalidación desconocido: ${type}`);
              }
            } catch (error) {
              console.error('Error en auto-invalidación de caché:', error);
            }
          });
        }
      }
      
      // Enviar la respuesta original
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  invalidateAfterScrapingResult,
  invalidateAfterDelete,
  invalidateAfterUrlChange,
  invalidateAfterAIRewrite,
  autoInvalidate,
};
