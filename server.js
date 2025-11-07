const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cron = require('node-cron');

// Importar configuración del backend
const config = require('./server/backend/src/config/env');
const { errorHandler } = require('./server/backend/src/middleware/errorHandler');
const { autoScraperService } = require('./server/backend/src/services/autoScraper.service');
const { swaggerSpec, swaggerUi } = require('./server/backend/src/config/swagger');
const dailyResetScheduler = require('./server/backend/src/services/dailyResetScheduler.service');

const { tokenTracker } = require('./server/backend/src/services/tokenTracker.service');

// Importar rutas del backend
const authRoutes = require('./server/backend/src/routes/auth.routes');
const scrapingRoutes = require('./server/backend/src/routes/scraping.routes');
const urlsRoutes = require('./server/backend/src/routes/urls.routes');
const statsRoutes = require('./server/backend/src/routes/stats.routes');
const searchRoutes = require('./server/backend/src/routes/search.routes');
const queueRoutes = require('./server/backend/src/routes/queue.routes');
const cacheRoutes = require('./server/backend/src/routes/cache.routes');
const siteConfigRoutes = require('./server/backend/src/routes/siteConfig.routes');
const publicUrlsRoutes = require('./server/backend/src/routes/publicUrls.routes');
const userUrlSelectionsRoutes = require('./server/backend/src/routes/userUrlSelections.routes');
const savedArticlesRoutes = require('./server/backend/src/routes/savedArticles.routes');
const metricsRoutes = require('./server/backend/src/routes/metrics.routes');
const cleanupRoutes = require('./server/backend/src/routes/cleanup.routes');
const entityRoutes = require('./server/backend/src/routes/entity.routes');
const highlightsRoutes = require('./server/backend/src/routes/highlights.routes');
const aiUsageRoutes = require('./server/backend/src/routes/aiUsage.routes');
const simpleTestRoutes = require('./server/backend/src/routes/simpleTest.routes');
const usersRoutes = require('./server/backend/src/routes/users.routes');
const newsRoutes = require('./server/backend/src/routes/news.routes');
const newsScrapingRoutes = require('./server/backend/src/routes/newsScraping.routes');
const newsSearchRoutes = require('./server/backend/src/routes/newsSearch.routes');
const interactionsRoutes = require('./server/backend/src/routes/interactions.routes');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Crear aplicación Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Crear aplicación Express para el API
const api = express();

// Configuración de seguridad para el API
api.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com"
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://api.chutes.ai",
        "https://cdn.jsdelivr.net",
        "http://localhost:*",
        "ws://localhost:*"
      ],
    }
  }
}));

// Configuración de CORS para el API
api.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    if (config.nodeEnv === 'development') {
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      if (isLocalhost) {
        return callback(null, true);
      }
    }
    
    callback(new Error('No permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true,
}));

// Configuración de body parser para el API
api.use(express.json({ limit: '50mb' }));
api.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting para el API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Demasiadas solicitudes, por favor intenta más tarde' },
  standardHeaders: true,
  legacyHeaders: false
});

api.use('/api/', globalLimiter);

// Health check endpoint
api.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok',
    services: {},
    demoMode: process.env.DEMO_MODE === 'true'
  };

  // Solo verificar base de datos si no estamos en modo demo
  if (process.env.DEMO_MODE !== 'true') {
    try {
      const { supabase } = require('./server/backend/src/config/database');
      const { error } = await supabase.from('users').select('count').limit(1).single();
      health.services.database = error ? 'error' : 'ok';
      if (error) health.status = 'degraded';
    } catch (error) {
      health.services.database = 'error';
      health.status = 'degraded';
    }
  } else {
    health.services.database = 'disabled (demo mode)';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Montar todas las rutas del API
api.use('/api/auth', authRoutes);
api.use('/api/scraping', scrapingRoutes);
api.use('/api', urlsRoutes);
api.use('/api', statsRoutes);
api.use('/api/search', searchRoutes);
api.use('/api/queue', queueRoutes);
api.use('/api/cache', cacheRoutes);
api.use('/api/site-configs', siteConfigRoutes);
api.use('/api/public-urls', publicUrlsRoutes);
api.use('/api/my-urls', userUrlSelectionsRoutes);
api.use('/api/saved-articles', savedArticlesRoutes);
api.use('/api/metrics', metricsRoutes);
api.use('/api/cleanup', cleanupRoutes);
api.use('/api/entities', entityRoutes);
api.use('/api/highlights', highlightsRoutes);
api.use('/api/ai-usage', aiUsageRoutes);
api.use('/api/simple-test', simpleTestRoutes);
api.use('/api/users', usersRoutes);
api.use('/api/news', newsRoutes);
api.use('/api/news/scrape', newsScrapingRoutes);
api.use('/api/news/search', newsSearchRoutes);
api.use('/api/interactions', interactionsRoutes);

// Documentación Swagger
api.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Documentación API - Scraping de Noticias"
}));

