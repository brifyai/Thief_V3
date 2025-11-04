/**
 * Singleton para conexión a Redis
 * Evita múltiples conexiones y centraliza la configuración
 */

const Redis = require('ioredis');

let redisInstance = null;
let circuitBreakerState = {
  failures: 0,
  lastFailureTime: null,
  isOpen: false,
  threshold: 10, // Abrir después de 10 fallos
  timeout: 60000, // Reintentar después de 1 minuto
  resetTime: 300000 // Reset completo después de 5 minutos
};

/**
 * Verificar y resetear circuit breaker si es necesario
 */
const checkCircuitBreaker = () => {
  const now = Date.now();
  
  // Si el circuit breaker está abierto, verificar si es tiempo de reintentar
  if (circuitBreakerState.isOpen) {
    const timeSinceFailure = now - circuitBreakerState.lastFailureTime;
    
    if (timeSinceFailure > circuitBreakerState.timeout) {
      console.log('🔄 Circuit breaker: Reintentando conexión a Redis...');
      circuitBreakerState.isOpen = false;
      circuitBreakerState.failures = 0;
      return true; // Permitir reintento
    }
    return false; // Mantener cerrado
  }
  
  // Reset automático después de resetTime sin fallos
  if (circuitBreakerState.lastFailureTime && 
      now - circuitBreakerState.lastFailureTime > circuitBreakerState.resetTime) {
    circuitBreakerState.failures = 0;
    circuitBreakerState.lastFailureTime = null;
  }
  
  return true;
};

/**
 * Registrar fallo en circuit breaker
 */
const recordFailure = () => {
  circuitBreakerState.failures++;
  circuitBreakerState.lastFailureTime = Date.now();
  
  if (circuitBreakerState.failures >= circuitBreakerState.threshold) {
    circuitBreakerState.isOpen = true;
    console.error(`🚨 Circuit breaker ABIERTO: ${circuitBreakerState.failures} fallos consecutivos`);
    console.log(`⏰ Se reintentará en ${circuitBreakerState.timeout / 1000} segundos`);
  }
};

/**
 * Obtiene la instancia única de Redis
 * @returns {Redis} Instancia de Redis
 */
const getRedisClient = () => {
  if (!redisInstance) {
    // Verificar circuit breaker
    if (circuitBreakerState.isOpen && !checkCircuitBreaker()) {
      console.warn('⚠️ Circuit breaker abierto - usando cliente mock');
      return createMockRedisClient();
    }
    
    // Si no hay REDIS_URL configurado, usar cliente mock
    if (!process.env.REDIS_URL || process.env.REDIS_URL === 'redis://localhost:6379') {
      console.warn('⚠️ Redis no configurado - usando cliente mock (funcionalidad limitada)');
      redisInstance = createMockRedisClient();
      return redisInstance;
    }

    // Configuración óptima para producción y desarrollo
    // ⚠️ IMPORTANTE: maxRetriesPerRequest debe ser null para BullMQ
    const redisConfig = {
      // Connection pooling y retry strategy
      maxRetriesPerRequest: null, // REQUERIDO por BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
      
      // Timeouts más cortos para fallar rápido
      connectTimeout: 3000, // 3 segundos para conectar
      commandTimeout: 2000,  // 2 segundos para comandos
      
      // Retry strategy - fallar rápido y usar mock
      retryStrategy: (times) => {
        if (times >= 1) {
          console.log(`❌ Redis no disponible - usando cliente mock`);
          return null; // No reintentar, usar mock
        }
        return null;
      },
      
      // Connection pooling para alto rendimiento
      family: 4,
      keepAlive: 30000,
      
      // Reconnection automática
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
      
      // Configuración de cluster si es necesario
      enableOfflineQueue: false,
      
      // Optimización de memoria
      maxmemoryPolicy: 'allkeys-lru',
    };

    redisInstance = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', redisConfig);

    // Manejar eventos de conexión
    redisInstance.on('connect', () => {
      console.log('✅ Redis conectado (singleton)');
      // Reset circuit breaker en conexión exitosa
      circuitBreakerState.failures = 0;
      circuitBreakerState.isOpen = false;
      circuitBreakerState.lastFailureTime = null;
    });

    redisInstance.on('error', (err) => {
      console.error('❌ Error en Redis (singleton):', err.message);
      recordFailure();
    });

    redisInstance.on('close', () => {
      console.warn('⚠️ Redis desconectado (singleton)');
      recordFailure();
    });
    
    redisInstance.on('reconnecting', () => {
      console.log('🔄 Redis reconectando...');
    });
    
    redisInstance.on('ready', () => {
      console.log('✅ Redis listo para usar');
    });
  }
  
  return redisInstance;
};

