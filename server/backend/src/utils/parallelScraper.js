const config = require('../config/env');

/**
 * Utilidad para Scraping Paralelo
 * Ejecuta múltiples tareas de scraping en paralelo con límite de concurrencia
 */

/**
 * Ejecutar funciones en paralelo con límite de concurrencia
 * @param {Array<Function>} tasks - Array de funciones async
 * @param {number} limit - Límite de concurrencia (default: desde config)
 * @returns {Promise<Array>} Array de resultados
 */
async function parallelLimit(tasks, limit = null) {
  const concurrency = limit || config.scrapingConcurrency;
  
  console.log(`🚀 Ejecutando ${tasks.length} tareas con concurrencia ${concurrency}`);
  
  const results = [];
  const executing = [];
  
  for (const task of tasks) {
    const promise = task()
      .then(result => {
        executing.splice(executing.indexOf(promise), 1);
        return result;
      })
      .catch(error => {
        executing.splice(executing.indexOf(promise), 1);
        console.error('Error en tarea paralela:', error.message);
        return { error: error.message, success: false };
      });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

/**
 * Scrapear múltiples URLs en paralelo
 * @param {Array<string>} urls - Array de URLs a scrapear
 * @param {Function} scrapeFn - Función async que scrapea una URL
 * @param {number} concurrency - Límite de concurrencia (default: desde config)
 * @returns {Promise<Array>} Array de resultados
 */
async function scrapeParallel(urls, scrapeFn, concurrency = null) {
  if (!urls || urls.length === 0) {
    console.log('⚠️ No hay URLs para scrapear');
    return [];
  }
  
  const limit = concurrency || config.scrapingConcurrency;
  
  console.log(`🕷️ Scrapeando ${urls.length} URLs con concurrencia ${limit}`);
  const startTime = Date.now();
  
  // Crear tareas
  const tasks = urls.map(url => () => scrapeFn(url));
  
  // Ejecutar en paralelo
  const results = await parallelLimit(tasks, limit);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successful = results.filter(r => r && r.success !== false).length;
  const failed = results.length - successful;
  
  console.log(`✅ Scraping paralelo completado en ${duration}s`);
  console.log(`   Exitosos: ${successful} | Fallidos: ${failed}`);
  
  return results;
}

/**
 * Scrapear URLs en lotes (batches)
 * @param {Array<string>} urls - Array de URLs
 * @param {Function} scrapeFn - Función de scraping
 * @param {number} batchSize - Tamaño del lote
 * @param {number} delayBetweenBatches - Delay en ms entre lotes
 * @returns {Promise<Array>} Resultados de todos los lotes
 */
async function scrapeInBatches(urls, scrapeFn, batchSize = 10, delayBetweenBatches = 1000) {
  const allResults = [];
  const batches = [];
  
  // Dividir en lotes
  for (let i = 0; i < urls.length; i += batchSize) {
    batches.push(urls.slice(i, i + batchSize));
  }
  
  console.log(`📦 Procesando ${urls.length} URLs en ${batches.length} lotes de ${batchSize}`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n🔄 Procesando lote ${i + 1}/${batches.length} (${batch.length} URLs)`);
    
    const batchResults = await scrapeParallel(batch, scrapeFn);
    allResults.push(...batchResults);
    
    // Delay entre lotes (excepto el último)
    if (i < batches.length - 1 && delayBetweenBatches > 0) {
      console.log(`⏳ Esperando ${delayBetweenBatches}ms antes del siguiente lote...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return allResults;
}

/**
 * Obtener estadísticas de resultados de scraping paralelo
 * @param {Array} results - Resultados del scraping
 * @returns {Object} Estadísticas
 */
function getScrapingStats(results) {
  const total = results.length;
  const successful = results.filter(r => r && r.success !== false && !r.error).length;
  const failed = total - successful;
  const successRate = total > 0 ? ((successful / total) * 100).toFixed(2) : 0;
  
  return {
    total,
    successful,
    failed,
    successRate: `${successRate}%`
  };
}

module.exports = {
  parallelLimit,
  scrapeParallel,
  scrapeInBatches,
  getScrapingStats
};