// Manejo de errores del API
api.use(errorHandler);

app.prepare().then(() => {
  // Crear servidor HTTP que maneje tanto Express como Next.js
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      // Si la ruta comienza con /api o es una ruta especial del backend, manejar con Express
      if (pathname.startsWith('/api') ||
          pathname.startsWith('/scrape') ||
          pathname.startsWith('/health') ||
          pathname.startsWith('/api-docs')) {
        
        // Usar Express directamente
        api(req, res);
        return;
      }

      // Para todas las demás rutas, manejar con Next.js
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  server.listen(port, () => {
    console.log(`> Servidor unificado listo en http://${hostname}:${port}`);
    
    // Inicializar Token Tracker
    tokenTracker.initialize().catch(err => {
      console.error('⚠️ Error inicializando Token Tracker:', err);
    });

    // Inicializar Daily Reset Scheduler para interacciones
    try {
      dailyResetScheduler.start();
      console.log(`⏰ Daily Reset Scheduler iniciado: ${JSON.stringify(dailyResetScheduler.getStatus())}`);
    } catch (error) {
      console.error('⚠️ Error inicializando Daily Reset Scheduler:', error);
    }

    // Configurar cron jobs del backend
    if (config.scrapingEnabled) {
      const schedules = config.scrapingSchedules.split(',').map(s => s.trim());
      
      schedules.forEach((schedule, index) => {
        console.log(`📅 Configurando scraping automático #${index + 1}: ${schedule} (${config.scrapingTimezone})`);
        
        cron.schedule(schedule, async () => {
          console.log(`🕐 Iniciando scraping automático programado #${index + 1} (${schedule})...`);
          try {
            const result = await autoScraperService.runDailyScraping();
            console.log(`✅ Scraping automático #${index + 1} completado:`, result);
          } catch (error) {
            console.error(`❌ Error en scraping automático #${index + 1}:`, error);
          }
        }, {
          scheduled: true,
          timezone: config.scrapingTimezone
        });
      });
    }

    if (config.cleanupEnabled) {
      const { cleanupOldNews } = require('./server/backend/src/services/cleanup.service');
      
      console.log(`🧹 Configurando limpieza automática: ${config.cleanupSchedule} (${config.cleanupTimezone})`);
      
      cron.schedule(config.cleanupSchedule, async () => {
        console.log('🕐 Iniciando limpieza automática programada...');
        try {
          const result = await cleanupOldNews();
          if (result.success) {
            console.log(`✅ Limpieza automática completada: ${result.deleted} noticias eliminadas`);
          } else {
            console.error('❌ Error en limpieza automática:', result.error);
          }
        } catch (error) {
          console.error('❌ Error ejecutando limpieza automática:', error);
        }
      }, {
        scheduled: true,
        timezone: config.cleanupTimezone
      });
    }

    // Iniciar worker de BullMQ si no está en Vercel
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    const hasRedis = !!process.env.REDIS_URL;
    const enableWorker = process.env.ENABLE_WORKER === 'true';

    if (!isVercel && hasRedis && enableWorker) {
      try {
        const { createWorker } = require('./server/backend/src/services/queueService');
        const worker = createWorker();
        console.log('✅ Worker de BullMQ iniciado');
      } catch (error) {
        console.error('⚠️ No se pudo iniciar worker de BullMQ:', error.message);
      }
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📊 SIGTERM recibido, cerrando Token Tracker...');
    await tokenTracker.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('📊 SIGINT recibido, cerrando Token Tracker...');
    await tokenTracker.shutdown();
    process.exit(0);
  });
});
