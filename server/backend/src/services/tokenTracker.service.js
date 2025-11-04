// ========================================
// TOKEN TRACKER SERVICE
// Monitoreo y tracking de uso de tokens IA
// ========================================

const { supabase } = require('../config/database');
const { getRedisClient } = require('../utils/redisSingleton');

// Precios por modelo (en USD por 1M tokens)
const MODEL_PRICING = {
  'llama3-8b-8192': {
    input: 0.05,   // $0.05 por 1M tokens input
    output: 0.08   // $0.08 por 1M tokens output
  },
  'llama3-70b-8192': {
    input: 0.59,
    output: 0.79
  },
  'mixtral-8x7b-32768': {
    input: 0.27,
    output: 0.27
  },
  'gemma-7b-it': {
    input: 0.07,
    output: 0.07
  },
  'llama-3.1-70b-versatile': {
    input: 0.59,
    output: 0.79
  },
  'llama-3.1-8b-instant': {
    input: 0.05,
    output: 0.08
  }
};

class TokenTracker {
  constructor() {
    this.redisClient = null;
    this.enabled = true;
    this.batchSize = 10; // Guardar en BD cada 10 operaciones
    this.pendingLogs = [];
    this.flushInterval = null;
  }

  /**
   * Inicializa el servicio
   */
  async initialize() {
    try {
      this.redisClient = await getRedisClient();
      console.log('📊 Token Tracker inicializado con Redis');
      
      // Flush automático cada 30 segundos
      this.flushInterval = setInterval(() => {
        this.flushLogs();
      }, 30000);
      
    } catch (error) {
      console.warn('⚠️ Token Tracker sin Redis, solo BD');
      this.redisClient = null;
    }
  }

  /**
   * Registrar uso de IA
   */
  async trackUsage(data) {
    if (!this.enabled) {
      console.log('⚠️  Token Tracker deshabilitado');
      return null;
    }

    try {
      const {
        operationType,
        operationId = null,
        userId = null,
        inputTokens,
        outputTokens,
        modelUsed,
        promptLength = null,
        responseLength = null,
        cacheHit = false,
        endpoint = null,
        ipAddress = null,
        userAgent = null,
        durationMs = null
      } = data;
      
      console.log(`📊 trackUsage llamado: ${operationType}, tokens: ${inputTokens + outputTokens}`);

      // Calcular costos
      const pricing = MODEL_PRICING[modelUsed] || MODEL_PRICING['llama3-8b-8192'];
      const inputCost = (inputTokens / 1000000) * pricing.input;
      const outputCost = (outputTokens / 1000000) * pricing.output;
      const totalCost = inputCost + outputCost;

      const logEntry = {
        operation_type: operationType,
        operation_id: operationId,
        user_id: userId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        input_cost: inputCost,
        output_cost: outputCost,
        total_cost: totalCost,
        model_used: modelUsed,
        prompt_length: promptLength,
        response_length: responseLength,
        cache_hit: cacheHit,
        endpoint: endpoint,
        ip_address: ipAddress,
        user_agent: userAgent,
        duration_ms: durationMs
      };

      // Guardar en batch
      this.pendingLogs.push(logEntry);

      if (this.pendingLogs.length >= this.batchSize) {
        await this.flushLogs();
      }

      // Actualizar estadísticas en Redis (tiempo real)
      await this.updateRealtimeStats(operationType, inputTokens + outputTokens, totalCost, cacheHit);

      // Verificar alertas
      await this.checkAlerts(totalCost);

      return {
        tokens: inputTokens + outputTokens,
        cost: totalCost,
        cached: cacheHit
      };
    } catch (error) {
      console.error('Error en trackUsage:', error);
      return null;
    }
  }

  /**
   * Guardar logs pendientes en BD
   */
  async flushLogs() {
    if (this.pendingLogs.length === 0) return;

    const logsToSave = [...this.pendingLogs];
    this.pendingLogs = [];

    try {
      await prisma.aiUsageLog.createMany({
        data: logsToSave,
        skipDuplicates: true
      });

      console.log(`📊 ${logsToSave.length} logs de IA guardados en BD`);
    } catch (error) {
      console.error('Error guardando logs de IA:', error);
      // Reintentar una vez
      try {
        await prisma.aiUsageLog.createMany({
          data: logsToSave,
          skipDuplicates: true
        });
      } catch (retryError) {
        console.error('Error en reintento de logs:', retryError);
      }
    }
  }

