const cacheService = require('../utils/cacheService');
const config = require('../config/env');
const { getRedisClient } = require('../utils/redisSingleton');

/**
 * Servicio de Caché para Scraping
 * Usa el Redis existente (cacheService) para cachear resultados de scraping
 */

/**
 * Obtener resultado de scraping del caché o ejecutar scraping
 * @param {string} url - URL a scrapear
 * @param {Function} scrapeFn - Función async que ejecuta el scraping
 * @param {number} ttl - Tiempo de vida en segundos (default: desde config)
 * @returns {Promise<Object>} Resultado del scraping (con flag fromCache)
 */
async function getOrScrape(url, scrapeFn, ttl = null) {
  const cacheTTL = ttl || config.scrapingCacheTTL;
  const cacheKey = `scrape:${url}`;
  
  try {
    const result = await cacheService.getCached(
      cacheKey,
      async () => {
        console.log(`🕷️ Scrapeando ${url}...`);
        const scrapedData = await scrapeFn(url);
        return {
          ...scrapedData,
          scrapedAt: new Date().toISOString(),
          fromCache: false
        };
      },
      cacheTTL
    );
    
    // Si viene del caché, agregar flag
    if (!result.fromCache) {
      result.fromCache = true;
    }
    
    return result;
    
  } catch (error) {
    console.error(`Error en getOrScrape para ${url}:`, error.message);
    // Si falla el caché, ejecutar scraping directamente
    return await scrapeFn(url);
  }
}

/**
 * Invalidar caché de una URL específica
 * @param {string} url - URL cuyo caché se invalidará
 * @returns {Promise<boolean>} True si se invalidó
 */
async function invalidateScraping(url) {
  const cacheKey = `scrape:${url}`;
  return await cacheService.deleteCached(cacheKey);
}

/**
 * Invalidar caché de múltiples URLs
 * @param {Array<string>} urls - Array de URLs
 * @returns {Promise<number>} Número de caches invalidados
 */
async function invalidateMultiple(urls) {
  let count = 0;
  for (const url of urls) {
    const deleted = await invalidateScraping(url);
    if (deleted) count++;
  }
  return count;
}

/**
 * Invalidar todo el caché de scraping
 * @returns {Promise<number>} Número de keys eliminadas
 */
async function invalidateAllScraping() {
  return await cacheService.invalidatePattern('scrape:*');
}

/**
 * Obtener estadísticas del caché de scraping
 * @returns {Promise<Object>} Estadísticas
 */
async function getScrapingCacheStats() {
  try {
    const keys = await cacheService.getKeys('scrape:*');
    const stats = await cacheService.getStats();
    
    return {
      totalScrapingKeys: keys.length,
      cacheEnabled: cacheService.isAvailable(),
      cacheTTL: config.scrapingCacheTTL,
      ...stats
    };
  } catch (error) {
    console.error('Error obteniendo stats de scraping cache:', error);
    return {
      totalScrapingKeys: 0,
      cacheEnabled: false,
      error: error.message
    };
  }
}

module.exports = {
  getOrScrape,
  invalidateScraping,
  invalidateMultiple,
  invalidateAllScraping,
  getScrapingCacheStats
};
