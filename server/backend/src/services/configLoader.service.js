const fs = require('fs');
const path = require('path');
const { loggers } = require('../utils/logger');

const logger = loggers.scraping;

/**
 * Servicio para cargar y gestionar configuraciones de sitios específicos
 */
class ConfigLoader {
  constructor() {
    this.configs = null;
    this.configPath = path.join(__dirname, '../config/site-configs.json');
    this.lastLoadTime = null;
    
    // Cargar configuraciones al inicializar
    this.loadConfigs();
  }

  /**
   * Carga las configuraciones desde el archivo JSON
   * @returns {boolean} true si la carga fue exitosa
   */
  loadConfigs() {
    try {
      // Verificar si el archivo existe
      if (!fs.existsSync(this.configPath)) {
        logger.warn('Archivo site-configs.json no encontrado. Usando scraper genérico para todos los sitios.');
        this.configs = { sites: [] };
        return false;
      }

      // Leer el archivo
      const fileContent = fs.readFileSync(this.configPath, 'utf-8');
      
      // Parsear JSON
      const parsedConfig = JSON.parse(fileContent);
      
      // Validar estructura básica
      if (!parsedConfig.sites || !Array.isArray(parsedConfig.sites)) {
        throw new Error('Estructura de configuración inválida: se esperaba un array "sites"');
      }

      // Validar cada configuración de sitio
      parsedConfig.sites.forEach((site, index) => {
        if (!site.domain) {
          throw new Error(`Configuración de sitio en índice ${index} no tiene campo "domain"`);
        }
        if (!site.selectors) {
          throw new Error(`Configuración de sitio "${site.domain}" no tiene campo "selectors"`);
        }
      });

      this.configs = parsedConfig;
      this.lastLoadTime = new Date();
      
      const enabledSites = parsedConfig.sites.filter(s => s.enabled !== false);
      logger.info(`✅ Configuraciones cargadas exitosamente: ${enabledSites.length} sitios activos`);
      
      return true;
    } catch (error) {
      logger.error('Error al cargar configuraciones de sitios', error);
      
      // En caso de error, usar configuración vacía
      this.configs = { sites: [] };
      return false;
    }
  }

  /**
   * Recarga las configuraciones desde el archivo
   * Útil para actualizar sin reiniciar el servidor
   * @returns {boolean} true si la recarga fue exitosa
   */
  reloadConfigs() {
    logger.info('🔄 Recargando configuraciones de sitios...');
    return this.loadConfigs();
  }

  /**
   * Obtiene la configuración para un dominio específico
   * @param {string} url - URL completa o dominio
   * @returns {object|null} Configuración del sitio o null si no existe
   */
  getConfigForDomain(url) {
    if (!this.configs || !this.configs.sites) {
      return null;
    }

    // Extraer dominio de la URL si es necesario
    let domain = url;
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
      }
    } catch (e) {
      // Si falla el parseo, usar el string original
    }

    // Buscar configuración que coincida con el dominio
    const config = this.configs.sites.find(site => {
      if (!site.enabled && site.enabled !== undefined) {
        return false;
      }
      
      // Verificar si el dominio contiene el dominio configurado
      return domain.includes(site.domain) || site.domain.includes(domain);
    });

    if (config) {
      logger.debug(`📋 Configuración encontrada para dominio: ${domain} -> ${config.name}`);
    }

    return config || null;
  }

  /**
   * Obtiene todas las configuraciones de sitios
   * @param {boolean} onlyEnabled - Si es true, solo retorna sitios habilitados
   * @returns {array} Array de configuraciones de sitios
   */
  getAllConfigs(onlyEnabled = true) {
    if (!this.configs || !this.configs.sites) {
      return [];
    }

    if (onlyEnabled) {
      return this.configs.sites.filter(site => site.enabled !== false);
    }

    return this.configs.sites;
  }

  /**
   * Verifica si existe una configuración específica para un dominio
   * @param {string} url - URL o dominio
   * @returns {boolean} true si existe configuración
   */
  hasConfigForDomain(url) {
    return this.getConfigForDomain(url) !== null;
  }

  /**
   * Obtiene información sobre el estado del loader
   * @returns {object} Información del estado
   */
  getStatus() {
    return {
      configsLoaded: this.configs !== null,
      totalSites: this.configs ? this.configs.sites.length : 0,
      enabledSites: this.getAllConfigs(true).length,
      lastLoadTime: this.lastLoadTime,
      configPath: this.configPath
    };
  }

  /**
   * Aplica reglas de limpieza de texto según la configuración del sitio
   * @param {string} text - Texto a limpiar
   * @param {object} config - Configuración del sitio
   * @returns {string} Texto limpio
   */
  applyCleaningRules(text, config) {
    if (!text || !config || !config.cleaningRules || config.cleaningRules.length === 0) {
      return text;
    }

    let cleanedText = text;

    config.cleaningRules.forEach(rule => {
      if (rule.type === 'regex' && rule.pattern) {
        try {
          const regex = new RegExp(rule.pattern, 'g');
          cleanedText = cleanedText.replace(regex, '');
        } catch (error) {
          logger.warn(`Error aplicando regla de limpieza: ${rule.description}`, error);
        }
      }
    });

    return cleanedText;
  }
}

// Crear instancia singleton
const configLoader = new ConfigLoader();

module.exports = configLoader;
