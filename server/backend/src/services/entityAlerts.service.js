const { supabase } = require('../config/database');
const entityStatsService = require('./entityStats.service');

/**
 * 🚨 SERVICIO DE ALERTAS DE ENTIDADES
 * Detecta cambios significativos y genera alertas
 */
class EntityAlertsService {
  
  /**
   * Verifica si debe crear alertas para una entidad
   * @param {string} entityId - ID de la entidad
   * @returns {Promise<Array>} Alertas creadas
   */
  async checkForAlerts(entityId) {
    try {
      const entity = await prisma.entity.findUnique({
        where: { id: entityId }
      });
      
      if (!entity || !entity.alert_enabled) {
        return [];
      }
      
      const alerts = [];
      
      // Detectar cambio de sentimiento
      const sentimentAlert = await this.detectSentimentChange(entityId, entity.alert_threshold);
      if (sentimentAlert) alerts.push(sentimentAlert);
      
      // Detectar aumento de volumen
      const volumeAlert = await this.detectVolumeSpike(entityId);
      if (volumeAlert) alerts.push(volumeAlert);
      
      // Detectar crisis
      const crisisAlert = await this.detectCrisis(entityId);
      if (crisisAlert) alerts.push(crisisAlert);
      
      // Detectar trending
      const trendingAlert = await this.detectTrending(entityId);
      if (trendingAlert) alerts.push(trendingAlert);
      
      console.log(`🚨 Generadas ${alerts.length} alertas para entidad ${entityId}`);
      return alerts;
      
    } catch (error) {
      console.error('❌ Error verificando alertas:', error);
      return [];
    }
  }
  
  /**
   * Detecta cambio significativo de sentimiento
   * @param {string} entityId - ID de la entidad
   * @param {number} threshold - Umbral de cambio
   * @returns {Promise<Object|null>} Alerta o null
   */
  async detectSentimentChange(entityId, threshold = 0.2) {
    try {
      // Obtener últimos 2 snapshots
      const snapshots = await prisma.entitySnapshot.findMany({
        where: { entity_id: entityId },
        orderBy: { date: 'desc' },
        take: 2
      });
      
      if (snapshots.length < 2) {
        return null;
      }
      
      const [latest, previous] = snapshots;
      const change = latest.avg_sentiment - previous.avg_sentiment;
      
      if (Math.abs(change) < threshold) {
        return null; // Cambio no significativo
      }
      
      const direction = change > 0 ? 'positivo' : 'negativo';
      const percentage = Math.round(Math.abs(change) * 100);
      
      let severity = 'MEDIUM';
      if (Math.abs(change) > 0.4) severity = 'HIGH';
      if (Math.abs(change) > 0.6) severity = 'CRITICAL';
      
      return await this.createAlert(entityId, 'SENTIMENT_CHANGE', {
        title: `Cambio de sentimiento ${direction}`,
        message: `El sentimiento cambió ${percentage}% hacia ${direction} en las últimas 24 horas.`,
        severity,
        data: {
          previous_sentiment: previous.avg_sentiment,
          current_sentiment: latest.avg_sentiment,
          change,
          percentage
        }
      });
      
    } catch (error) {
      console.error('❌ Error detectando cambio de sentimiento:', error);
      return null;
    }
  }
  
  /**
   * Detecta aumento súbito de menciones
   * @param {string} entityId - ID de la entidad
   * @returns {Promise<Object|null>} Alerta o null
   */
  async detectVolumeSpike(entityId) {
    try {
      // Obtener últimos 8 días de snapshots
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      
      const snapshots = await prisma.entitySnapshot.findMany({
        where: {
          entity_id: entityId,
          date: {
            gte: eightDaysAgo
          }
        },
        orderBy: { date: 'desc' }
      });
      
      if (snapshots.length < 2) {
        return null;
      }
      
      const latest = snapshots[0];
      const previous = snapshots.slice(1);
      
      // Calcular promedio de menciones de días anteriores
      const avgPrevious = previous.reduce((sum, s) => sum + s.new_mentions, 0) / previous.length;
      
      // Verificar si hay spike (2x el promedio)
      if (latest.new_mentions < avgPrevious * 2) {
        return null;
      }
      
      const increase = Math.round(((latest.new_mentions - avgPrevious) / avgPrevious) * 100);
      
      let severity = 'MEDIUM';
      if (latest.new_mentions > avgPrevious * 3) severity = 'HIGH';
      if (latest.new_mentions > avgPrevious * 5) severity = 'CRITICAL';
      
      return await this.createAlert(entityId, 'VOLUME_SPIKE', {
        title: 'Aumento súbito de menciones',
        message: `Las menciones aumentaron ${increase}% respecto al promedio de los últimos 7 días.`,
        severity,
        data: {
          current_mentions: latest.new_mentions,
          avg_previous: Math.round(avgPrevious),
          increase_percentage: increase
        }
      });
      
    } catch (error) {
      console.error('❌ Error detectando spike de volumen:', error);
      return null;
    }
  }
  
