const express = require("express");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const cron = require('node-cron');
const config = require('./src/config/env');
const { errorHandler } = require('./src/middleware/errorHandler');
const { autoScraperService } = require('./src/services/autoScraper.service');
const { swaggerSpec, swaggerUi } = require('./src/config/swagger');
const { tokenTracker } = require('./src/services/tokenTracker.service');

// Routes
const authRoutes = require('./src/routes/auth.routes');
const scrapingRoutes = require('./src/routes/scraping.routes');
const urlsRoutes = require('./src/routes/urls.routes');
const statsRoutes = require('./src/routes/stats.routes');
const searchRoutes = require('./src/routes/search.routes');
const queueRoutes = require('./src/routes/queue.routes');
const cacheRoutes = require('./src/routes/cache.routes');
const siteConfigRoutes = require('./src/routes/siteConfig.routes');
const newsRoutes = require('./src/routes/news.routes'); // 📰 Rutas de noticias (incluye humanización)
const humanizedNewsRoutes = require('./src/routes/humanizedNews.routes'); // 🧠 Rutas de noticias humanizadas
// const debugRoutes = require('./src/routes/debug.routes'); // ❌ Eliminado - no para producción
const publicUrlsRoutes = require('./src/routes/publicUrls.routes');
const userUrlSelectionsRoutes = require('./src/routes/userUrlSelections.routes');
const savedArticlesRoutes = require('./src/routes/savedArticles.routes');
const metricsRoutes = require('./src/routes/metrics.routes'); // 🔹 FASE 4
const cleanupRoutes = require('./src/routes/cleanup.routes'); // 🧹 Limpieza automática
const entityRoutes = require('./src/routes/entity.routes'); // 🔍 Monitoreo de entidades
const highlightsRoutes = require('./src/routes/highlights.routes'); // ⭐ Noticias destacadas
const aiUsageRoutes = require('./src/routes/aiUsage.routes'); // 📊 Monitoreo de tokens IA
const simpleTestRoutes = require('./src/routes/simpleTest.routes'); // 🧪 Test simple de URLs
const usersRoutes = require('./src/routes/users.routes'); // 👥 Gestión de usuarios
const tempGenerateSummariesRoutes = require('./src/routes/temp-generate-summaries.routes'); // 🔧 Generación de resúmenes (temporal)
const simpleGenerateSummariesRoutes = require('./src/routes/simple-generate-summaries.routes'); // 🔧 Generación simple de resúmenes
// const adminSitesRoutes = require('./src/routes/adminSites.routes'); // 🔧 Gestión de sitios de scraping - Movido a Next.js API routes

const app = express();

// Helmet para headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "'unsafe-eval'", // Necesario para SweetAlert2 y otras librerías
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com"
      ],
      scriptSrcAttr: ["'unsafe-inline'"], // Permite onclick, onsubmit, etc.
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
        "http://localhost:*", // Para desarrollo
        "ws://localhost:*" // WebSockets en desarrollo
      ],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
const port = config.port;

// Configuración de CORS
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (Postman, curl, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    
    // Verificar si el origen está en la lista de permitidos
    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // En desarrollo, permitir cualquier localhost/127.0.0.1
    if (config.nodeEnv === 'development') {
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      if (isLocalhost) {
        return callback(null, true);
      }
    }
    
    console.warn(`⚠️  Origen bloqueado por CORS: ${origin}`);
    console.warn(`   Orígenes permitidos: ${config.allowedOrigins.join(', ')}`);
    callback(new Error('No permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Cache preflight por 24 horas
}));

// Configuración de body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== RATE LIMITING =====
// Rate limiter global (aumentado para desarrollo)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // 500 requests por IP (aumentado de 100)
  message: { error: 'Demasiadas solicitudes, por favor intenta más tarde' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 intentos de login por 15 minutos (aumentado para desarrollo)
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos de login, intenta en 15 minutos' }
});

// Rate limiter para scraping (aumentado para desarrollo)
const scrapingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 scrapes por minuto (aumentado de 10)
  message: { error: 'Límite de scraping alcanzado, espera un momento' }
});

// Aplicar limiters
app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/scrape', scrapingLimiter);
app.use('/scrape-single', scrapingLimiter);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Ruta principal que sirve login.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Ruta del scraper (protegida en el frontend con JWT - solo admin)
app.get("/scraper", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "scraper.html"));
});

// Ruta de mis fuentes (protegida en el frontend con JWT - usuarios normales)
app.get("/my-sources", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "my-sources.html"));
});

// Ruta de mis artículos guardados (protegida en el frontend con JWT)
app.get("/my-articles", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "my-articles.html"));
});

// Ruta de menciones de entidades (protegida en el frontend con JWT)
app.get("/entity-mentions", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "entity-mentions.html"));
});

// Ruta del panel de administración (protegida en el frontend con JWT - solo admin)
app.get("/admin-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-dashboard.html"));
});

