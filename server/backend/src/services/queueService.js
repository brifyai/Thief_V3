const { Queue, Worker, QueueEvents } = require('bullmq');
const { getRedisClient } = require('../utils/redisSingleton');
const config = require('../config/env');

/**
 * Servicio de Colas con BullMQ para procesamiento en background
 * Resuelve el problema de timeouts en Vercel procesando scraping de forma asíncrona
 */

// Variable para controlar si Redis está disponible
let redisAvailable = false;
let scrapingQueue = null;
let queueEvents = null;
let redisConnection = null;

// Solo inicializar Redis si hay REDIS_URL configurada
if (process.env.REDIS_URL) {
  console.log('🔴 Redis URL configurada, intentando conectar...');
  redisConnection = getRedisClient();
} else {
  console.log('⚠️ REDIS_URL no configurada - sistema funcionará sin colas');
  redisAvailable = false;
}

// Solo manejar eventos de conexión si Redis está configurado
if (redisConnection) {
  // Manejar eventos de conexión
  redisConnection.on('connect', () => {
    console.log('✅ Conectado a Redis');
    redisAvailable = true;
    initializeQueue();
  });

  redisConnection.on('error', (err) => {
    console.error('❌ Error de conexión a Redis:', err.message);
    redisAvailable = false;
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Ejecutando sin Redis - funcionalidad de colas deshabilitada');
    }
  });

  redisConnection.on('close', () => {
    console.warn('⚠️ Redis desconectado');
    redisAvailable = false;
  });

  // Función para inicializar la cola solo cuando Redis está disponible
  const initializeQueue = () => {
    if (!scrapingQueue && redisAvailable) {
      try {
        console.log('🔄 Inicializando sistema de colas BullMQ...');
        
        // Crear cola de scraping
        scrapingQueue = new Queue('scraping', {
          connection: redisConnection,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: {
              count: 100, // Mantener últimos 100 trabajos completados
              age: 24 * 3600, // Eliminar después de 24 horas
            },
            removeOnFail: {
              count: 50, // Mantener últimos 50 trabajos fallidos
            },
          },
        });
  
        // Eventos de la cola
        queueEvents = new QueueEvents('scraping', {
          connection: redisConnection,
        });
  
        queueEvents.on('completed', ({ jobId }) => {
          console.log(`✅ Trabajo completado: ${jobId}`);
        });
  
        queueEvents.on('failed', ({ jobId, failedReason }) => {
          console.error(`❌ Trabajo fallido: ${jobId}`, failedReason);
        });
  
        queueEvents.on('progress', ({ jobId, data }) => {
          console.log(`📊 Progreso del trabajo ${jobId}:`, data);
        });
  
        console.log('🚀 Sistema de colas inicializado');
      } catch (error) {
        console.error('❌ Error inicializando cola:', error.message);
        redisAvailable = false;
        scrapingQueue = null;
        queueEvents = null;
      }
    }
  };
  
  // NO inicializar automáticamente - esperar a que se necesite
  console.log('⚠️ BullMQ no inicializado automáticamente - se inicializará bajo demanda');
}

// Estos eventos se manejan dentro de initializeQueue() para evitar duplicados

/**
 * Worker que procesa los trabajos de scraping en background
 */
let worker = null;