/**
 * Cierra la conexión a Redis
 */
const closeRedisConnection = async () => {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    console.log('🔌 Conexión Redis cerrada (singleton)');
  }
};

// Manejar cierre graceful
process.on('SIGTERM', closeRedisConnection);
process.on('SIGINT', closeRedisConnection);

/**
 * Crea un cliente Redis mock para desarrollo cuando Redis no está disponible
 */
const createMockRedisClient = () => {
  const mockClient = {
    status: 'ready',
    connected: true,
    
    // Métodos básicos que no hacen nada pero retornan promesas
    get: async (key) => null,
    set: async (key, value) => 'OK',
    setex: async (key, ttl, value) => 'OK',
    del: async (key) => 1,
    exists: async (key) => 0,
    expire: async (key, ttl) => 1,
    ttl: async (key) => -1,
    
    // Métodos de hash
    hget: async (key, field) => null,
    hset: async (key, field, value) => 1,
    hgetall: async (key) => ({}),
    hdel: async (key, field) => 1,
    
    // Métodos de lista
    lpush: async (key, ...values) => values.length,
    rpop: async (key) => null,
    lrange: async (key, start, stop) => [],
    
    // Métodos de set
    sadd: async (key, ...members) => members.length,
    srem: async (key, ...members) => 0,
    smembers: async (key) => [],
    
    // Métodos de información
    info: async (section) => '# Mock Redis info',
    
    // Event handlers (no hacen nada)
    on: (event, handler) => mockClient,
    once: (event, handler) => mockClient,
    off: (event, handler) => mockClient,
    
    // Conexión
    connect: async () => {},
    disconnect: async () => {},
    quit: async () => 'OK',
    ping: async () => 'PONG',
    
    // Info para health check
    dbsize: async () => 0,
    memory: async () => ({ used_memory: 0, used_memory_human: '0B' }),
    
    // Transacciones
    multi: () => ({
      exec: async () => [],
      get: () => mockClient.multi(),
      set: () => mockClient.multi(),
      del: () => mockClient.multi(),
    }),
  };
  
  console.log('🎭 Redis mock client creado para desarrollo');
  return mockClient;
};

/**
 * Health check de Redis con latencia
 * @returns {Promise<Object>} Estado de salud
 */
const healthCheck = async () => {
  const client = getRedisClient();
  const startTime = Date.now();
  
  try {
    await client.ping();
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      latency: `${latency}ms`,
      circuitBreaker: {
        isOpen: circuitBreakerState.isOpen,
        failures: circuitBreakerState.failures,
        threshold: circuitBreakerState.threshold
      },
      connected: client.status === 'ready',
      type: client.status === 'ready' ? 'redis' : 'mock'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      circuitBreaker: {
        isOpen: circuitBreakerState.isOpen,
        failures: circuitBreakerState.failures,
        threshold: circuitBreakerState.threshold
      },
      connected: false,
      type: 'mock'
    };
  }
};

/**
 * Obtener estado del circuit breaker
 * @returns {Object} Estado actual
 */
const getCircuitBreakerState = () => {
  return { ...circuitBreakerState };
};

/**
 * Reset manual del circuit breaker
 */
const resetCircuitBreaker = () => {
  circuitBreakerState.failures = 0;
  circuitBreakerState.isOpen = false;
  circuitBreakerState.lastFailureTime = null;
  console.log('🔄 Circuit breaker reseteado manualmente');
};

module.exports = {
  getRedisClient,
  closeRedisConnection,
  createMockRedisClient,
  healthCheck,
  getCircuitBreakerState,
  resetCircuitBreaker
};