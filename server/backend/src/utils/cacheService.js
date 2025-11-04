const crypto = require('crypto');
const { getRedisClient } = require('./redisSingleton');

/**
 * Servicio de Caché con Redis
 * Optimiza búsquedas y reduce carga en PostgreSQL
 */

// Usar singleton de Redis
const redis = getRedisClient();

// Estado del servicio
let isRedisAvailable = false;
let cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
  sets: 0,
  deletes: 0,
  startTime: Date.now(),
  lastReset: Date.now()
};

// Configuración de TTL por tipo de contenido
const TTL_CONFIG = {
  scraping: 3600,      // 1 hora - Resultados de scraping
  config: 600,         // 10 minutos - Configuraciones de sitios
  token: 300,          // 5 minutos - Tokens de autenticación
  static: 86400,       // 24 horas - Datos estáticos
  search: 1800,        // 30 minutos - Búsquedas
  stats: 300,          // 5 minutos - Estadísticas
  user: 600,           // 10 minutos - Datos de usuario
  default: 300         // 5 minutos - Por defecto
};

// Límites para prevenir memory leaks
const STATS_RESET_THRESHOLD = 1000000; // Reset después de 1M operaciones
const STATS_RESET_INTERVAL = 3600000;  // Reset cada hora

// FIX: Lazy connect - no conectar inmediatamente
// Redis se conectará automáticamente al primer comando
// Esto evita timeouts en la inicialización
redis.on('ready', () => {
  isRedisAvailable = true;
  console.log('✅ Cache Redis conectado');
});

redis.on('error', (error) => {
  isRedisAvailable = false;
  if (!error.message.includes('ECONNREFUSED')) {
    console.warn('⚠️ Cache Redis error:', error.message);
  }
});

// Verificar estado inicial de forma asíncrona (no bloquea la inicialización)
// Redis se conectará automáticamente al primer comando (lazyConnect: true)
setTimeout(() => {
  if (redis.status === 'ready') {
    isRedisAvailable = true;
  } else {
    // No forzar conexión - dejar que sea lazy
    isRedisAvailable = false;
    console.log('💡 Cache Redis en modo lazy - se conectará al primer uso');
  }
}, 100);

// Manejar eventos de Redis
redis.on('error', (err) => {
  isRedisAvailable = false;
  console.error('❌ Error en cache Redis:', err.message);
  cacheStats.errors++;
  checkStatsReset();
});

redis.on('connect', () => {
  isRedisAvailable = true;
  console.log('✅ Cache Redis reconectado');
});

redis.on('close', () => {
  isRedisAvailable = false;
  console.warn('⚠️ Cache Redis desconectado');
});

/**
 * Verificar y resetear estadísticas si es necesario
 */
const checkStatsReset = () => {
  const totalOps = cacheStats.hits + cacheStats.misses + cacheStats.errors;
  const timeSinceReset = Date.now() - cacheStats.lastReset;
  
  if (totalOps > STATS_RESET_THRESHOLD || timeSinceReset > STATS_RESET_INTERVAL) {
    console.log(`🔄 Reseteando estadísticas de caché (ops: ${totalOps}, tiempo: ${Math.round(timeSinceReset / 1000)}s)`);
    const oldStats = { ...cacheStats };
    cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      sets: 0,
      deletes: 0,
      startTime: cacheStats.startTime,
      lastReset: Date.now(),
      previousPeriod: {
        hits: oldStats.hits,
        misses: oldStats.misses,
        errors: oldStats.errors,
        hitRate: oldStats.hits + oldStats.misses > 0
          ? ((oldStats.hits / (oldStats.hits + oldStats.misses)) * 100).toFixed(2) + '%'
          : '0%'
      }
    };
  }
};

/**
 * Obtener TTL apropiado según el tipo de contenido
 * @param {string} key - Key del caché
 * @param {number} customTTL - TTL personalizado (opcional)
 * @returns {number} TTL en segundos
 */
const getTTL = (key, customTTL = null) => {
  if (customTTL) return customTTL;
  
  // Detectar tipo por prefijo de key
  if (key.startsWith('scrape:')) return TTL_CONFIG.scraping;
  if (key.startsWith('config:')) return TTL_CONFIG.config;
  if (key.startsWith('token:')) return TTL_CONFIG.token;
  if (key.startsWith('static:')) return TTL_CONFIG.static;
  if (key.startsWith('search:')) return TTL_CONFIG.search;
  if (key.startsWith('stats:')) return TTL_CONFIG.stats;
  if (key.startsWith('user:')) return TTL_CONFIG.user;
  
  return TTL_CONFIG.default;
};

/**
 * Generar hash MD5 de un objeto para usar como key
 * @param {Object} obj - Objeto a hashear
 * @returns {string} Hash MD5
 */
const hashObject = (obj) => {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('md5').update(str).digest('hex');
};