const createWorker = () => {
  // Importar dinámicamente para evitar dependencias circulares
  const { autoScraperService } = require('./autoScraper.service');

  worker = new Worker(
    'scraping',
    async (job) => {
      const { userId, urls, options = {} } = job.data;
      
      console.log(`🚀 Iniciando trabajo ${job.id} para usuario ${userId}`);
      console.log(`📋 URLs a procesar: ${urls.length}`);

      const results = {
        total: urls.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      // Procesar cada URL
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        
        try {
          // Actualizar progreso
          const progress = Math.round(((i + 1) / urls.length) * 100);
          await job.updateProgress({
            current: i + 1,
            total: urls.length,
            percentage: progress,
            currentUrl: url,
          });

          console.log(`🔍 Procesando URL ${i + 1}/${urls.length}: ${url}`);

          // Procesar la URL usando el servicio existente
          await autoScraperService.processSingleUrl({
            id: url.id || i,
            url: url.url || url,
            domain: url.domain || new URL(url.url || url).hostname,
            user_id: userId,
            nombre: url.nombre || null,
            region: url.region || null,
            title: url.title || null,
          });

          results.successful++;
          console.log(`✅ URL procesada exitosamente: ${url.url || url}`);

        } catch (error) {
          results.failed++;
          results.errors.push({
            url: url.url || url,
            error: error.message,
          });
          console.error(`❌ Error procesando URL ${url.url || url}:`, error.message);
        }

        // Pausa entre URLs para no sobrecargar
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, config.scrapingDelayMs || 1000));
        }
      }

      console.log(`🏁 Trabajo ${job.id} completado:`, results);
      return results;
    },
    {
      connection: redisConnection,
      concurrency: 3, // Máximo 3 trabajos simultáneos
      limiter: {
        max: 10, // Máximo 10 trabajos
        duration: 60000, // Por minuto
      },
    }
  );

  // Eventos del worker
  worker.on('completed', (job, result) => {
    console.log(`✅ Worker completó trabajo ${job.id}:`, result);
  });

  worker.on('failed', async (job, err) => {
    console.error(`❌ Worker falló en trabajo ${job?.id}:`, err.message);
    
    // Guardar error en la base de datos para que el usuario lo vea
    if (job && job.data) {
      try {
        const { supabase } = require('../config/database');
        const { userId, urls } = job.data;
        
        console.log(`💾 Guardando error en DB para usuario ${userId}...`);
        
        // Guardar un registro de error por cada URL que se intentó procesar
        if (urls && Array.isArray(urls)) {
          for (const url of urls.slice(0, 5)) { // Limitar a 5 para no saturar
            try {
              const urlId = url.id || url;
              
              await prisma.scraping_results.create({
                data: {
                  user_id: userId,
                  saved_url_id: typeof urlId === 'number' ? urlId : 0,
                  content: '',
                  scraping_type: 'automatic',
                  success: false,
                  error_message: `Job falló: ${err.message}. Intento ${job.attemptsMade}/${job.opts.attempts}`,
                  scraped_at: new Date(),
                  status_code: 500
                }
              });
            } catch (dbError) {
              console.error('Error guardando registro de error individual:', dbError.message);
            }
          }
          
          console.log(`✅ Errores guardados en DB para usuario ${userId}`);
        }
      } catch (error) {
        console.error('❌ Error guardando fallo del job en DB:', error.message);
      }
    }
  });

  worker.on('error', (err) => {
    console.error('❌ Error en worker:', err);
  });

  console.log('🔧 Worker de scraping iniciado');
  return worker;
};

/**
 * Agregar trabajo de scraping a la cola
 * @param {Object} data - Datos del trabajo
 * @param {number} data.userId - ID del usuario
 * @param {Array} data.urls - Array de URLs o objetos URL a procesar
 * @param {Object} data.options - Opciones adicionales
 * @returns {Promise<Object>} Job creado
 */
