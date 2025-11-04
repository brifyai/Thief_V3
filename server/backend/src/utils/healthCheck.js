/**
 * Sistema de Health Checks para conexiones críticas
 * Monitoriza estado de Base de Datos, Redis y servicios externos
 */

const { getRedisClient } = require('./redisSingleton');
const { supabase } = require('../config/database');

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.lastResults = new Map();
    this.checkTimeout = 5000; // 5 segundos timeout por defecto
  }

  /**
   * Registra un health check
   * @param {string} name - Nombre del check
   * @param {Function} checkFunction - Función que retorna Promise<boolean>
   * @param {number} timeout - Timeout personalizado
   */
  registerCheck(name, checkFunction, timeout = this.checkTimeout) {
    this.checks.set(name, {
      fn: checkFunction,
      timeout,
      lastRun: null,
      lastResult: null
    });
  }

  /**
   * Ejecuta un health check específico
   * @param {string} name - Nombre del check
   * @returns {Promise<Object>} Resultado del check
   */
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        check.fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;
      const checkResult = {
        name,
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        details: result
      };

      check.lastRun = Date.now();
      check.lastResult = checkResult;
      this.lastResults.set(name, checkResult);

      return checkResult;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const checkResult = {
        name,
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error: error.message,
        details: null
      };

      check.lastRun = Date.now();
      check.lastResult = checkResult;
      this.lastResults.set(name, checkResult);

      return checkResult;
    }
  }

  /**
   * Ejecuta todos los health checks registrados
   * @returns {Promise<Object>} Resultados de todos los checks
   */
  async runAllChecks() {
    const results = {};
    const promises = [];

    for (const name of this.checks.keys()) {
      promises.push(
        this.runCheck(name)
          .then(result => { results[name] = result; })
          .catch(error => { 
            results[name] = {
              name,
              status: 'error',
              error: error.message,
              timestamp: new Date().toISOString()
            };
          })
      );
    }

    await Promise.all(promises);

    // Calcular estado general
    const healthyCount = Object.values(results).filter(r => r.status === 'healthy').length;
    const totalCount = Object.keys(results).length;
    const overallStatus = healthyCount === totalCount ? 'healthy' : 
                         healthyCount > 0 ? 'degraded' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      summary: {
        total: totalCount,
        healthy: healthyCount,
        unhealthy: totalCount - healthyCount,
        percentage: Math.round((healthyCount / totalCount) * 100)
      }
    };
  }

  /**
   * Obtiene último resultado de un check sin ejecutarlo
   * @param {string} name - Nombre del check
   * @returns {Object|null} Último resultado
   */
  getLastResult(name) {
    return this.lastResults.get(name) || null;
  }

  /**
   * Verifica si el sistema está saludable
   * @returns {boolean} True si todos los checks están saludables
   */
  async isHealthy() {
    const results = await this.runAllChecks();
    return results.status === 'healthy';
  }
}

// Crear instancia singleton
const healthCheckService = new HealthCheckService();

// Registrar checks automáticos para conexiones críticas

// Health check para PostgreSQL/Prisma
healthCheckService.registerCheck('database', async () => {
  try {
    // Query simple para verificar conexión
    await prisma.$queryRaw`SELECT 1 as health_check`;
    return { connected: true, database: 'postgresql' };
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}, 3000);

// Health check para Redis
healthCheckService.registerCheck('redis', async () => {
  try {
    const redis = getRedisClient();
    const testKey = 'health:check:test';
    const testValue = Date.now().toString();
    
    // Test de escritura/lectura
    await redis.setex(testKey, 5, testValue);
    const readValue = await redis.get(testKey);
    await redis.del(testKey);
    
    if (readValue !== testValue) {
      throw new Error('Redis read/write test failed');
    }
    
    return { 
      connected: true, 
      memory: await redis.info('memory'),
      clients: await redis.info('clients')
    };
  } catch (error) {
    throw new Error(`Redis connection failed: ${error.message}`);
  }
}, 3000);

// Health check para API de Chutes AI (si hay API key)
healthCheckService.registerCheck('groq_api', async () => {
  if (!process.env.GROQ_API_KEY) {
    return { status: 'skipped', reason: 'No API key configured' };
  }

  try {
    // Test simple con la API de Chutes AI
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // Test con modelo más liviano
    const response = await groq.chat.completions.create({
      model: process.env.AI_MODEL || 'llama3-8b-8192',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1,
      timeout: 5000
    });

    return { 
      connected: true, 
      model: process.env.AI_MODEL || 'llama3-8b-8192',
      response_time: response.usage?.total_tokens || 0
    };
  } catch (error) {
    throw new Error(`Chutes AI API connection failed: ${error.message}`);
  }
}, 8000);

// Health check para sistema de archivos
healthCheckService.registerCheck('filesystem', async () => {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    // Test de escritura/lectura en directorio temporal
    const testFile = path.join(process.cwd(), 'tmp', 'health-check-test.txt');
    const testContent = `health-check-${Date.now()}`;
    
    // Asegurar que directorio tmp existe
    await fs.mkdir(path.dirname(testFile), { recursive: true });
    
    // Test de escritura
    await fs.writeFile(testFile, testContent);
    
    // Test de lectura
    const readContent = await fs.readFile(testFile, 'utf8');
    
    // Limpiar
    await fs.unlink(testFile);
    
    if (readContent !== testContent) {
      throw new Error('Filesystem read/write test failed');
    }
    
    return { 
      accessible: true,
      tmp_dir: path.join(process.cwd(), 'tmp'),
      disk_space: await getDiskSpace()
    };
  } catch (error) {
    throw new Error(`Filesystem check failed: ${error.message}`);
  }
}, 2000);

/**
 * Obtiene información de espacio en disco (simplificado)
 */
async function getDiskSpace() {
  try {
    const fs = require('fs');
    const stats = fs.statSync(process.cwd());
    return { available: 'unknown', total: 'unknown' };
  } catch {
    return { available: 'unknown', total: 'unknown' };
  }
}

module.exports = {
  healthCheckService,
  HealthCheckService
};