/**
 * Generar key de caché consistente
 * @param {string} prefix - Prefijo (ej: 'search', 'result', 'stats')
 * @param {Object} params - Parámetros para la key
 * @returns {string} Key de caché
 */
const generateKey = (prefix, params = {}) => {
  if (typeof params === 'string' || typeof params === 'number') {
    return `${prefix}:${params}`;
  }
  
  const hash = hashObject(params);
  return `${prefix}:${hash}`;
};

/**
 * Obtener datos del caché o ejecutar función si no existe
 * @param {string} key - Key del caché
 * @param {Function} fetchFn - Función async que obtiene los datos si no están en caché
 * @param {number} ttl - Tiempo de vida en segundos (default: 300 = 5 minutos)
 * @returns {Promise<any>} Datos del caché o de la función
 */
const getCached = async (key, fetchFn, ttl = null) => {
  const effectiveTTL = getTTL(key, ttl);
  // Si Redis no está disponible, ejecutar función directamente
  if (!isRedisAvailable) {
    console.log(`⚠️ Cache miss (Redis no disponible): ${key}`);
    cacheStats.misses++;
    return await fetchFn();
  }

  try {
    // Intentar obtener del caché
    const cached = await redis.get(key);
    
    if (cached) {
      // Cache hit
      console.log(`✅ Cache hit: ${key}`);
      cacheStats.hits++;
      checkStatsReset();
      return JSON.parse(cached);
    }
    
    // Cache miss - ejecutar función
    console.log(`❌ Cache miss: ${key}`);
    cacheStats.misses++;
    checkStatsReset();
    
    const data = await fetchFn();
    
    // Guardar en caché (fire and forget)
    setCached(key, data, effectiveTTL).catch(err => {
      console.error(`Error guardando en caché ${key}:`, err.message);
    });
    
    return data;
    
  } catch (error) {
    console.error(`Error obteniendo del caché ${key}:`, error.message);
    cacheStats.errors++;
    checkStatsReset();
    
    // Fallback: ejecutar función directamente
    return await fetchFn();
  }
};

/**
 * Guardar datos en caché
 * @param {string} key - Key del caché
 * @param {any} data - Datos a guardar
 * @param {number} ttl - Tiempo de vida en segundos
 * @returns {Promise<boolean>} True si se guardó exitosamente
 */
const setCached = async (key, data, ttl = null) => {
  const effectiveTTL = getTTL(key, ttl);
  if (!isRedisAvailable) {
    return false;
  }

  try {
    const serialized = JSON.stringify(data);
    await redis.setex(key, effectiveTTL, serialized);
    
    console.log(`💾 Cache set: ${key} (TTL: ${effectiveTTL}s)`);
    cacheStats.sets++;
    checkStatsReset();
    
    return true;
  } catch (error) {
    console.error(`Error guardando en caché ${key}:`, error.message);
    cacheStats.errors++;
    checkStatsReset();
    return false;
  }
};

/**
 * Eliminar una key específica del caché
 * @param {string} key - Key a eliminar
 * @returns {Promise<boolean>} True si se eliminó
 */