  /**
   * Detecta posible crisis de reputación
   * @param {string} entityId - ID de la entidad
   * @returns {Promise<Object|null>} Alerta o null
   */
  async detectCrisis(entityId) {
    try {
      const latest = await prisma.entitySnapshot.findFirst({
        where: { entity_id: entityId },
        orderBy: { date: 'desc' }
      });
      
      if (!latest) {
        return null;
      }
      
      const totalMentions = latest.positive_count + latest.negative_count + latest.neutral_count;
      
      // Crisis: >70% negativo y al menos 5 menciones
      if (totalMentions < 5) {
        return null;
      }
      
      const negativePercentage = (latest.negative_count / totalMentions) * 100;
      
      if (negativePercentage < 70) {
        return null;
      }
      
      let severity = 'HIGH';
      if (negativePercentage > 85) severity = 'CRITICAL';
      
      return await this.createAlert(entityId, 'CRISIS_DETECTED', {
        title: '⚠️ Posible crisis de reputación',
        message: `${Math.round(negativePercentage)}% de las menciones recientes son negativas.`,
        severity,
        data: {
          negative_count: latest.negative_count,
          total_mentions: totalMentions,
          negative_percentage: negativePercentage,
          avg_sentiment: latest.avg_sentiment
        }
      });
      
    } catch (error) {
      console.error('❌ Error detectando crisis:', error);
      return null;
    }
  }
  
  /**
   * Detecta si la entidad está trending
   * @param {string} entityId - ID de la entidad
   * @returns {Promise<Object|null>} Alerta o null
   */
  async detectTrending(entityId) {
    try {
      // Obtener últimos 2 días
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const snapshots = await prisma.entitySnapshot.findMany({
        where: {
          entity_id: entityId,
          date: {
            gte: twoDaysAgo
          }
        },
        orderBy: { date: 'desc' }
      });
      
      if (snapshots.length < 2) {
        return null;
      }
      
      const [today, yesterday] = snapshots;
      
      // Trending: 300%+ de aumento
      if (today.new_mentions < yesterday.new_mentions * 3) {
        return null;
      }
      
      const increase = Math.round(((today.new_mentions - yesterday.new_mentions) / yesterday.new_mentions) * 100);
      
      return await this.createAlert(entityId, 'TRENDING', {
        title: '🔥 Entidad está trending',
        message: `Las menciones aumentaron ${increase}% en las últimas 24 horas.`,
        severity: 'MEDIUM',
        data: {
          yesterday_mentions: yesterday.new_mentions,
          today_mentions: today.new_mentions,
          increase_percentage: increase
        }
      });
      
    } catch (error) {
      console.error('❌ Error detectando trending:', error);
      return null;
    }
  }
  
  /**
   * Crea una alerta en la base de datos
   * @param {string} entityId - ID de la entidad
   * @param {string} type - Tipo de alerta
   * @param {Object} alertData - Datos de la alerta
   * @returns {Promise<Object>} Alerta creada
   */
  async createAlert(entityId, type, alertData) {
    try {
      const { title, message, severity = 'MEDIUM', data = {} } = alertData;
      
      // Verificar si ya existe una alerta similar reciente (últimas 24h)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const existingAlert = await prisma.entityAlert.findFirst({
        where: {
          entity_id: entityId,
          type,
          created_at: {
            gte: oneDayAgo
          }
        }
      });
      
      if (existingAlert) {
        console.log(`⚠️  Alerta similar ya existe para ${entityId}`);
        return null;
      }
      
      const alert = await prisma.entityAlert.create({
        data: {
          entity_id: entityId,
          type,
          severity,
          title,
          message,
          data
        }
      });
      
      console.log(`✅ Alerta creada: ${title}`);
      return alert;
      
    } catch (error) {
      console.error('❌ Error creando alerta:', error);
      return null;
    }
  }
  
  /**
   * Obtiene alertas activas de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Array>} Alertas no leídas
   */
  async getActiveAlerts(userId) {
    try {
      const alerts = await prisma.entityAlert.findMany({
        where: {
          entity: {
            user_id: userId
          },
          is_read: false
        },
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: [
          { severity: 'desc' },
          { created_at: 'desc' }
        ]
      });
      
      return alerts;
      
    } catch (error) {
      console.error('❌ Error obteniendo alertas activas:', error);
      throw error;
    }
  }
  
  /**
   * Marca una alerta como leída
   * @param {string} alertId - ID de la alerta
   * @returns {Promise<Object>} Alerta actualizada
   */
  async markAsRead(alertId) {
    try {
      const alert = await prisma.entityAlert.update({
        where: { id: alertId },
        data: {
          is_read: true,
          read_at: new Date()
        }
      });
      
      return alert;
      
    } catch (error) {
      console.error('❌ Error marcando alerta como leída:', error);
      throw error;
    }
  }
  
  /**
   * Marca todas las alertas de un usuario como leídas
   * @param {number} userId - ID del usuario
   * @returns {Promise<number>} Cantidad de alertas actualizadas
   */
  async markAllAsRead(userId) {
    try {
      const result = await prisma.entityAlert.updateMany({
        where: {
          entity: {
            user_id: userId
          },
          is_read: false
        },
        data: {
          is_read: true,
          read_at: new Date()
        }
      });
      
      return result.count;
      
    } catch (error) {
      console.error('❌ Error marcando todas las alertas:', error);
      throw error;
    }
  }
}

module.exports = new EntityAlertsService();
