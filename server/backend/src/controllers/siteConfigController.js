const siteConfigService = require('../services/siteConfigService');
const { loggers } = require('../utils/logger');

const logger = loggers.scraping;

/**
 * POST /api/site-configs/test
 * Prueba selectores en una URL sin guardar
 */
const testSelectors = async (req, res) => {
  try {
    const { url, selectors, listingSelectors } = req.body;
    
    // Validación de entrada
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL es requerida'
      });
    }
    
    if (!selectors || !selectors.titleSelector || !selectors.contentSelector) {
      return res.status(400).json({
        success: false,
        error: 'Selectores de título y contenido son requeridos'
      });
    }
    
    // Validar selectores de listado si se proporcionan
    if (listingSelectors) {
      if (!listingSelectors.containerSelector || !listingSelectors.linkSelector) {
        return res.status(400).json({
          success: false,
          error: 'Selectores de listado requieren containerSelector y linkSelector'
        });
      }
    }
    
    logger.info(`🧪 Test de selectores solicitado para: ${url}`);
    if (listingSelectors) {
      logger.info(`📋 Usando flujo de listado → artículos individuales`);
    }
    
    // Probar selectores
    const result = await siteConfigService.testSelectors(url, selectors, listingSelectors);
    
    // Construir respuesta según el método usado
    const response = {
      success: result.success,
      preview: result.preview,
      confidence: result.confidence,
      validation: result.validation,
      method: result.method || 'direct'
    };
    
    // Agregar información específica según el método
    if (result.method === 'listing') {
      response.listingTest = result.listingTest;
      response.articleTests = result.articleTests;
      response.message = result.success
        ? `Selectores válidos: ${result.listingTest.totalSuccessful}/${result.listingTest.totalTested} artículos exitosos (${result.listingTest.successRate}%)`
        : 'Los selectores no extrajeron contenido válido de los artículos individuales';
    } else {
      response.message = result.success
        ? 'Selectores válidos y funcionando correctamente'
        : 'Los selectores no extrajeron contenido válido';
    }
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error en test de selectores:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error al probar selectores',
      details: error.message
    });
  }
};

/**
 * POST /api/site-configs
 * Crea una nueva configuración de sitio
 */
const createConfig = async (req, res) => {
  try {
    const { domain, name, selectors, listingSelectors, cleaningRules, testUrl } = req.body;
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    // Validación de entrada
    if (!domain || !name) {
      return res.status(400).json({
        success: false,
        error: 'Domain y name son requeridos'
      });
    }
    
    if (!selectors || !selectors.titleSelector || !selectors.contentSelector) {
      return res.status(400).json({
        success: false,
        error: 'Selectores de título y contenido son requeridos'
      });
    }
    
    logger.info(`💾 Creación de config solicitada para: ${domain} por usuario ${userId}`);
    
    // Determinar confidence basado en la presencia de selectores
    let confidence = 0.5; // Confianza por defecto
    
    // Si hay selectores de listado, es una configuración más completa
    const hasListingSelectors = listingSelectors && 
                               listingSelectors.containerSelector && 
                               listingSelectors.linkSelector;
    
    if (hasListingSelectors) {
      confidence = 0.7; // Mayor confianza si tiene selectores de listado
      logger.info(`📋 Configuración incluye selectores de listado, confidence: ${confidence}`);
    }
    
    // NO VALIDAR - Solo guardar directamente
    logger.info(`✅ Guardando configuración sin validación previa`)
    
    // Guardar configuración
    const config = await siteConfigService.saveConfig({
      domain,
      name,
      selectors,
      listingSelectors,
      cleaningRules,
      confidence
    }, userId);
    
    res.status(201).json({
      success: true,
      config,
      message: 'Configuración creada exitosamente'
    });
    
  } catch (error) {
    logger.error('Error creando configuración:', error);
    
    const statusCode = error.message.includes('Ya existe') ? 409 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Error al crear configuración'
    });
  }
};

/**
 * GET /api/site-configs/:domain
 * Obtiene configuración de un dominio específico
 */
const getConfig = async (req, res) => {
  try {
    const { domain } = req.params;
    
    logger.info(`📋 Consulta de config para: ${domain}`);
    
    const result = await siteConfigService.getConfigByDomain(domain);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Configuración no encontrada'
      });
    }
    
    res.json({
      success: true,
      config: result.config,
      stats: result.stats
    });
    
  } catch (error) {
    logger.error('Error obteniendo configuración:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error al obtener configuración'
    });
  }
};