// Ruta del lector de artículos (protegida en el frontend con JWT)
app.get("/article-reader", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "article-reader.html"));
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar estado del servidor
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uptime:
 *                   type: number
 *                   description: Tiempo de actividad del servidor en segundos
 *                 timestamp:
 *                   type: number
 *                   description: Timestamp actual
 *                 status:
 *                   type: string
 *                   enum: [ok, degraded]
 *                   description: Estado del servidor
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       enum: [ok, error]
 *                       description: Estado de la base de datos
 *       503:
 *         description: Servidor con problemas
 */
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok',
    services: {}
  };

  // Verificar BD
  try {
    const prisma = require('./src/config/database');
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'ok';
  } catch (error) {
    health.services.database = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Rutas de autenticación (públicas)
app.use('/api/auth', authRoutes);

// 🔧 Rutas temporales para desarrollo (ELIMINAR EN PRODUCCIÓN)
app.use('/api/temp', tempGenerateSummariesRoutes);
app.use('/api/simple', simpleGenerateSummariesRoutes);

// Rutas de scraping (protegidas)
// Rutas base: /scrape, /scrape-single, /rewrite-with-ai
app.use('/', scrapingRoutes);
// Rutas de guardado: /api/scraping/save, /api/scraping/history, /api/scraping/content/:id
app.use('/api/scraping', scrapingRoutes);

// Rutas de URLs (protegidas)
app.use('/api', urlsRoutes);

// Rutas de estadísticas (protegidas)
app.use('/api', statsRoutes);

// Rutas de búsqueda avanzada (protegidas)
app.use('/api/search', searchRoutes);

// Rutas de gestión de colas (protegidas)
app.use('/api/queue', queueRoutes);

// Rutas de administración de caché (protegidas)
app.use('/api/cache', cacheRoutes);

// Rutas de configuración de sitios (públicas y protegidas)
app.use('/api/site-configs', siteConfigRoutes);

// 📰 Rutas de noticias (incluye humanización)
app.use('/api/news', newsRoutes);

// 🧠 Rutas de noticias humanizadas
app.use('/api/news/humanized', humanizedNewsRoutes);

// Rutas de debugging y testing (protegidas)
// app.use('/api/debug', debugRoutes); // ❌ Eliminado - no para producción

// 🔹 Rutas de URLs públicas (admin y usuarios)
app.use('/api/public-urls', publicUrlsRoutes);

// 🔹 Rutas de selecciones de usuario
app.use('/api/my-urls', userUrlSelectionsRoutes);

// 🔹 Rutas de artículos guardados/favoritos
app.use('/api/saved-articles', savedArticlesRoutes);

// 🔹 FASE 4: Rutas de métricas
app.use('/api/metrics', metricsRoutes);

// 🧹 Rutas de limpieza automática
app.use('/api/cleanup', cleanupRoutes);

// 🔍 Rutas de monitoreo de entidades
app.use('/api/entities', entityRoutes);

// ⭐ Rutas de noticias destacadas
app.use('/api/highlights', highlightsRoutes);

// 📊 Rutas de monitoreo de tokens IA
app.use('/api/ai-usage', aiUsageRoutes);

// 🧪 Rutas de test simple
app.use('/api/simple-test', simpleTestRoutes);

// 👥 Rutas de gestión de usuarios
app.use('/api/users', usersRoutes);

// 🔧 Rutas de gestión de sitios (admin) - Movido a Next.js API routes
// app.use('/api/admin/sites', adminSitesRoutes);

// 📚 Documentación de la API con Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Documentación API - Scraping de Noticias"
}));

// Middleware para manejar errores
app.use(errorHandler);

// Inicializar Token Tracker
tokenTracker.initialize().catch(err => {
  console.error('⚠️ Error inicializando Token Tracker:', err);
});

// Configurar cron job(s) para scraping automático
if (config.scrapingEnabled) {
  // Soporta múltiples horarios separados por coma
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
} else {
  console.log('⚠️ Scraping automático deshabilitado por configuración');
}

// Configurar cron job para limpieza automática de noticias antiguas
if (config.cleanupEnabled) {
  const { cleanupOldNews } = require('./src/services/cleanup.service');
  
  console.log(`🧹 Configurando limpieza automática: ${config.cleanupSchedule} (${config.cleanupTimezone})`);
  console.log(`   Retención: ${config.cleanupRetentionDays} días`);
  
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
} else {
  console.log('⚠️ Limpieza automática deshabilitada por configuración');
}

// Iniciar worker de BullMQ solo en servidores dedicados (NO en Vercel)
let worker = null;
const isProduction = process.env.NODE_ENV === 'production';
const enableWorker = process.env.ENABLE_WORKER === 'true';
const hasRedis = !!process.env.REDIS_URL;

// Verificar si estamos en Vercel
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

if (isVercel) {
  console.log('⚠️ VERCEL DETECTADO - Worker de BullMQ deshabilitado');
  console.log('💡 Para procesamiento en background:');
  console.log('   1. Deploy el worker en Railway/Render');
  console.log('   2. O usa Vercel Background Functions (requiere plan Pro)');
  console.log('   3. El sistema funcionará normalmente, pero sin jobs en background');
} else if (!hasRedis) {
  console.log('⚠️ REDIS_URL no configurado - Worker de BullMQ deshabilitado');
} else if (!enableWorker) {
  console.log('⚠️ ENABLE_WORKER=false - Worker de BullMQ deshabilitado manualmente');
  console.log('💡 Para habilitar: ENABLE_WORKER=true en .env');
} else {
  try {
    const { createWorker } = require('./src/services/queueService');
    worker = createWorker();
    console.log('✅ Worker de BullMQ iniciado');
  } catch (error) {
    console.error('⚠️ No se pudo iniciar worker de BullMQ:', error.message);
    console.log('💡 El sistema funcionará sin procesamiento en background');
  }
}

const server = app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  
  if (config.scrapingEnabled) {
    const schedules = config.scrapingSchedules.split(',').map(s => s.trim());
    console.log(`🤖 Scraping automático configurado:`);
    schedules.forEach((schedule, index) => {
      console.log(`   #${index + 1}: ${schedule} (${config.scrapingTimezone})`);
    });
  } else {
    console.log('⚠️ Scraping automático deshabilitado');
  }
  
  if (worker) {
    console.log('🔄 Sistema de colas BullMQ activo');
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📊 SIGTERM recibido, cerrando Token Tracker...');
  await tokenTracker.shutdown();
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('📊 SIGINT recibido, cerrando Token Tracker...');
  await tokenTracker.shutdown();
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});
