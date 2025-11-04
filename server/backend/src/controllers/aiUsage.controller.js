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
    
    // Obtener logs agrupados por tipo de operación
    const stats = await prisma.aiUsageLog.groupBy({
      by: ['operation_type'],
      where: {
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        total_tokens: true,
        total_cost: true,
        input_tokens: true,
        output_tokens: true
      },
      _count: true,
      _avg: {
        total_cost: true,
        duration_ms: true
      }
    });
    
    // Obtener totales
    const totals = await prisma.aiUsageLog.aggregate({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        total_tokens: true,
        total_cost: true
      },
      _count: true
    });
    
    // Obtener stats de caché
    const cacheStats = await prisma.aiUsageLog.groupBy({
      by: ['cache_hit'],
      where: {
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true
    });
    
    const cacheHits = cacheStats.find(s => s.cache_hit)?._count || 0;
    const cacheMisses = cacheStats.find(s => !s.cache_hit)?._count || 0;
    const totalCacheOps = cacheHits + cacheMisses;
    
    res.json({
      success: true,
      data: {
        range: {
          start: start_date,
          end: end_date
        },
        totals: {
          operations: totals._count || 0,
          tokens: totals._sum.total_tokens || 0,
          cost: totals._sum.total_cost || 0
        },
        by_operation: stats.map(s => ({
          operation_type: s.operation_type,
          operations: s._count,
          tokens: s._sum.total_tokens || 0,
          cost: s._sum.total_cost || 0,
          avg_cost: s._avg.total_cost || 0,
          avg_duration_ms: s._avg.duration_ms || 0
        })),
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
    
    const alerts = await prisma.aiCostAlert.findMany({
      where: {
        resolved: resolved === 'true'
      },
      orderBy: {
        created_at: 'desc'
      },
      take: parseInt(limit)
    });
    
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
    
    const alert = await prisma.aiCostAlert.update({
      where: { id: parseInt(id) },
      data: {
        resolved: true,
        resolved_at: new Date()
      }
    });
    
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
    
    const topOps = await prisma.aiUsageLog.findMany({
      where: {
        created_at: {
          gte: startDate
        }
      },
      orderBy: {
        total_cost: 'desc'
      },
      take: parseInt(limit),
      select: {
        id: true,
        operation_type: true,
        total_tokens: true,
        input_tokens: true,
        output_tokens: true,
        total_cost: true,
        model_used: true,
        duration_ms: true,
        cache_hit: true,
        created_at: true,
        user_id: true,
        endpoint: true
      }
    });
    
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
    
    const logs = await prisma.ai_usage_logs.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        operation_type: true,
        model_used: true,
        input_tokens: true,
        output_tokens: true,
        total_tokens: true,
        estimated_cost: true,
        duration_ms: true,
        created_at: true
      }
    });
    
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
