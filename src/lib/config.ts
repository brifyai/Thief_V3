// Configuración centralizada y segura de la aplicación
export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10), // 30 segundos
    retries: parseInt(process.env.NEXT_PUBLIC_API_RETRIES || '3', 10),
  },
  
  // Authentication
  auth: {
    tokenKey: 'auth_token',
    refreshTokenKey: 'refresh_token',
    sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '3600000', 10), // 1 hora
  },
  
  // Application Settings
  app: {
    name: 'AI Scraper',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.NODE_ENV === 'development',
  },
  
  // Scraping Configuration
  scraping: {
    maxRetries: parseInt(process.env.NEXT_PUBLIC_SCRAPING_MAX_RETRIES || '3', 10),
    defaultTimeout: parseInt(process.env.NEXT_PUBLIC_SCRAPING_TIMEOUT || '30000', 10),
    maxConcurrentRequests: parseInt(process.env.NEXT_PUBLIC_MAX_CONCURRENT_REQUESTS || '5', 10),
  },
  
  // UI Configuration
  ui: {
    theme: process.env.NEXT_PUBLIC_DEFAULT_THEME || 'system',
    language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'es',
    pageSize: parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE || '20', 10),
  },
  
  // Feature Flags
  features: {
    enableAI: process.env.NEXT_PUBLIC_ENABLE_AI === 'true',
    enableEntities: process.env.NEXT_PUBLIC_ENABLE_ENTITIES === 'true',
    enableAdvancedSelectors: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_SELECTORS === 'true',
    enableRealTimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES === 'true',
  },
  
  // Monitoring and Analytics
  monitoring: {
    enableErrorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING === 'true',
    enablePerformanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
    enableUserAnalytics: process.env.NEXT_PUBLIC_ENABLE_USER_ANALYTICS === 'true',
  },
};

// Validación de configuración crítica
export const validateConfig = (): void => {
  const errors: string[] = [];
  
  // Validar URL base de API
  try {
    new URL(config.api.baseUrl);
  } catch {
    errors.push('NEXT_PUBLIC_API_URL no es una URL válida');
  }
  
  // Validar timeouts
  if (config.api.timeout < 1000) {
    errors.push('NEXT_PUBLIC_API_TIMEOUT debe ser al menos 1000ms');
  }
  
  if (config.scraping.defaultTimeout < 5000) {
    errors.push('NEXT_PUBLIC_SCRAPING_TIMEOUT debe ser al menos 5000ms');
  }
  
  // Validar límites
  if (config.scraping.maxConcurrentRequests < 1 || config.scraping.maxConcurrentRequests > 20) {
    errors.push('NEXT_PUBLIC_MAX_CONCURRENT_REQUESTS debe estar entre 1 y 20');
  }
  
  if (errors.length > 0) {
    console.error('❌ Errores de configuración:', errors);
    if (config.app.environment === 'production') {
      throw new Error(`Configuración inválida: ${errors.join(', ')}`);
    }
  } else {
    console.log('✅ Configuración validada exitosamente');
  }
};

// Inicializar configuración
if (typeof window !== 'undefined') {
  validateConfig();
}

// Exportar utilidades de configuración
export const isDevelopment = () => config.app.environment === 'development';
export const isProduction = () => config.app.environment === 'production';
export const isFeatureEnabled = (feature: keyof typeof config.features) => config.features[feature];