/**
 * PUT /api/site-configs/:domain
 * Actualiza una configuración existente
 */
const updateConfig = async (req, res) => {
  try {
    const { domain } = req.params;
    const { name, selectors, listingSelectors, cleaningRules, isActive, testUrl } = req.body;
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    logger.info(`✏️ Actualización de config solicitada para: ${domain} por usuario ${userId}`);
    
    // Si se proporcionan nuevos selectores y testUrl, validarlos primero
    if (selectors && testUrl) {
      try {
        const testResult = await siteConfigService.testSelectors(testUrl, selectors);
        
        if (!testResult.success) {
          return res.status(400).json({
            success: false,
            error: 'Los nuevos selectores no extrajeron contenido válido',
            preview: testResult.preview,
            validation: testResult.validation
          });
        }
      } catch (testError) {
        return res.status(400).json({
          success: false,
          error: 'Error al validar nuevos selectores',
          details: testError.message
        });
      }
    }
    
    // Actualizar configuración
    const config = await siteConfigService.updateConfig(domain, {
      name,
      selectors,
      listingSelectors,
      cleaningRules,
      isActive
    }, userId);
    
    res.json({
      success: true,
      config,
      message: 'Configuración actualizada exitosamente'
    });
    
  } catch (error) {
    logger.error('Error actualizando configuración:', error);
    
    const statusCode = error.message.includes('permisos') ? 403 : 
                       error.message.includes('no encontrada') ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Error al actualizar configuración'
    });
  }
};

/**
 * POST /api/site-configs/:domain/verify
 * Verifica que una configuración funciona correctamente
 */
const verifyConfig = async (req, res) => {
  try {
    const { domain } = req.params;
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    logger.info(`✅ Verificación de config solicitada para: ${domain} por usuario ${userId}`);
    
    const result = await siteConfigService.verifyConfig(domain, userId);
    
    res.json({
      success: true,
      verificationCount: result.verificationCount,
      isVerified: result.isVerified,
      message: result.isVerified 
        ? 'Configuración verificada exitosamente'
        : `Verificación agregada (${result.verificationCount}/3)`
    });
    
  } catch (error) {
    logger.error('Error verificando configuración:', error);
    
    const statusCode = error.message.includes('no encontrada') ? 404 :
                       error.message.includes('Ya has verificado') ? 409 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Error al verificar configuración'
    });
  }
};

/**
 * GET /api/site-configs
 * Lista todas las configuraciones con filtros
 */
const listConfigs = async (req, res) => {
  try {
    const { active, verified, domain, createdBy, page = 1, limit = 20 } = req.query;
    
    logger.info(`📋 Listado de configs solicitado (page: ${page})`);
    
    const filters = {};
    if (active !== undefined) filters.active = active;
    if (verified !== undefined) filters.verified = verified;
    if (domain) filters.domain = domain;
    if (createdBy) filters.createdBy = createdBy;
    
    const result = await siteConfigService.listConfigs(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    
    res.json({
      success: true,
      configs: result.configs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
    
  } catch (error) {
    logger.error('Error listando configuraciones:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error al listar configuraciones'
    });
  }
};

/**
 * DELETE /api/site-configs/:domain
 * Desactiva una configuración (soft delete)
 */
const deleteConfig = async (req, res) => {
  try {
    const { domain } = req.params;
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    logger.info(`🗑️ Desactivación de config solicitada para: ${domain} por usuario ${userId}`);
    
    // Desactivar en lugar de eliminar
    const config = await siteConfigService.updateConfig(domain, {
      isActive: false
    }, userId);
    
    res.json({
      success: true,
      message: 'Configuración desactivada exitosamente'
    });
    
  } catch (error) {
    logger.error('Error desactivando configuración:', error);
    
    const statusCode = error.message.includes('permisos') ? 403 : 
                       error.message.includes('no encontrada') ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Error al desactivar configuración'
    });
  }
};

module.exports = {
  testSelectors,
  createConfig,
  getConfig,
  updateConfig,
  verifyConfig,
  listConfigs,
  deleteConfig
};
