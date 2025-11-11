// ========================================
// DAILY RESET SCHEDULER SERVICE
// Servicio para resetear interacciones diarias automáticamente
// ========================================

const { loggers } = require('../utils/logger');
const interactionManager = require('./interactionManager.service');

class DailyResetScheduler {
  constructor() {
    this.isRunning = false;
    this.resetHour = 0; // Medianoche UTC
    this.resetMinute = 0;
    this.checkInterval = 60000; // Verificar cada minuto
    this.lastResetDate = null;
  }

  /**
   * Iniciar el scheduler
   */
  start() {
    if (this.isRunning) {
      loggers.general.warn('Daily reset scheduler already running');
      return;
    }

    this.isRunning = true;
    loggers.general.info('Daily reset scheduler started', {
      resetTime: `${this.resetHour}:${String(this.resetMinute).padStart(2, '0')} UTC`,
      checkInterval: `${this.checkInterval / 1000}s`
    });

    this.scheduleCheck();
  }

  /**
   * Detener el scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    loggers.general.info('Daily reset scheduler stopped');
  }

  /**
   * Programar verificación periódica
   */
  scheduleCheck() {
    this.intervalId = setInterval(() => {
      this.checkAndReset();
    }, this.checkInterval);
  }

  /**
   * Verificar si es hora de resetear y ejecutar
   */
  async checkAndReset() {
    try {
      const now = new Date();
      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();
      const currentDate = now.toISOString().split('T')[0];

      // Verificar si es la hora de resetear y si no se ha reseteado hoy
      if (
        currentHour === this.resetHour &&
        currentMinute === this.resetMinute &&
        this.lastResetDate !== currentDate
      ) {
        await this.executeReset();
        this.lastResetDate = currentDate;
      }
    } catch (error) {
      loggers.general.error('Error in daily reset check:', error);
    }
  }

  /**
   * Ejecutar el reset de interacciones
   */
  async executeReset() {
    try {
      loggers.general.info('Executing daily reset of interactions');

      const result = await interactionManager.resetDailyInteractions();

      loggers.general.info('Daily reset completed successfully', {
        users_reset: result.users_reset,
        timestamp: result.timestamp
      });

      // Registrar en logs para auditoría
      this.logResetEvent(result);

    } catch (error) {
      loggers.general.error('Error executing daily reset:', error);
    }
  }

  /**
   * Registrar evento de reset para auditoría
   */
  logResetEvent(result) {
    try {
      const event = {
        type: 'DAILY_RESET',
        timestamp: new Date().toISOString(),
        users_affected: result.users_reset,
        status: 'success'
      };

      loggers.general.info('Daily reset event logged', event);
    } catch (error) {
      loggers.general.warn('Error logging reset event:', error);
    }
  }

  /**
   * Configurar hora de reset personalizada
   */
  setResetTime(hour, minute = 0) {
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error('Invalid reset time: hour must be 0-23, minute must be 0-59');
    }

    this.resetHour = hour;
    this.resetMinute = minute;

    loggers.general.info('Reset time updated', {
      resetTime: `${this.resetHour}:${String(this.resetMinute).padStart(2, '0')} UTC`
    });
  }

  /**
   * Obtener estado del scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      resetTime: `${this.resetHour}:${String(this.resetMinute).padStart(2, '0')} UTC`,
      lastResetDate: this.lastResetDate,
      checkInterval: `${this.checkInterval / 1000}s`
    };
  }

  /**
   * Ejecutar reset manual (para testing o administración)
   */
  async executeManualReset() {
    try {
      loggers.general.info('Manual reset triggered');
      const result = await interactionManager.resetDailyInteractions();
      this.lastResetDate = new Date().toISOString().split('T')[0];
      return result;
    } catch (error) {
      loggers.general.error('Error executing manual reset:', error);
      throw error;
    }
  }
}

// Singleton
const dailyResetScheduler = new DailyResetScheduler();

module.exports = dailyResetScheduler;
