const redis = require('../utils/redisSingleton');
const logger = require('../utils/logger');
const { isDemoMode } = require('../config/database');

class NewsSelectionRedisService {
  constructor() {
    this.keyPrefix = 'news_selections:';
    this.batchPrefix = 'news_batch:';
    this.expireTime = 86400; // 24 horas
  }

  /**
   * Obtener clave de Redis para selecciones de usuario
   */
  getUserKey(userId) {
    return `${this.keyPrefix}${userId}`;
  }

  /**
   * Obtener clave de Redis para batch
   */
  getBatchKey(batchId) {
    return `${this.batchPrefix}${batchId}`;
  }

  /**
   * Agregar noticia a las selecciones del usuario
   */
  async addSelection(userId, newsId, metadata = {}) {
    try {
      if (isDemoMode) {
        logger.info(`[DEMO] Adding selection: user=${userId}, news=${newsId}`);
        return true;
      }

      const userKey = this.getUserKey(userId);
      
      // Usar sorted set para mantener orden por timestamp
      const score = Date.now();
      await redis.zadd(userKey, score, newsId.toString());
      
      // Establecer expiración
      await redis.expire(userKey, this.expireTime);
      
      // Guardar metadata adicional si existe
      if (Object.keys(metadata).length > 0) {
        const metadataKey = `${userKey}:meta:${newsId}`;
        await redis.hset(metadataKey, metadata);
        await redis.expire(metadataKey, this.expireTime);
      }
      
      logger.info(`Added selection: user=${userId}, news=${newsId}`);
      return true;
    } catch (error) {
      logger.error('Error adding selection to Redis:', error);
      return false;
    }
  }

  /**
   * Remover noticia de las selecciones del usuario
   */
  async removeSelection(userId, newsId) {
    try {
      if (isDemoMode) {
        logger.info(`[DEMO] Removing selection: user=${userId}, news=${newsId}`);
        return true;
      }

      const userKey = this.getUserKey(userId);
      
      // Remover del sorted set
      const result = await redis.zrem(userKey, newsId.toString());
      
      // Remover metadata si existe
      const metadataKey = `${userKey}:meta:${newsId}`;
      await redis.del(metadataKey);
      
      logger.info(`Removed selection: user=${userId}, news=${newsId}, result=${result}`);
      return result > 0;
    } catch (error) {
      logger.error('Error removing selection from Redis:', error);
      return false;
    }
  }

  /**
   * Obtener todas las selecciones de un usuario
   */
  async getUserSelections(userId, limit = 100, offset = 0) {
    try {
      if (isDemoMode) {
        // Datos demo para selecciones
        return {
          selections: [
            { newsId: 1, timestamp: Date.now() - 3600000, metadata: { type: 'manual' } },
            { newsId: 2, timestamp: Date.now() - 7200000, metadata: { type: 'batch' } }
          ],
          total: 2
        };
      }

      const userKey = this.getUserKey(userId);
      
      // Obtener selecciones con scores (timestamps) en orden descendente
      const selections = await redis.zrevrange(userKey, offset, offset + limit - 1, 'WITHSCORES');
      
      const result = [];
      for (let i = 0; i < selections.length; i += 2) {
        const newsId = parseInt(selections[i]);
        const timestamp = parseInt(selections[i + 1]);
        
        // Obtener metadata si existe
        const metadataKey = `${userKey}:meta:${newsId}`;
        const metadata = await redis.hgetall(metadataKey);
        
        result.push({
          newsId,
          timestamp,
          metadata: Object.keys(metadata).length > 0 ? metadata : { type: 'manual' }
        });
      }
      
      // Obtener total
      const total = await redis.zcard(userKey);
      
      return { selections: result, total };
    } catch (error) {
      logger.error('Error getting user selections from Redis:', error);
      return { selections: [], total: 0 };
    }
  }

  /**
   * Verificar si una noticia está seleccionada por un usuario
   */
  async isNewsSelected(userId, newsId) {
    try {
      if (isDemoMode) {
        return Math.random() > 0.5; // Simulación aleatoria
      }

      const userKey = this.getUserKey(userId);
      const rank = await redis.zrank(userKey, newsId.toString());
      return rank !== null;
    } catch (error) {
      logger.error('Error checking selection status in Redis:', error);
      return false;
    }
  }

  /**
   * Limpiar todas las selecciones de un usuario
   */
  async clearUserSelections(userId) {
    try {
      if (isDemoMode) {
        logger.info(`[DEMO] Clearing all selections for user=${userId}`);
        return true;
      }

      const userKey = this.getUserKey(userId);
      
      // Obtener todas las claves de metadata
      const pattern = `${userKey}:meta:*`;
      const keys = await redis.keys(pattern);
      
      // Eliminar claves de metadata
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      
      // Eliminar el sorted set principal
      const result = await redis.del(userKey);
      
      logger.info(`Cleared all selections for user=${userId}, deleted=${result} keys`);
      return true;
    } catch (error) {
      logger.error('Error clearing user selections from Redis:', error);
      return false;
    }
  }

