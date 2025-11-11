// ========================================
// AI USAGE CONTROLLER
// Endpoints para monitoreo de uso de tokens IA
// ========================================

const { supabase } = require('../config/database');
const { tokenTracker, MODEL_PRICING } = require('../services/tokenTracker.service');

/**
 * GET /api/ai-usage/stats/today
 * Estadísticas del día actual
 */
const getTodayStats = async (req, res) => {
  try {
    const stats = await tokenTracker.getTodayStats();
    
    if (!stats) {
      return res.status(500).json({
        success: false,
        error: 'No se pudieron obtener las estadísticas'
      });
    }
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del día:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
};

/**
 * GET /api/ai-usage/stats/range
 * Estadísticas por rango de fechas
 */
const getStatsRange = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren start_date y end_date'
      });
    }
    
    const startDate = new Date(start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999);
    
    // Usar Supabase en lugar de Prisma
    const { data: logs, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (error) {
      console.error('Error obteniendo logs de Supabase:', error);
      throw error;
    }
    
    // Agrupar por tipo de operación manualmente
    const statsByType = {};
    const cacheStats = { hits: 0, misses: 0 };
    let totals = { operations: 0, tokens: 0, cost: 0 };
    
    logs.forEach(log => {
      const type = log.operation_type || 'unknown';
      
      // Acumular por tipo
      if (!statsByType[type]) {
        statsByType[type] = {
          operation_type: type,
          operations: 0,
          tokens: 0,
          cost: 0,
          total_cost: 0,
          duration_ms: 0
        };
      }
      
      statsByType[type].operations++;
      statsByType[type].tokens += log.total_tokens || 0;
      statsByType[type].cost += log.total_cost || 0;
      statsByType[type].total_cost += log.total_cost || 0;
      statsByType[type].duration_ms += log.duration_ms || 0;
      
      // Acumular totales
      totals.operations++;
      totals.tokens += log.total_tokens || 0;
      totals.cost += log.total_cost || 0;
      
      // Acumular caché
      if (log.cache_hit) {
        cacheStats.hits++;
      } else {
        cacheStats.misses++;
      }
    });
    
    // Calcular promedios
    const stats = Object.values(statsByType).map(s => ({
      ...s,
      avg_cost: s.operations > 0 ? s.cost / s.operations : 0,
      avg_duration_ms: s.operations > 0 ? s.duration_ms / s.operations : 0
    }));
    
    const cacheHits = cacheStats.hits;
    const cacheMisses = cacheStats.misses;
    const totalCacheOps = cacheHits + cacheMisses;
    
    res.json({
      success: true,
      data: {
        range: {
          start: start_date,
          end: end_date
        },
        totals: totals,
        by_operation: stats,
        cache: {
          hits: cacheHits,
          misses: cacheMisses,
          hit_rate: totalCacheOps > 0 ? (cacheHits / totalCacheOps) * 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas por rango:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
};

/**
 * GET /api/ai-usage/calculator
 * Calculadora de costos
 */
const calculateCost = async (req, res) => {
  try {
    const { tokens, model = 'llama3-8b-8192', type = 'input' } = req.query;
    
    if (!tokens || isNaN(parseInt(tokens))) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el parámetro tokens (número)'
      });
    }
    
    const tokenCount = parseInt(tokens);
    const isOutput = type === 'output';
    
    const cost = tokenTracker.calculateEstimatedCost(tokenCount, model, isOutput);
    
    // Obtener info del modelo
    const modelInfo = MODEL_PRICING[model] || MODEL_PRICING['llama3-8b-8192'];
    
    res.json({
      success: true,
      data: {
        tokens: tokenCount,
        model,
        type,
        cost_usd: cost,
        cost_formatted: `$${cost.toFixed(6)} USD`,
        model_pricing: {
          input_per_1m: modelInfo.input,
          output_per_1m: modelInfo.output
        }
      }
    });
  } catch (error) {
    console.error('Error calculando costo:', error);
    res.status(500).json({
      success: false,
      error: 'Error calculando costo'
    });
  }
};

/**
 * GET /api/ai-usage/alerts
 * Obtener alertas activas
 */
const getAlerts = async (req, res) => {
  try {
    const { resolved = 'false', limit = '50' } = req.query;
    
    // Modo demo - retornar datos simulados
    if (process.env.DEMO_MODE === 'true') {
      const mockAlerts = [
        {
          id: 1,
          alert_type: 'daily_limit',
          threshold: 10,
          current_value: 12.50,
          message: 'Límite diario de $10 USD excedido. Consumo actual: $12.50',
          severity: 'warning',
          resolved: false,
          created_at: new Date(),
          resolved_at: null
        },
        {
          id: 2,
          alert_type: 'spike',
          threshold: 1,
          current_value: 1.25,
          message: 'Operación costosa detectada: $1.25 USD',
          severity: 'info',
          resolved: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
          resolved_at: null
        }
      ];
      
      return res.json({
        success: true,
        data: mockAlerts
      });
    }

    // Usar Supabase en lugar de Prisma
    const { data: alerts, error } = await supabase
      .from('ai_cost_alerts')
      .select('*')
      .eq('resolved', resolved === 'true')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (error) {
      console.error('Error obteniendo alertas de Supabase:', error);
      // Retornar array vacío en caso de error
      return res.json({
        success: true,
        data: []
      });
    }
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo alertas'
    });
  }
};