const addScrapingJob = async (data) => {
  try {
    const { userId, urls, options = {} } = data;

    if (!userId) {
      throw new Error('userId es requerido');
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error('urls debe ser un array no vacío');
    }

    // Intentar inicializar la cola si no está disponible
    if (!scrapingQueue && redisConnection) {
      console.log('🔄 Intentando inicializar cola bajo demanda...');
      redisAvailable = true;
      initializeQueue();
      
      // Esperar un momento para que se inicialice
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Verificar si Redis está disponible
    if (!redisAvailable || !scrapingQueue) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Redis no disponible - ejecutando scraping sincrónicamente');
        // En desarrollo, ejecutar sincrónicamente si Redis no está disponible
        return await executeSynchronousScraping(data);
      } else {
        throw new Error('Redis no disponible - no se pueden procesar trabajos en cola');
      }
    }

    console.log(`📥 Agregando trabajo de scraping para usuario ${userId} con ${urls.length} URLs`);

    const job = await scrapingQueue.add(
      'auto-scraping',
      {
        userId,
        urls,
        options,
      },
      {
        timeout: options.timeout || 30000,
        attempts: options.attempts || 3,
        backoff: options.backoff || {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    console.log(`✅ Trabajo agregado a la cola: ${job.id}`);

    return {
      jobId: job.id,
      status: 'queued',
      userId,
      urlCount: urls.length,
    };
  } catch (error) {
    console.error('❌ Error agregando trabajo a la cola:', error);
    
    // Si hay error con la cola, intentar fallback síncronico
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Error en cola, usando fallback síncronico');
      return await executeSynchronousScraping(data);
    }
    
    throw error;
  }
};

// Función fallback para ejecutar scraping sincrónicamente cuando Redis no está disponible
const executeSynchronousScraping = async (data) => {
  const { userId, urls, options = {} } = data;
  
  console.log(`🔄 Ejecutando scraping sincrónico para usuario ${userId} con ${urls.length} URLs`);
  
  const results = {
    total: urls.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  // Importar dinámicamente para evitar dependencias circulares
  const { autoScraperService } = require('./autoScraper.service');

  // Procesar cada URL sincrónicamente
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    
    try {
      console.log(`🔍 Procesando URL ${i + 1}/${urls.length}: ${url.url || url}`);

      // Procesar la URL usando el servicio existente
      await autoScraperService.processSingleUrl({
        id: url.id || i,
        url: url.url || url,
        domain: url.domain || new URL(url.url || url).hostname,
        user_id: userId,
        nombre: url.nombre || null,
        region: url.region || null,
        title: url.title || null,
      });

      results.successful++;
      console.log(`✅ URL procesada exitosamente: ${url.url || url}`);

    } catch (error) {
      results.failed++;
      results.errors.push({
        url: url.url || url,
        error: error.message,
      });
      console.error(`❌ Error procesando URL ${url.url || url}:`, error.message);
    }

    // Pausa entre URLs para no sobrecargar
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, config.scrapingDelayMs || 1000));
    }
  }

  console.log(`🏁 Scraping sincrónico completado:`, results);

  return {
    jobId: `sync-${Date.now()}`,
    status: 'completed',
    userId,
    urlCount: urls.length,
    results,
    executedSynchronously: true,
  };
};

/**
 * Obtener estado de un trabajo
 * @param {string} jobId - ID del trabajo
 * @returns {Promise<Object>} Estado del trabajo
 */
const getJobStatus = async (jobId) => {
  try {
    // Si es un trabajo sincrónico, devolver estado completado
    if (jobId && jobId.toString().startsWith('sync-')) {
      return {
        exists: true,
        jobId,
        state: 'completed',
        progress: 100,
        data: null,
        result: { executedSynchronously: true },
        error: null,
        attemptsMade: 1,
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: Date.now(),
      };
    }

    // Verificar si Redis está disponible
    if (!redisAvailable || !scrapingQueue) {
      return {
        exists: false,
        message: 'Redis no disponible - no se puede verificar estado del trabajo',
      };
    }

    const job = await scrapingQueue.getJob(jobId);

    if (!job) {
      return {
        exists: false,
        message: 'Trabajo no encontrado',
      };
    }

    const state = await job.getState();
    const progress = job.progress || 0;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      exists: true,
      jobId: job.id,
      state,
      progress,
      data: job.data,
      result: returnValue,
      error: failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  } catch (error) {
    console.error('❌ Error obteniendo estado del trabajo:', error);
    throw error;
  }
};

/**
 * Obtener trabajos activos
 * @returns {Promise<Array>} Lista de trabajos activos
 */
