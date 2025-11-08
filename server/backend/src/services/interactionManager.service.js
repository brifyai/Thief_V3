// ========================================
// INTERACTION MANAGER SERVICE
// Gestión de interacciones de Chutes AI
// ========================================

const { supabase } = require('../config/database');
const { loggers } = require('../utils/logger');
const { AppError } = require('../utils/AppError');

class InteractionManager {
  constructor() {
    this.enabled = true;
    this.defaultDailyLimit = 250;
  }

  /**
   * Deducir una interacción del usuario
   */
  async deductInteraction(userId, operationType, metadata = null) {
    if (!this.enabled) {
      loggers.general.warn('Interaction Manager deshabilitado');
      return { success: true, balance_after: 999999 };
    }

    try {
      if (!userId) {
        throw new AppError('User ID requerido', 400);
      }

      // Normalizar userId para manejar IDs de demo
      const normalizedUserId = this.normalizeUserId(userId);

      // Llamar función SQL para deducir interacción
      const { data, error } = await supabase.rpc('deduct_interaction', {
        p_user_id: normalizedUserId,
        p_operation_type: operationType,
        p_metadata: metadata ? JSON.stringify(metadata) : null
      });

      if (error) {
        loggers.general.error('Error deducting interaction:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new AppError('No response from deduct_interaction', 500);
      }

      const result = data[0];

      if (!result.success) {
        loggers.general.warn(`Interacción no deducida para usuario ${userId}: ${result.message}`);
        return {
          success: false,
          balance_after: result.balance_after,
          message: result.message
        };
      }

      loggers.general.info(`Interacción deducida para usuario ${userId}`, {
        operation_type: operationType,
        balance_after: result.balance_after
      });

      return {
        success: true,
        balance_after: result.balance_after,
        message: result.message
      };

    } catch (error) {
      loggers.general.error('Error en deductInteraction:', error);
      // No lanzar error, permitir que continúe (fallback)
      return { success: true, balance_after: 999999 };
    }
  }

  /**
   * Obtener saldo actual del usuario
   */
  async getBalance(userId) {
    try {
      if (!userId) {
        throw new AppError('User ID requerido', 400);
      }

      // Normalizar userId para manejar IDs de demo
      const normalizedUserId = this.normalizeUserId(userId);

      // Llamar función SQL para obtener saldo
      const { data, error } = await supabase.rpc('get_user_balance', {
        p_user_id: normalizedUserId
      });

      if (error) {
        loggers.general.error('Error getting balance:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        // Usuario no existe, retornar saldo por defecto
        return {
          available_interactions: this.defaultDailyLimit,
          consumed_today: 0,
          daily_limit: this.defaultDailyLimit,
          last_reset: new Date().toISOString()
        };
      }

      return data[0];

    } catch (error) {
      loggers.general.error('Error en getBalance:', error);
      throw new AppError(`Error obteniendo saldo: ${error.message}`, 500);
    }
  }

  /**
   * Validar si el usuario tiene interacciones disponibles
   */
  async validateBalance(userId, requiredInteractions = 1) {
    try {
      const balance = await this.getBalance(userId);
      return balance.available_interactions >= requiredInteractions;
    } catch (error) {
      loggers.general.error('Error validating balance:', error);
      // En caso de error, permitir la operación (fallback)
      return true;
    }
  }

  /**
   * Normalizar el userId para manejar IDs de demo
   */
  normalizeUserId(userId) {
    if (!userId) return null;
    
    // Si es un ID de demo, convertirlo a un UUID válido para la BD
    if (userId === 'demo-admin' || userId === 'demo-token') {
      return '00000000-0000-0000-0000-000000000001'; // UUID fijo para demo
    }
    
    // Si ya parece un UUID, retornarlo tal cual
    if (typeof userId === 'string' && userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return userId;
    }
    
    // Para cualquier otro caso, retornar null para evitar errores
    loggers.general.warn(`⚠️ UserId no válido para interaction manager: ${userId}`);
    return null;
  }

  /**
   * Asignar interacciones a un usuario (admin)
   */
  async assignInteractions(userId, amount, adminId) {
    try {
      if (!userId || !amount || !adminId) {
        throw new AppError('User ID, amount y admin ID requeridos', 400);
      }

      if (amount <= 0) {
        throw new AppError('Amount debe ser mayor a 0', 400);
      }

      // Llamar función SQL para asignar interacciones
      const { data, error } = await supabase.rpc('assign_interactions', {
        p_user_id: userId,
        p_amount: amount,
        p_admin_id: adminId
      });

      if (error) {
        loggers.general.error('Error assigning interactions:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new AppError('No response from assign_interactions', 500);
      }

      const result = data[0];

      loggers.general.info(`Interacciones asignadas a usuario ${userId}`, {
        amount,
        new_balance: result.new_balance,
        admin_id: adminId
      });

      return {
        success: result.success,
        new_balance: result.new_balance,
        message: result.message
      };

    } catch (error) {
      loggers.general.error('Error en assignInteractions:', error);
      throw new AppError(`Error asignando interacciones: ${error.message}`, 500);
    }
  }

  /**
   * Resetear interacciones diarias
   */
  async resetDailyInteractions() {
    try {
      // Llamar función SQL para resetear
      const { data, error } = await supabase.rpc('reset_daily_interactions');

      if (error) {
        loggers.general.error('Error resetting daily interactions:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new AppError('No response from reset_daily_interactions', 500);
      }

      const result = data[0];

      loggers.general.info(`Interacciones diarias reseteadas`, {
        users_reset: result.users_reset,
        timestamp: result.timestamp_reset
      });

      return {
        success: true,
        users_reset: result.users_reset,
        timestamp: result.timestamp_reset
      };

    } catch (error) {
      loggers.general.error('Error en resetDailyInteractions:', error);
      throw new AppError(`Error reseteando interacciones: ${error.message}`, 500);
    }
  }

  /**
   * Obtener historial de consumo de un usuario
   */
  async getHistory(userId, limit = 50, offset = 0) {
    try {
      if (!userId) {
        throw new AppError('User ID requerido', 400);
      }

      const { data, error, count } = await supabase
        .from('interaction_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        loggers.general.error('Error getting history:', error);
        throw error;
      }

      return {
        logs: data || [],
        total: count || 0,
        limit,
        offset
      };

    } catch (error) {
      loggers.general.error('Error en getHistory:', error);
      throw new AppError(`Error obteniendo historial: ${error.message}`, 500);
    }
  }

  /**
   * Obtener estadísticas de consumo de un usuario
   */
  async getStats(userId) {
    try {
      if (!userId) {
        throw new AppError('User ID requerido', 400);
      }

      // Obtener saldo actual
      const balance = await this.getBalance(userId);

      // Obtener consumo por tipo de operación
      const { data: byOperation, error: opError } = await supabase
        .from('interaction_logs')
        .select('operation_type, COUNT(*) as count, SUM(interactions_deducted) as total_deducted')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .group_by('operation_type');

      if (opError) {
        loggers.general.warn('Error getting operation stats:', opError);
      }

      // Obtener total de interacciones consumidas
      const { data: totalData, error: totalError } = await supabase
        .from('interaction_logs')
        .select('interactions_deducted')
        .eq('user_id', userId);

      if (totalError) {
        loggers.general.warn('Error getting total stats:', totalError);
      }

      const totalConsumed = (totalData || []).reduce((sum, log) => sum + (log.interactions_deducted || 0), 0);

      return {
        current_balance: balance.available_interactions,
        consumed_today: balance.consumed_today,
        daily_limit: balance.daily_limit,
        last_reset: balance.last_reset,
        total_consumed_all_time: totalConsumed,
        by_operation: byOperation || []
      };

    } catch (error) {
      loggers.general.error('Error en getStats:', error);
      throw new AppError(`Error obteniendo estadísticas: ${error.message}`, 500);
    }
  }

  /**
   * Obtener configuración global
   */
  async getSettings() {
    try {
      const { data, error } = await supabase
        .from('interaction_settings')
        .select('*');

      if (error) {
        loggers.general.error('Error getting settings:', error);
        throw error;
      }

      const settings = {};
      (data || []).forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });

      return settings;

    } catch (error) {
      loggers.general.error('Error en getSettings:', error);
      throw new AppError(`Error obteniendo configuración: ${error.message}`, 500);
    }
  }

  /**
   * Actualizar configuración global
   */
  async updateSetting(settingKey, settingValue, adminId) {
    try {
      if (!settingKey || !settingValue || !adminId) {
        throw new AppError('Setting key, value y admin ID requeridos', 400);
      }

      const { data, error } = await supabase
        .from('interaction_settings')
        .update({
          setting_value: String(settingValue),
          updated_by: adminId,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', settingKey)
        .select();

      if (error) {
        loggers.general.error('Error updating setting:', error);
        throw error;
      }

      loggers.general.info(`Configuración actualizada: ${settingKey} = ${settingValue}`, {
        admin_id: adminId
      });

      return {
        success: true,
        setting: data?.[0] || null
      };

    } catch (error) {
      loggers.general.error('Error en updateSetting:', error);
      throw new AppError(`Error actualizando configuración: ${error.message}`, 500);
    }
  }

  /**
   * Listar todos los usuarios con sus interacciones
   */
  async listAllUsers(limit = 50, offset = 0) {
    try {
      const { data, error, count } = await supabase
        .from('user_interactions')
        .select(`
          id,
          user_id,
          daily_limit,
          available_interactions,
          consumed_today,
          last_reset,
          updated_at,
          created_at
        `, { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        loggers.general.error('Error listing users:', error);
        throw error;
      }

      return {
        users: data || [],
        total: count || 0,
        limit,
        offset
      };

    } catch (error) {
      loggers.general.error('Error en listAllUsers:', error);
      throw new AppError(`Error listando usuarios: ${error.message}`, 500);
    }
  }

  /**
   * Obtener detalles de un usuario específico
   */
  async getUserDetails(userId) {
    try {
      if (!userId) {
        throw new AppError('User ID requerido', 400);
      }

      const { data, error } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        loggers.general.error('Error getting user details:', error);
        throw error;
      }

      // Si no existe, retornar valores por defecto
      if (!data) {
        return {
          user_id: userId,
          daily_limit: this.defaultDailyLimit,
          available_interactions: this.defaultDailyLimit,
          consumed_today: 0,
          last_reset: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
      }

      return data;

    } catch (error) {
      loggers.general.error('Error en getUserDetails:', error);
      throw new AppError(`Error obteniendo detalles del usuario: ${error.message}`, 500);
    }
  }
}

// Singleton
const interactionManager = new InteractionManager();

module.exports = interactionManager;