/**
 * POST /api/ai-usage/alerts/:id/resolve
 * Marcar alerta como resuelta
 */
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Modo demo - retornar datos simulados
    if (process.env.DEMO_MODE === 'true') {
      return res.json({
        success: true,
        data: {
          id: parseInt(id),
          resolved: true,
          resolved_at: new Date()
        }
      });
    }

    // Usar Supabase en lugar de Prisma
    const { data: alert, error } = await supabase
      .from('ai_cost_alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString()
      })
      .eq('id', parseInt(id))
      .select()
      .single();
    
    if (error) {
      console.error('Error resolviendo alerta en Supabase:', error);
      throw error;
    }
    
    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error resolviendo alerta:', error);
    res.status(500).json({
      success: false,
      error: 'Error resolviendo alerta'
    });
  }
};

/**
 * GET /api/ai-usage/top-operations
 * Operaciones más costosas
 */
const getTopOperations = async (req, res) => {
  try {
    const { limit = '10', days = '7' } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Modo demo - retornar datos simulados
    if (process.env.DEMO_MODE === 'true') {
      const mockTopOps = [
        {
          id: 1,
          operation_type: 'entity',
          total_tokens: 4500,
          input_tokens: 3000,
          output_tokens: 1500,
          total_cost: 0.85,
          model_used: 'llama3-8b-8192',
          duration_ms: 450,
          cache_hit: false,
          created_at: new Date(Date.now() - 30 * 60 * 1000),
          user_id: 1,
          endpoint: '/api/entities/analyze'
        },
        {
          id: 2,
          operation_type: 'search',
          total_tokens: 3200,
          input_tokens: 2200,
          output_tokens: 1000,
          total_cost: 0.62,
          model_used: 'llama3-8b-8192',
          duration_ms: 280,
          cache_hit: false,
          created_at: new Date(Date.now() - 45 * 60 * 1000),
          user_id: 1,
          endpoint: '/api/search/smart'
        },
        {
          id: 3,
          operation_type: 'sentiment',
          total_tokens: 2800,
          input_tokens: 2000,
          output_tokens: 800,
          total_cost: 0.48,
          model_used: 'llama3-8b-8192',
          duration_ms: 220,
          cache_hit: true,
          created_at: new Date(Date.now() - 60 * 60 * 1000),
          user_id: 2,
          endpoint: '/api/sentiment/analyze'
        }
      ];
      
      return res.json({
        success: true,
        data: mockTopOps
      });
    }

    // Usar Supabase en lugar de Prisma
    const { data: topOps, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('total_cost', { ascending: false })
      .limit(parseInt(limit));
    
    if (error) {
      console.error('Error obteniendo top operaciones de Supabase:', error);
      // Retornar array vacío en caso de error
      return res.json({
        success: true,
        data: []
      });
    }
    
    res.json({
      success: true,
      data: topOps
    });
  } catch (error) {
    console.error('Error obteniendo top operaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo top operaciones'
    });
  }
};

/**
 * GET /api/ai-usage/models
 * Obtener lista de modelos y sus precios
 */
const getModels = async (req, res) => {
  try {
    const models = Object.entries(MODEL_PRICING).map(([name, pricing]) => ({
      name,
      input_cost_per_1m: pricing.input,
      output_cost_per_1m: pricing.output,
      input_cost_formatted: `$${pricing.input.toFixed(2)}/1M tokens`,
      output_cost_formatted: `$${pricing.output.toFixed(2)}/1M tokens`
    }));
    
    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    console.error('Error obteniendo modelos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo modelos'
    });
  }
};

/**
 * GET /api/ai-usage/logs/recent
 * Obtiene los logs más recientes de uso de IA
 */
const getRecentLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Modo demo - retornar datos simulados
    if (process.env.DEMO_MODE === 'true') {
      const mockLogs = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
        id: i + 1,
        operation_type: ['search', 'sentiment', 'entity'][i % 3],
        model_used: 'llama3-8b-8192',
        input_tokens: 1000 + (i * 500),
        output_tokens: 500 + (i * 250),
        total_tokens: 1500 + (i * 750),
        estimated_cost: 0.05 + (i * 0.02),
        duration_ms: 200 + (i * 50),
        created_at: new Date(Date.now() - i * 10 * 60 * 1000)
      }));
      
      return res.json(mockLogs);
    }

    // Usar Supabase en lugar de Prisma
    const { data: logs, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error obteniendo logs recientes de Supabase:', error);
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo logs'
      });
    }
    
    res.json(logs);
  } catch (error) {
    console.error('Error obteniendo logs recientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo logs'
    });
  }
};

module.exports = {
  getTodayStats,
  getStatsRange,
  calculateCost,
  getAlerts,
  resolveAlert,
  getTopOperations,
  getModels,
  getRecentLogs
};