  /**
   * Actualizar estadísticas en tiempo real (Redis)
   */
  async updateRealtimeStats(operationType, tokens, cost, cacheHit) {
    // ✅ FIX: Verificar que Redis esté disponible y tenga los métodos necesarios
    if (!this.redisClient || typeof this.redisClient.hincrby !== 'function') {
      return; // Redis no disponible o es cliente mock
    }

    const today = new Date().toISOString().split('T')[0];
    const key = `ai_stats:${today}`;

    try {
      // Incrementar contadores
      await this.redisClient.hincrby(key, 'total_operations', 1);
      await this.redisClient.hincrbyfloat(key, 'total_tokens', tokens);
      await this.redisClient.hincrbyfloat(key, 'total_cost', cost);
      
      // Por tipo de operación
      await this.redisClient.hincrby(key, `${operationType}_operations`, 1);
      await this.redisClient.hincrbyfloat(key, `${operationType}_tokens`, tokens);
      await this.redisClient.hincrbyfloat(key, `${operationType}_cost`, cost);
      
      // Caché
      if (cacheHit) {
        await this.redisClient.hincrby(key, 'cache_hits', 1);
      } else {
        await this.redisClient.hincrby(key, 'cache_misses', 1);
      }

      // Expirar después de 7 días
      await this.redisClient.expire(key, 7 * 24 * 60 * 60);
    } catch (error) {
      console.error('Error actualizando stats en Redis:', error);
    }
  }

  /**
   * Verificar alertas de costo
   */
  async checkAlerts(currentCost) {
    if (!this.redisClient) return;

    const today = new Date().toISOString().split('T')[0];
    const key = `ai_stats:${today}`;

    try {
      const totalCostStr = await this.redisClient.hget(key, 'total_cost');
      const totalCost = parseFloat(totalCostStr || 0);

      // Alerta: Límite diario ($10 USD)
      if (totalCost > 10 && totalCost - currentCost <= 10) {
        await this.createAlert({
          alert_type: 'daily_limit',
          threshold: 10,
          current_value: totalCost,
          message: `Límite diario de $10 USD excedido. Consumo actual: $${totalCost.toFixed(2)}`,
          severity: 'warning'
        });
      }

      // Alerta: Límite crítico ($50 USD)
      if (totalCost > 50 && totalCost - currentCost <= 50) {
        await this.createAlert({
          alert_type: 'daily_limit',
          threshold: 50,
          current_value: totalCost,
          message: `⚠️ CRÍTICO: Límite de $50 USD excedido. Consumo: $${totalCost.toFixed(2)}`,
          severity: 'critical'
        });
      }

      // Alerta: Spike (operación muy costosa)
      if (currentCost > 1) {
        await this.createAlert({
          alert_type: 'spike',
          threshold: 1,
          current_value: currentCost,
          message: `Operación costosa detectada: $${currentCost.toFixed(4)} USD`,
          severity: 'info'
        });
      }
    } catch (error) {
      console.error('Error verificando alertas:', error);
    }
  }

  /**
   * Crear alerta
   */
  async createAlert(alertData) {
    try {
      // Verificar si ya existe una alerta similar reciente (última hora)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const existingAlert = await prisma.aiCostAlert.findFirst({
        where: {
          alert_type: alertData.alert_type,
          threshold: alertData.threshold,
          created_at: {
            gte: oneHourAgo
          },
          resolved: false
        }
      });

      if (existingAlert) {
        // Ya existe una alerta similar, no crear duplicado
        return;
      }

      await prisma.aiCostAlert.create({
        data: alertData
      });
      