  /**
   * Agregar selección batch
   */
  async addBatchSelection(batchId, userId, newsIds, metadata = {}) {
    try {
      if (isDemoMode) {
        logger.info(`[DEMO] Adding batch selection: batch=${batchId}, count=${newsIds.length}`);
        return true;
      }

      const batchKey = this.getBatchKey(batchId);
      const batchData = {
        userId,
        newsIds: newsIds.join(','),
        createdAt: Date.now(),
        metadata: JSON.stringify(metadata)
      };
      
      // Guardar información del batch
      await redis.hmset(batchKey, batchData);
      await redis.expire(batchKey, this.expireTime);
      
      // Agregar cada noticia a las selecciones del usuario
      for (const newsId of newsIds) {
        await this.addSelection(userId, newsId, { ...metadata, batchId });
      }
      
      logger.info(`Added batch selection: batch=${batchId}, count=${newsIds.length}`);
      return true;
    } catch (error) {
      logger.error('Error adding batch selection to Redis:', error);
      return false;
    }
  }

  /**
   * Obtener información de un batch
   */
  async getBatchInfo(batchId) {
    try {
      if (isDemoMode) {
        return {
          batchId,
          userId: 'demo-user',
          newsIds: [1, 2, 3],
          createdAt: Date.now() - 3600000,
          metadata: { type: 'batch' }
        };
      }

      const batchKey = this.getBatchKey(batchId);
      const batchData = await redis.hgetall(batchKey);
      
      if (!batchData || Object.keys(batchData).length === 0) {
        return null;
      }
      
      return {
        batchId,
        userId: batchData.userId,
        newsIds: batchData.newsIds.split(',').map(id => parseInt(id)),
        createdAt: parseInt(batchData.createdAt),
        metadata: JSON.parse(batchData.metadata || '{}')
      };
    } catch (error) {
      logger.error('Error getting batch info from Redis:', error);
      return null;
    }
  }

  /**
   * Obtener estadísticas de selecciones
   */
  async getSelectionStats(userId = null) {
    try {
      if (isDemoMode) {
        return {
          totalSelections: 150,
          uniqueUsers: 25,
          averageSelectionsPerUser: 6,
          topSelectedNews: [
            { newsId: 1, count: 15 },
            { newsId: 2, count: 12 },
            { newsId: 3, count: 10 }
          ]
        };
      }

      let pattern;
      if (userId) {
        pattern = this.getUserKey(userId);
      } else {
        pattern = `${this.keyPrefix}*`;
      }
      
      const keys = await redis.keys(pattern);
      let totalSelections = 0;
      const newsCounts = {};
      
      for (const key of keys) {
        const count = await redis.zcard(key);
        totalSelections += count;
        
        // Si es para estadísticas globales, contar noticias populares
        if (!userId) {
          const selections = await redis.zrange(key, 0, -1);
          selections.forEach(newsId => {
            newsCounts[newsId] = (newsCounts[newsId] || 0) + 1;
          });
        }
      }
      
      const result = {
        totalSelections,
        uniqueUsers: userId ? 1 : keys.length,
        averageSelectionsPerUser: keys.length > 0 ? Math.round(totalSelections / keys.length) : 0
      };
      
      if (!userId) {
        const topSelectedNews = Object.entries(newsCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([newsId, count]) => ({ newsId: parseInt(newsId), count }));
        
        result.topSelectedNews = topSelectedNews;
      }
      
      return result;
    } catch (error) {
      logger.error('Error getting selection stats from Redis:', error);
      return {
        totalSelections: 0,
        uniqueUsers: 0,
        averageSelectionsPerUser: 0,
        topSelectedNews: []
      };
    }
  }

  /**
   * Sincronizar selecciones con la base de datos
   */
  async syncWithDatabase(userId) {
    try {
      if (isDemoMode) {
        logger.info(`[DEMO] Syncing selections for user=${userId}`);
        return true;
      }

      const { supabase } = require('../config/database');
      const redisSelections = await this.getUserSelections(userId, 1000);
      
      // Obtener selecciones de la base de datos
      const { data: dbSelections } = await supabase
        .from('news_selections')
        .select('news_id, selected_at')
        .eq('user_id', userId);
      
      const dbNewsIds = new Set(dbSelections?.map(s => s.news_id) || []);
      const redisNewsIds = new Set(redisSelections.selections.map(s => s.newsId));
      
      // Encontrar diferencias
      const toAdd = [...redisNewsIds].filter(id => !dbNewsIds.has(id));
      const toRemove = [...dbNewsIds].filter(id => !redisNewsIds.has(id));
      
      // Sincronizar adiciones
      if (toAdd.length > 0) {
        const additions = toAdd.map(newsId => {
          const selection = redisSelections.selections.find(s => s.newsId === newsId);
          return {
            user_id: userId,
            news_id: newsId,
            selected_at: new Date(selection.timestamp).toISOString(),
            selection_type: selection.metadata?.type || 'manual',
            metadata: selection.metadata
          };
        });
        
        await supabase.from('news_selections').insert(additions);
      }
      
      // Sincronizar eliminaciones
      if (toRemove.length > 0) {
        await supabase
          .from('news_selections')
          .delete()
          .eq('user_id', userId)
          .in('news_id', toRemove);
      }
      
      logger.info(`Synced selections for user=${userId}: added=${toAdd.length}, removed=${toRemove.length}`);
      return true;
    } catch (error) {
      logger.error('Error syncing selections with database:', error);
      return false;
    }
  }
}

module.exports = new NewsSelectionRedisService();