const getActiveJobs = async () => {
  try {
    // Verificar si Redis está disponible
    if (!redisAvailable || !scrapingQueue) {
      return {
        waiting: [],
        active: [],
        delayed: [],
        total: 0,
        redisAvailable: false,
      };
    }

    const [waiting, active, delayed] = await Promise.all([
      scrapingQueue.getWaiting(),
      scrapingQueue.getActive(),
      scrapingQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.map(job => ({
        id: job.id,
        data: job.data,
        timestamp: job.timestamp,
      })),
      active: active.map(job => ({
        id: job.id,
        data: job.data,
        progress: job.progress,
        timestamp: job.timestamp,
      })),
      delayed: delayed.map(job => ({
        id: job.id,
        data: job.data,
        timestamp: job.timestamp,
      })),
      total: waiting.length + active.length + delayed.length,
      redisAvailable: true,
    };
  } catch (error) {
    console.error('❌ Error obteniendo trabajos activos:', error);
    throw error;
  }
};

/**
 * Cancelar un trabajo
 * @param {string} jobId - ID del trabajo a cancelar
 * @returns {Promise<boolean>} True si se canceló exitosamente
 */
const cancelJob = async (jobId) => {
  try {
    const job = await scrapingQueue.getJob(jobId);

    if (!job) {
      throw new Error('Trabajo no encontrado');
    }

    await job.remove();
    console.log(`🗑️ Trabajo ${jobId} cancelado`);

    return true;
  } catch (error) {
    console.error('❌ Error cancelando trabajo:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de la cola
 * @returns {Promise<Object>} Estadísticas
 */
const getQueueStats = async () => {
  try {
    // Verificar si Redis está disponible
    if (!redisAvailable || !scrapingQueue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        total: 0,
        redisAvailable: false,
      };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      scrapingQueue.getWaitingCount(),
      scrapingQueue.getActiveCount(),
      scrapingQueue.getCompletedCount(),
      scrapingQueue.getFailedCount(),
      scrapingQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
      redisAvailable: true,
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    throw error;
  }
};

/**
 * Limpiar trabajos completados y fallidos antiguos
 * @returns {Promise<void>}
 */
const cleanQueue = async () => {
  try {
    // Verificar si Redis está disponible
    if (!redisAvailable || !scrapingQueue) {
      console.warn('⚠️ Redis no disponible - no se puede limpiar la cola');
      return;
    }

    await scrapingQueue.clean(24 * 3600 * 1000, 100, 'completed'); // 24 horas
    await scrapingQueue.clean(7 * 24 * 3600 * 1000, 50, 'failed'); // 7 días
    console.log('🧹 Cola limpiada');
  } catch (error) {
    console.error('❌ Error limpiando cola:', error);
    throw error;
  }
};

/**
 * Cerrar conexiones gracefully
 */
const closeConnections = async () => {
  try {
    if (worker) {
      await worker.close();
      console.log('🔌 Worker cerrado');
    }
    
    // Solo cerrar si las conexiones existen
    if (scrapingQueue) {
      await scrapingQueue.close();
      console.log('🔌 Queue cerrada');
    }
    
    if (queueEvents) {
      await queueEvents.close();
      console.log('🔌 Queue events cerrados');
    }
    
    if (redisConnection) {
      await redisConnection.quit();
      console.log('🔌 Conexión Redis cerrada');
    }
  } catch (error) {
    console.error('❌ Error cerrando conexiones:', error);
  }
};

// Manejar cierre graceful
process.on('SIGTERM', closeConnections);
process.on('SIGINT', closeConnections);

module.exports = {
  scrapingQueue,
  createWorker,
  addScrapingJob,
  getJobStatus,
  getActiveJobs,
  cancelJob,
  getQueueStats,
  cleanQueue,
  closeConnections,
  redisAvailable: () => redisAvailable,
  executeSynchronousScraping,
};