      console.log(`🚨 Alerta creada: ${alertData.message}`);
    } catch (error) {
      console.error('Error creando alerta:', error);
    }
  }

  /**
   * Obtener estadísticas del día
   */
  async getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    const key = `ai_stats:${today}`;

    if (!this.redisClient) {
      // Fallback a BD
      return await this.getStatsFromDB(today);
    }

    try {
      const stats = await this.redisClient.hgetall(key);
      
      if (!stats || Object.keys(stats).length === 0) {
        // No hay datos en Redis, obtener de BD
        return await this.getStatsFromDB(today);
      }

      const cacheHits = parseInt(stats.cache_hits || 0);
      const cacheMisses = parseInt(stats.cache_misses || 0);
      const totalCacheOps = cacheHits + cacheMisses;

      return {
        total_operations: parseInt(stats.total_operations || 0),
        total_tokens: parseInt(stats.total_tokens || 0),
        total_cost: parseFloat(stats.total_cost || 0),
        cache_hits: cacheHits,
        cache_misses: cacheMisses,
        cache_hit_rate: totalCacheOps > 0 ? (cacheHits / totalCacheOps) * 100 : 0,
        by_operation: {
          search: {
            operations: parseInt(stats.search_operations || 0),
            tokens: parseInt(stats.search_tokens || 0),
            cost: parseFloat(stats.search_cost || 0)
          },
          sentiment: {
            operations: parseInt(stats.sentiment_operations || 0),
            tokens: parseInt(stats.sentiment_tokens || 0),
            cost: parseFloat(stats.sentiment_cost || 0)
          },
          entity: {
            operations: parseInt(stats.entity_operations || 0),
            tokens: parseInt(stats.entity_tokens || 0),
            cost: parseFloat(stats.entity_cost || 0)
          },
          clustering: {
            operations: parseInt(stats.clustering_operations || 0),
            tokens: parseInt(stats.clustering_tokens || 0),
            cost: parseFloat(stats.clustering_cost || 0)
          },
          synonym: {
            operations: parseInt(stats.synonym_operations || 0),
            tokens: parseInt(stats.synonym_tokens || 0),
            cost: parseFloat(stats.synonym_cost || 0)
          },
          pattern: {
            operations: parseInt(stats.pattern_operations || 0),
            tokens: parseInt(stats.pattern_tokens || 0),
            cost: parseFloat(stats.pattern_cost || 0)
          },
          other: {
            operations: parseInt(stats.other_operations || 0),
            tokens: parseInt(stats.other_tokens || 0),
            cost: parseFloat(stats.other_cost || 0)
          }
        }
      };
    } catch (error) {
      console.error('Error obteniendo stats de Redis:', error);
      return await this.getStatsFromDB(today);
    }
  }

  /**
   * Obtener estadísticas de BD
   */
  async getStatsFromDB(date) {
    try {
      // Crear fechas en UTC para el día especificado
      const startDate = new Date(date + 'T00:00:00.000Z');
      const endDate = new Date(date + 'T23:59:59.999Z');

      const logs = await prisma.aiUsageLog.findMany({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // Agregar datos
      const stats = {
        total_operations: logs.length,
        total_tokens: logs.reduce((sum, log) => sum + log.total_tokens, 0),
        total_cost: logs.reduce((sum, log) => sum + log.total_cost, 0),
        cache_hits: logs.filter(log => log.cache_hit).length,
        cache_misses: logs.filter(log => !log.cache_hit).length,
        by_operation: {}
      };

      // Agrupar por tipo
      const types = ['search', 'sentiment', 'entity', 'clustering', 'synonym', 'pattern', 'other'];
      types.forEach(type => {
        const typeLogs = logs.filter(log => log.operation_type === type);
        stats.by_operation[type] = {
          operations: typeLogs.length,
          tokens: typeLogs.reduce((sum, log) => sum + log.total_tokens, 0),
          cost: typeLogs.reduce((sum, log) => sum + log.total_cost, 0)
        };
      });

      const totalCacheOps = stats.cache_hits + stats.cache_misses;
      stats.cache_hit_rate = totalCacheOps > 0 
        ? (stats.cache_hits / totalCacheOps) * 100 
        : 0;

      return stats;
    } catch (error) {
      console.error('Error obteniendo stats de BD:', error);
      return null;
    }
  }

  /**
   * Calcular costo estimado
   */
  calculateEstimatedCost(tokens, modelUsed = 'llama3-8b-8192', isOutput = false) {
    const pricing = MODEL_PRICING[modelUsed] || MODEL_PRICING['llama3-8b-8192'];
    const rate = isOutput ? pricing.output : pricing.input;
    return (tokens / 1000000) * rate;
  }

  /**
   * Cleanup al cerrar
   */
  async shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushLogs();
    console.log('📊 Token Tracker cerrado correctamente');
  }
}

// Singleton
const tokenTracker = new TokenTracker();

module.exports = {
  tokenTracker,
  MODEL_PRICING
};
