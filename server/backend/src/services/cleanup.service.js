const prisma = require('../config/database');
const config = require('../config/env');

/**
 * Servicio de limpieza automática de noticias antiguas
 * 
 * Elimina noticias que superen el tiempo de retención configurado
 * para mantener la base de datos limpia y optimizada.
 */

/**
 * Ejecuta la limpieza de noticias antiguas
 * @returns {Promise<Object>} Resultado de la limpieza
 */
async function cleanupOldNews() {
  const startTime = Date.now();
  
  try {
    console.log('🧹 Iniciando limpieza de noticias antiguas...');
    console.log(`   Retención configurada: ${config.cleanupRetentionDays} días`);
    
    // Calcular fecha límite
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.cleanupRetentionDays);
    
    console.log(`   Eliminando noticias anteriores a: ${cutoffDate.toISOString()}`);
    
    // ⭐ NUEVO: Contar noticias que se eliminarán (EXCLUYENDO GUARDADAS)
    const countToDelete = await prisma.scraping_results.count({
      where: {
        created_at: {
          lt: cutoffDate
        },
        // ⭐ CLAVE: Solo contar las que NO están guardadas
        saved_articles: {
          none: {}
        }
      }
    });
    
    if (countToDelete === 0) {
      console.log('✅ No hay noticias antiguas para eliminar');
      return {
        success: true,
        deleted: 0,
        message: 'No hay noticias que eliminar',
        executionTime: Date.now() - startTime
      };
    }
    
    console.log(`   Noticias a eliminar: ${countToDelete}`);
    console.log(`   ⭐ Noticias guardadas serán preservadas`);
    
    // Obtener estadísticas antes de eliminar
    const stats = await getCleanupStats(cutoffDate);
    
    // ⭐ NUEVO: Eliminar solo noticias NO guardadas
    // Prisma eliminará automáticamente las relaciones en cascada:
    // - ai_rewrites (onDelete: Cascade)
    // - entity_mentions (onDelete: Cascade)
    const result = await prisma.scraping_results.deleteMany({
      where: {
        created_at: {
          lt: cutoffDate
        },
        // ⭐ CLAVE: Solo eliminar las que NO están guardadas
        saved_articles: {
          none: {}
        }
      }
    });
    
    const executionTime = Date.now() - startTime;
    
    console.log('✅ Limpieza completada exitosamente');
    console.log(`   Noticias eliminadas: ${result.count}`);
    console.log(`   ⭐ Noticias guardadas preservadas`);
    console.log(`   Tiempo de ejecución: ${executionTime}ms`);
    console.log(`   Estadísticas:`);
    console.log(`     - Por dominio: ${JSON.stringify(stats.byDomain)}`);
    console.log(`     - Por categoría: ${JSON.stringify(stats.byCategory)}`);
    
    // Registrar en logs (opcional: podrías crear una tabla de logs)
    await logCleanup({
      deleted: result.count,
      cutoffDate,
      retentionDays: config.cleanupRetentionDays,
      executionTime,
      stats,
      savedPreserved: true // ⭐ NUEVO: Indicar que se preservaron guardadas
    });
    
    return {
      success: true,
      deleted: result.count,
      cutoffDate: cutoffDate.toISOString(),
      retentionDays: config.cleanupRetentionDays,
      executionTime,
      stats,
      savedPreserved: true // ⭐ NUEVO
    };
    
  } catch (error) {
    console.error('❌ Error en limpieza de noticias:', error);
    
    return {
      success: false,
      deleted: 0,
      error: error.message,
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Obtiene estadísticas de las noticias que se eliminarán
 * @param {Date} cutoffDate - Fecha límite
 * @returns {Promise<Object>} Estadísticas
 */
async function getCleanupStats(cutoffDate) {
  try {
    // Agrupar por dominio
    const byDomain = await prisma.scraping_results.groupBy({
      by: ['domain'],
      where: {
        created_at: { lt: cutoffDate },
        domain: { not: null }
      },
      _count: true
    });
    
    // Agrupar por categoría
    const byCategory = await prisma.scraping_results.groupBy({
      by: ['category'],
      where: {
        created_at: { lt: cutoffDate },
        category: { not: null }
      },
      _count: true
    });
    
    return {
      byDomain: byDomain.reduce((acc, item) => {
        acc[item.domain] = item._count;
        return acc;
      }, {}),
      byCategory: byCategory.reduce((acc, item) => {
        acc[item.category] = item._count;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return { byDomain: {}, byCategory: {} };
  }
}

/**
 * Registra la ejecución de limpieza
 * @param {Object} data - Datos de la limpieza
 */
async function logCleanup(data) {
  try {
    // Podrías crear una tabla cleanup_logs para registrar esto
    // Por ahora solo lo logueamos en consola
    console.log('📊 Registro de limpieza:', {
      timestamp: new Date().toISOString(),
      ...data
    });
  } catch (error) {
    console.error('Error registrando limpieza:', error);
  }
}

/**
 * Obtiene información sobre noticias próximas a expirar
 * @param {number} daysWarning - Días de advertencia (default: 7)
 * @returns {Promise<Object>} Información de noticias próximas a expirar
 */
async function getExpiringNews(daysWarning = 7) {
  try {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() - (config.cleanupRetentionDays - daysWarning));
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.cleanupRetentionDays);
    
    const count = await prisma.scraping_results.count({
      where: {
        created_at: {
          gte: cutoffDate,
          lt: warningDate
        }
      }
    });
    
    return {
      count,
      daysUntilDeletion: daysWarning,
      warningDate: warningDate.toISOString()
    };
  } catch (error) {
    console.error('Error obteniendo noticias próximas a expirar:', error);
    return { count: 0, daysUntilDeletion: daysWarning, error: error.message };
  }
}

/**
 * Obtiene estadísticas generales de la base de datos
 * @returns {Promise<Object>} Estadísticas
 */
async function getDatabaseStats() {
  try {
    const total = await prisma.scraping_results.count();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.cleanupRetentionDays);
    
    const toDelete = await prisma.scraping_results.count({
      where: {
        created_at: { lt: cutoffDate }
      }
    });
    
    const toKeep = total - toDelete;
    
    // Obtener la noticia más antigua
    const oldest = await prisma.scraping_results.findFirst({
      orderBy: { created_at: 'asc' },
      select: { created_at: true }
    });
    
    // Obtener la noticia más reciente
    const newest = await prisma.scraping_results.findFirst({
      orderBy: { created_at: 'desc' },
      select: { created_at: true }
    });
    
    return {
      total,
      toDelete,
      toKeep,
      retentionDays: config.cleanupRetentionDays,
      cutoffDate: cutoffDate.toISOString(),
      oldestNews: oldest?.created_at?.toISOString() || null,
      newestNews: newest?.created_at?.toISOString() || null
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return { error: error.message };
  }
}

module.exports = {
  cleanupOldNews,
  getExpiringNews,
  getDatabaseStats,
  getCleanupStats
};
