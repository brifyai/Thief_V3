/**
 * Sistema de logging mejorado con niveles y timestamps
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor(context = 'APP') {
    this.context = context;
    this.level = process.env.LOG_LEVEL 
      ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] 
      : (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.context}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  error(message, error = null) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', message));
      if (error) {
        console.error('Stack trace:', error.stack || error);
      }
    }
  }

  warn(message, data = null) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  info(message, data = null) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('INFO', message, data));
    }
  }

  debug(message, data = null) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  // Métodos especializados
  scrapingStart(url) {
    this.info(`🔍 Iniciando scraping: ${url}`);
  }

  scrapingSuccess(url, count) {
    this.info(`✅ Scraping exitoso: ${url} - ${count} items encontrados`);
  }

  scrapingError(url, error) {
    this.error(`❌ Error en scraping: ${url}`, error);
  }

  apiCall(service, endpoint) {
    this.debug(`📡 Llamada API: ${service} - ${endpoint}`);
  }

  apiSuccess(service, duration) {
    this.debug(`✅ API exitosa: ${service} - ${duration}ms`);
  }

  apiError(service, error) {
    this.error(`❌ Error API: ${service}`, error);
  }

  dbQuery(operation, table) {
    this.debug(`💾 DB Query: ${operation} en ${table}`);
  }

  dbError(operation, error) {
    this.error(`❌ Error DB: ${operation}`, error);
  }
}

// Instancias por contexto
const loggers = {
  scraping: new Logger('SCRAPING'),
  api: new Logger('API'),
  database: new Logger('DATABASE'),
  auth: new Logger('AUTH'),
  general: new Logger('APP')
};

module.exports = {
  Logger,
  loggers,
  LOG_LEVELS
};