const deleteCached = async (key) => {
  if (!isRedisAvailable) {
    return false;
  }

  try {
    const result = await redis.del(key);
    
    if (result > 0) {
      console.log(`🗑️ Cache deleted: ${key}`);
      cacheStats.deletes++;
      checkStatsReset();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error eliminando del caché ${key}:`, error.message);
    cacheStats.errors++;
    checkStatsReset();
    return false;
  }
};

/**
 * Invalidar múltiples keys que coincidan con un patrón
 * @param {string} pattern - Patrón de búsqueda (ej: 'search:user:123:*')
 * @returns {Promise<number>} Número de keys eliminadas
 */
const invalidatePattern = async (pattern) => {
  if (!isRedisAvailable) {
    return 0;
  }

  try {
    // Buscar todas las keys que coincidan con el patrón
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      console.log(`🔍 No se encontraron keys para el patrón: ${pattern}`);
      return 0;
    }
    
    // Eliminar todas las keys encontradas
    const result = await redis.del(...keys);
    
    console.log(`🗑️ Cache invalidated: ${result} keys eliminadas (patrón: ${pattern})`);
    cacheStats.deletes += result;
    checkStatsReset();
    
    return result;
  } catch (error) {
    console.error(`Error invalidando patrón ${pattern}:`, error.message);
    cacheStats.errors++;
    checkStatsReset();
    return 0;
  }
};

/**
 * Invalidar todo el caché de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<number>} Número de keys eliminadas
 */
const invalidateUser = async (userId) => {
  console.log(`🧹 Invalidando caché del usuario ${userId}...`);
  
  const patterns = [
    `search:${userId}:*`,
    `stats:${userId}`,
    `user:${userId}:*`,
  ];
  
  let totalDeleted = 0;
  
  for (const pattern of patterns) {
    const deleted = await invalidatePattern(pattern);
    totalDeleted += deleted;
  }
  
  console.log(`✅ Total de keys eliminadas para usuario ${userId}: ${totalDeleted}`);
  return totalDeleted;
};

/**
 * Limpiar todo el caché
 * @returns {Promise<boolean>} True si se limpió exitosamente
 */
const clearAll = async () => {
  if (!isRedisAvailable) {
    return false;
  }

  try {
    await redis.flushdb();
    console.log('🧹 Todo el caché ha sido limpiado');
    
    // Resetear estadísticas
    cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      sets: 0,
      deletes: 0,
      startTime: Date.now(),
      lastReset: Date.now()
    };
    
    return true;
  } catch (error) {
    console.error('Error limpiando todo el caché:', error.message);
    cacheStats.errors++;
    checkStatsReset();
    return false;
  }
};

/**
 * Obtener estadísticas del caché
 * @returns {Promise<Object>} Estadísticas
 */
const getStats = async () => {
  const totalOps = cacheStats.hits + cacheStats.misses;
  const uptime = Date.now() - cacheStats.startTime;
  const periodTime = Date.now() - cacheStats.lastReset;
  
  const stats = {
    ...cacheStats,
    isAvailable: isRedisAvailable,
    hitRate: totalOps > 0
      ? ((cacheStats.hits / totalOps) * 100).toFixed(2) + '%'
      : '0%',
    totalOperations: totalOps,
    uptime: `${Math.round(uptime / 1000)}s`,
    periodTime: `${Math.round(periodTime / 1000)}s`,
    opsPerSecond: periodTime > 0 ? (totalOps / (periodTime / 1000)).toFixed(2) : '0',
    ttlConfig: TTL_CONFIG
  };

  if (isRedisAvailable) {
    try {
      const info = await redis.info('stats');
      const dbSize = await redis.dbsize();
      
      stats.totalKeys = dbSize;
      stats.redisInfo = info;
    } catch (error) {
      console.error('Error obteniendo info de Redis:', error.message);
    }
  }

  return stats;
};

/**
 * Obtener todas las keys que coincidan con un patrón
 * @param {string} pattern - Patrón de búsqueda
 * @returns {Promise<Array>} Array de keys
 */
const getKeys = async (pattern = '*') => {
  if (!isRedisAvailable) {
    return [];
  }

  try {
    const keys = await redis.keys(pattern);
    return keys;
  } catch (error) {
    console.error('Error obteniendo keys:', error.message);
    return [];
  }
};

/**
 * Verificar si una key existe en el caché
 * @param {string} key - Key a verificar
 * @returns {Promise<boolean>} True si existe
 */
const exists = async (key) => {
  if (!isRedisAvailable) {
    return false;
  }

  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Error verificando existencia de key:', error.message);
    return false;
  }
};

/**
 * Obtener TTL restante de una key en Redis
 * @param {string} key - Key a consultar
 * @returns {Promise<number>} Segundos restantes (-1 si no tiene TTL, -2 si no existe)
 */
const getKeyTTL = async (key) => {
  if (!isRedisAvailable) {
    return -2;
  }

  try {
    const ttl = await redis.ttl(key);
    return ttl;
  } catch (error) {
    console.error('Error obteniendo TTL:', error.message);
    return -2;
  }
};

/**
 * Helpers para generar keys específicas
 */
const keys = {
  // Búsquedas
  search: (userId, filters) => generateKey('search', { userId, ...filters }),
  
  // Resultado individual
  result: (resultId) => `result:${resultId}`,
  
  // Estadísticas de usuario
  stats: (userId) => `stats:${userId}`,
  
  // Contenido por URL hash
  content: (urlHash) => `content:${urlHash}`,
  
  // Usuario completo
  user: (userId) => `user:${userId}`,
  
  // URLs guardadas de usuario
  userUrls: (userId) => `user:${userId}:urls`,
};

/**
 * Cerrar conexión a Redis
 */
const close = async () => {
  try {
    await redis.quit();
    console.log('🔌 Cache Redis desconectado');
  } catch (error) {
    console.error('Error cerrando conexión a Redis:', error.message);
  }
};

// Manejar cierre graceful
process.on('SIGTERM', close);
process.on('SIGINT', close);

module.exports = {
  // Funciones principales
  getCached,
  setCached,
  deleteCached,
  invalidatePattern,
  invalidateUser,
  clearAll,
  
  // Utilidades
  getStats,
  getKeys,
  exists,
  getKeyTTL, // Obtener TTL restante de una key
  generateKey,
  hashObject,
  
  // Helpers de keys
  keys,
  
  // Estado
  isAvailable: () => isRedisAvailable,
  
  // Configuración
  TTL_CONFIG,
  
  // Mantenimiento
  checkStatsReset,
  
  // Cerrar conexión
  close,
};
