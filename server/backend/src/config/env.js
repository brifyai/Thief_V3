require('dotenv').config();

// ===== VALIDACIONES CRÍTICAS DE SEGURIDAD =====
const isProduction = process.env.NODE_ENV === 'production';

// Validar JWT_SECRET
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET no está configurado en las variables de entorno');
  console.error('   Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ FATAL: JWT_SECRET debe tener al menos 32 caracteres');
  console.error('   Actual:', process.env.JWT_SECRET.length, 'caracteres');
  process.exit(1);
}

// Validar CHUTES_API_KEY (anteriormente GROQ_API_KEY)
if (!process.env.CHUTES_API_KEY) {
  console.error('❌ FATAL: CHUTES_API_KEY no está configurado');
  process.exit(1);
}

// Validar DATABASE_URL (solo en producción)
if (!process.env.DATABASE_URL && isProduction) {
  console.error('❌ FATAL: DATABASE_URL no está configurado en producción');
  process.exit(1);
}

// En desarrollo, permitir modo sin base de datos
if (!process.env.DATABASE_URL && !isProduction) {
  console.warn('⚠️ DATABASE_URL no configurado - ejecutando en modo demo sin base de datos');
  process.env.DATABASE_URL = 'postgresql://demo:demo@localhost:5432/scraper_demo';
  process.env.DEMO_MODE = 'true';
}

// Validaciones específicas de producción
if (isProduction) {
  if (!process.env.ALLOWED_ORIGINS) {
    console.error('❌ FATAL: ALLOWED_ORIGINS debe estar configurado en producción');
    process.exit(1);
  }
  
  // Validar que todos los orígenes usen HTTPS en producción
  const origins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  const hasInsecure = origins.some(o => o.startsWith('http://') && !o.includes('localhost'));
  
  if (hasInsecure) {
    console.error('❌ FATAL: Todos los orígenes deben usar HTTPS en producción');
    console.error('   Orígenes actuales:', origins);
    process.exit(1);
  }
}

// ===== CONFIGURACIÓN =====
const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT - Sin fallback inseguro
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  
  // Chutes AI API (anteriormente Groq)
  chutesApiKey: process.env.CHUTES_API_KEY,
  aiModel: process.env.AI_MODEL || 'gpt-4-turbo',
  aiReasoningEffort: process.env.AI_REASONING_EFFORT || 'medium',
  
  // CORS - Validado en producción
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Configuración de Scraping Automático
  scrapingEnabled: process.env.SCRAPING_ENABLED !== 'false',
  scrapingSchedules: process.env.SCRAPING_SCHEDULES || '0 2 * * *',
  scrapingTimezone: process.env.SCRAPING_TIMEZONE || 'America/Santiago',
  scrapingDelayMs: parseInt(process.env.SCRAPING_DELAY_MS || '1000', 10),
  
  // Optimizaciones de Scraping
  scrapingConcurrency: parseInt(process.env.SCRAPING_CONCURRENCY || '5', 10),
  scrapingCacheTTL: parseInt(process.env.SCRAPING_CACHE_TTL || '3600', 10),
  paywallDetectionEnabled: process.env.PAYWALL_DETECTION_ENABLED !== 'false',
  
  // Configuración de Limpieza Automática
  cleanupEnabled: process.env.CLEANUP_ENABLED !== 'false',
  cleanupRetentionDays: parseInt(process.env.CLEANUP_RETENTION_DAYS || '30', 10),
  cleanupSchedule: process.env.CLEANUP_SCHEDULE || '0 3 * * 0', // Domingos 3 AM por defecto
  cleanupTimezone: process.env.CLEANUP_TIMEZONE || 'America/Santiago',
};

console.log('✅ Configuración validada correctamente');
console.log(`   Entorno: ${config.nodeEnv}`);
console.log(`   Proveedor IA: Chutes AI (${config.aiModel})`);
console.log(`   Orígenes CORS: ${config.allowedOrigins.length} configurados`);
console.log(`   Limpieza automática: ${config.cleanupEnabled ? 'Habilitada' : 'Deshabilitada'} (${config.cleanupRetentionDays} días)`);

module.exports = config;
