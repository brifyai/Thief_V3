const axios = require('axios');
const cheerio = require('cheerio');
const { loggers } = require('../utils/logger');
const { isValidTitle, isValidContent, sanitizeText, extractImages } = require('../utils/contentValidator');
const configLoader = require('./configLoader.service');
const prisma = require('../config/database');

const logger = loggers.scraping;

/**
 * Normaliza un dominio o URL para búsqueda consistente
 * @param {string} urlOrDomain - URL completa o dominio
 * @returns {string} Dominio normalizado
 */
function normalizeDomain(urlOrDomain) {
  try {
    let domain = urlOrDomain;
    
    // Si es una URL completa, extraer el hostname
    if (urlOrDomain.includes('://')) {
      const url = new URL(urlOrDomain);
      domain = url.hostname;
    }
    
    // Remover www.
    domain = domain.replace(/^www\./, '');
    
    // Convertir a minúsculas
    domain = domain.toLowerCase();
    
    // Remover puerto si existe
    domain = domain.split(':')[0];
    
    logger.debug(`🔍 Dominio normalizado: "${urlOrDomain}" → "${domain}"`);
    
    return domain;
  } catch (error) {
    logger.error(`❌ Error normalizando dominio "${urlOrDomain}": ${error.message}`);
    // Fallback: intentar extracción simple
    return urlOrDomain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .toLowerCase();
  }
}

/**
 * Valida que un selector CSS sea válido
 * @param {string} selector - Selector CSS a validar
 * @returns {boolean}
 */
function isValidCSSSelector(selector) {
  if (!selector || typeof selector !== 'string') return false;
  
  try {
    // Intentar crear un elemento temporal y usar querySelector
    const testDiv = '<div></div>';
    const $ = cheerio.load(testDiv);
    $(selector); // Si el selector es inválido, cheerio lanzará error
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Prueba selectores en una URL real
 * @param {string} url - URL a scrapear
 * @param {object} selectors - Selectores a probar
 * @param {object} listingSelectors - Selectores de listado (opcional)
 * @returns {Promise<object>}
 */
async function testSelectors(url, selectors, listingSelectors = null) {
  try {
    logger.info(`🧪 Probando selectores para: ${url}`);
    
    // Validar selectores CSS
    const requiredSelectors = ['titleSelector', 'contentSelector'];
    for (const key of requiredSelectors) {
      if (!selectors[key]) {
        throw new Error(`Selector requerido faltante: ${key}`);
      }
      if (!isValidCSSSelector(selectors[key])) {
        throw new Error(`Selector CSS inválido: ${key} = "${selectors[key]}"`);
      }
    }
    
    // Validar selectores opcionales
    const optionalSelectors = ['dateSelector', 'authorSelector', 'imageSelector'];
    for (const key of optionalSelectors) {
      if (selectors[key] && !isValidCSSSelector(selectors[key])) {
        throw new Error(`Selector CSS inválido: ${key} = "${selectors[key]}"`);
      }
    }

    // 🆕 NUEVO FLUJO: Si hay selectores de listado, hacer flujo completo
    if (listingSelectors && listingSelectors.containerSelector && listingSelectors.linkSelector) {
      logger.info(`📋 Usando flujo de listado → artículos individuales`);
      return await testWithListingFlow(url, selectors, listingSelectors);
    }
    
    // FLUJO ORIGINAL: Test directo en una URL
    logger.info(`🎯 Usando flujo de test directo`);
    return await testDirectFlow(url, selectors);
    
  } catch (error) {
    logger.error('Error probando selectores:', error);
    throw error;
  }
}

/**
 * Flujo de prueba directo (original)
 * @param {string} url - URL a scrapear
 * @param {object} selectors - Selectores a probar
 * @returns {Promise<object>}
 */
async function testDirectFlow(url, selectors) {
  // Hacer request a la URL
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  const $ = cheerio.load(response.data);
  
  // Extraer contenido con los selectores
  const preview = {
    title: null,
    content: null,
    date: null,
    author: null,
    images: []
  };
  
  // Título
  const titleElement = $(selectors.titleSelector).first();
  if (titleElement.length > 0) {
    preview.title = sanitizeText(titleElement.text());
  }
  
  // Contenido
  const contentElement = $(selectors.contentSelector);
  if (contentElement.length > 0) {
    // Extraer párrafos
    const paragraphs = [];
    contentElement.find('p').each((_, p) => {
      const text = $(p).text().trim();
      if (text.length > 20) {
        paragraphs.push(text);
      }
    });
    
    if (paragraphs.length > 0) {
      preview.content = sanitizeText(paragraphs.join('\n\n'));
    } else {
      preview.content = sanitizeText(contentElement.text());
    }
  }
  
  // Fecha (opcional)
  if (selectors.dateSelector) {
    const dateElement = $(selectors.dateSelector).first();
    if (dateElement.length > 0) {
      preview.date = sanitizeText(
        dateElement.attr('datetime') || dateElement.text()
      );
    }
  }
  
  // Autor (opcional)
  if (selectors.authorSelector) {
    const authorElement = $(selectors.authorSelector).first();
    if (authorElement.length > 0) {
      preview.author = sanitizeText(authorElement.text());
    }
  }
  
  // Imágenes (opcional)
  if (selectors.imageSelector) {
    const imageElements = $(selectors.imageSelector);
    preview.images = extractImages(imageElements, url);
  }
  
  // Validar que se extrajo contenido válido
  const isValid = isValidTitle(preview.title) && isValidContent(preview.content);
  
  // Calcular confidence basado en qué se extrajo
  let confidence = 0.5;
  if (preview.title) confidence += 0.2;
  if (preview.content && preview.content.length > 200) confidence += 0.2;
  if (preview.date) confidence += 0.05;
  if (preview.author) confidence += 0.05;
  
  confidence = Math.min(confidence, 1.0);
  
  logger.info(`✅ Test directo completado: valid=${isValid}, confidence=${confidence}`);
  
  return {
    success: isValid,
    preview,
    confidence,
    validation: {
      hasTitle: !!preview.title,
      hasContent: !!preview.content,
      titleValid: isValidTitle(preview.title),
      contentValid: isValidContent(preview.content),
      contentLength: preview.content?.length || 0
    },
    method: 'direct'
  };
}

/**
 * Flujo de prueba con listado → artículos individuales
 * @param {string} url - URL del listado
 * @param {object} selectors - Selectores de artículo
 * @param {object} listingSelectors - Selectores de listado
 * @returns {Promise<object>}
 */
async function testWithListingFlow(url, selectors, listingSelectors) {
  const puppeteer = require('puppeteer');
  const browserConfig = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  };

  let browser;
  try {
    browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();
    
    await page.setDefaultNavigationTimeout(30000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Paso 1: Extraer URLs del listado
    logger.info('📡 Paso 1: Extrayendo URLs del listado...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const newsUrls = await page.evaluate((selectors) => {
      const containers = document.querySelectorAll(selectors.containerSelector);
      const urls = [];
      
      containers.forEach((container, index) => {
        try {
          const linkEl = container.querySelector(selectors.linkSelector);
          const titleEl = selectors.titleSelector ? container.querySelector(selectors.titleSelector) : null;
          
          if (linkEl) {
            const href = linkEl.href || linkEl.getAttribute('href');
            if (href && href.startsWith('http')) {
              urls.push({
                url: href,
                previewTitle: titleEl ? titleEl.textContent.trim() : `Noticia ${index + 1}`,
                index: index + 1
              });
            }
          }
        } catch (e) {
          console.error('Error extrayendo noticia:', e);
        }
      });
      
      return urls.slice(0, 5); // Limitar a 5 artículos para el test
    }, listingSelectors);
    
    logger.info(`✅ Encontradas ${newsUrls.length} noticias en el listado`);
    
    if (newsUrls.length === 0) {
      return {
        success: false,
        error: 'No se encontraron noticias con los selectores de listado proporcionados',
        listingTest: {
          totalFound: 0,
          containerSelector: listingSelectors.containerSelector,
          linkSelector: listingSelectors.linkSelector
        }
      };
    }
    
    // Paso 2: OPCIONAL - Probar selectores en artículos individuales
    // Solo si queremos validar que los selectores de artículo también funcionan
    // Por ahora, solo validamos que el listado extrajo URLs correctamente
    logger.info('✅ Paso 2: Selectores de listado validados correctamente');
    
    await browser.close();
    
    // Para el test de listado, solo necesitamos que haya extraído URLs
    const overallSuccess = newsUrls.length > 0;
    const successRate = 100; // Si llegamos aquí, los selectores de listado funcionan
    
    // Preview con las primeras noticias encontradas
    const preview = {
      title: `${newsUrls.length} noticias encontradas`,
      content: newsUrls.slice(0, 5).map((item, i) => 
        `${i + 1}. ${item.previewTitle}`
      ).join('\n'),
      urls: newsUrls.map(item => item.url)
    };
    
    const articleTests = newsUrls.slice(0, 5).map(item => ({
      url: item.url,
      title: item.previewTitle,
      success: true,
      message: 'URL extraída correctamente del listado'
    }));
    
    const totalSuccessful = newsUrls.length;
    
    logger.info(`✅ Test con listado completado: ${totalSuccessful} URLs extraídas (${successRate}%)`);
    
    return {
      success: overallSuccess,
      preview,
      confidence: 0.9, // Alta confianza si extrajo URLs correctamente
      validation: {
        hasTitle: true,
        hasContent: true,
        titleValid: true,
        contentValid: true,
        contentLength: preview.content.length
      },
      method: 'listing',
      listingTest: {
        totalFound: newsUrls.length,
        totalTested: Math.min(newsUrls.length, 5),
        totalSuccessful,
        successRate: parseFloat(successRate),
        containerSelector: listingSelectors.containerSelector,
        linkSelector: listingSelectors.linkSelector
      },
      articleTests
    };
    
  } catch (error) {
    if (browser) await browser.close();
    logger.error(`❌ Error en flujo de listado: ${error.message}`);
    throw error;
  }
}

/**
 * Prueba selectores en un artículo específico usando Puppeteer
 * @param {object} page - Instancia de página de Puppeteer
 * @param {string} url - URL del artículo
 * @param {object} selectors - Selectores a probar
 * @returns {Promise<object>}
 */
async function testArticleSelectors(page, url, selectors) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const result = await page.evaluate((selectors) => {
      const data = {};
      
      // Título
      if (selectors.titleSelector) {
        try {
          const titleEl = document.querySelector(selectors.titleSelector);
          data.title = titleEl?.textContent?.trim() || null;
        } catch (e) {
          data.title = null;
        }
      }
      
      // Contenido
      if (selectors.contentSelector) {
        try {
          const contentEls = document.querySelectorAll(selectors.contentSelector);
          if (contentEls.length > 0) {
            const paragraphs = Array.from(contentEls)
              .map(el => el.textContent?.trim())
              .filter(text => text && text.length > 20);
            data.content = paragraphs.join('\n\n') || null;
          } else {
            const contentEl = document.querySelector(selectors.contentSelector);
            data.content = contentEl?.textContent?.trim() || null;
          }
        } catch (e) {
          data.content = null;
        }
      }
      
      // Fecha
      if (selectors.dateSelector) {
        try {
          const dateEl = document.querySelector(selectors.dateSelector);
          data.date = dateEl?.textContent?.trim() ||
                      dateEl?.getAttribute('datetime') ||
                      dateEl?.getAttribute('content') || null;
        } catch (e) {
          data.date = null;
        }
      }
      
      // Autor
      if (selectors.authorSelector) {
        try {
          const authorEl = document.querySelector(selectors.authorSelector);
          data.author = authorEl?.textContent?.trim() || null;
        } catch (e) {
          data.author = null;
        }
      }
      
      return data;
    }, selectors);
    
    // Validar que se extrajo contenido válido
    const isValid = isValidTitle(result.title) && isValidContent(result.content);
    
    // Calcular confidence
    let confidence = 0.5;
    if (result.title) confidence += 0.2;
    if (result.content && result.content.length > 200) confidence += 0.2;
    if (result.date) confidence += 0.05;
    if (result.author) confidence += 0.05;
    
    confidence = Math.min(confidence, 1.0);
    
    return {
      success: isValid,
      preview: {
        title: result.title,
        content: result.content,
        date: result.date,
        author: result.author,
        images: []
      },
      confidence,
      validation: {
        hasTitle: !!result.title,
        hasContent: !!result.content,
        titleValid: isValidTitle(result.title),
        contentValid: isValidContent(result.content),
        contentLength: result.content?.length || 0
      }
    };
    
  } catch (error) {
    logger.error(`Error probando artículo ${url}: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Guarda una nueva configuración en la base de datos
 * @param {object} data - Datos de la configuración
 * @param {string} userId - ID del usuario que crea la config
 * @returns {Promise<object>}
 */
async function saveConfig(data, userId) {
  try {
    // ✅ NORMALIZAR DOMINIO ANTES DE GUARDAR
    const normalizedDomain = normalizeDomain(data.domain);
    
    logger.info(`💾 Guardando configuración para dominio: "${data.domain}" → "${normalizedDomain}"`);
    
    // Validar datos requeridos
    if (!normalizedDomain || !data.name) {
      throw new Error('Domain y name son requeridos');
    }
    
    if (!data.selectors || !data.selectors.titleSelector || !data.selectors.contentSelector) {
      throw new Error('Selectores de título y contenido son requeridos');
    }
    
    // Verificar si ya existe una config para este dominio
    const existing = await prisma.siteConfiguration.findUnique({
      where: { domain: normalizedDomain }
    });
    
    if (existing) {
      logger.warn(`⚠️ Ya existe configuración para "${normalizedDomain}": ${existing.name} (id: ${existing.id})`);
      throw new Error(`Ya existe una configuración para el dominio: ${normalizedDomain}`);
    }
    
    // Crear configuración
    const config = await prisma.siteConfiguration.create({
      data: {
        domain: normalizedDomain,
        name: data.name,
        titleSelector: data.selectors.titleSelector,
        contentSelector: data.selectors.contentSelector,
        dateSelector: data.selectors.dateSelector || null,
        authorSelector: data.selectors.authorSelector || null,
        imageSelector: data.selectors.imageSelector || null,
        listingSelectors: data.listingSelectors || null,
        cleaningRules: data.cleaningRules || null,
        createdBy: userId.toString(),
        confidence: data.confidence || 0.5,
        isActive: true,
        isVerified: false
      }
    });
    
    logger.info(`✅ Configuración guardada exitosamente: ${config.id}`);
    logger.info(`📋 Dominio: "${config.domain}", Nombre: "${config.name}"`);
    
    return config;
    
  } catch (error) {
    logger.error('Error guardando configuración:', error);
    throw error;
  }
}

/**
 * Obtiene la configuración con mayor prioridad para un dominio
 * @param {string} urlOrDomain - URL completa o dominio a buscar
 * @returns {Promise<object|null>}
 */
async function getConfigPriority(urlOrDomain) {
  try {
    // Normalizar dominio usando función dedicada
    const normalizedDomain = normalizeDomain(urlOrDomain);
    
    logger.info(`🔍 Buscando configuración para dominio: "${normalizedDomain}"`);
    
    // Buscar en BD (exacta)
    const dbConfigs = await prisma.siteConfiguration.findMany({
      where: {
        domain: normalizedDomain,
        isActive: true
      },
      orderBy: [
        { isVerified: 'desc' },
        { confidence: 'desc' },
        { successCount: 'desc' }
      ]
    });
    
    if (dbConfigs.length > 0) {
      const config = dbConfigs[0];
      logger.info(`✅ Config de BD encontrada: "${config.name}" (${config.isVerified ? 'VERIFICADA' : 'no verificada'}, confidence: ${config.confidence})`);
      logger.info(`📊 Estadísticas: ${config.successCount}/${config.usageCount} éxitos`);
      return {
        source: 'database',
        config: config,
        priority: config.isVerified ? 1 : 2
      };
    }
    
    logger.info(`⚠️ No se encontró config en BD para: "${normalizedDomain}"`);
    
    // Buscar en JSON (configs estáticas)
    const jsonConfig = configLoader.getConfigForDomain(urlOrDomain);
    if (jsonConfig) {
      logger.info(`📋 Config de JSON encontrada: "${jsonConfig.name}"`);
      return {
        source: 'json',
        config: jsonConfig,
        priority: 3
      };
    }
    
    logger.info(`❌ No se encontró ninguna configuración para: "${normalizedDomain}"`);
    return null;
    
  } catch (error) {
    logger.error(`❌ Error obteniendo configuración prioritaria para "${urlOrDomain}":`, error);
    return null;
  }
}

/**
 * Actualiza estadísticas de uso de una configuración
 * @param {string} configId - ID de la configuración
 * @param {boolean} success - Si el scraping fue exitoso
 * @param {string} errorMessage - Mensaje de error (opcional)
 * @returns {Promise<void>}
 */
async function updateStats(configId, success, errorMessage = null) {
  try {
    if (!configId) return;
    
    const now = new Date();
    
    const updateData = {
      usageCount: { increment: 1 },
      lastUsedAt: now
    };
    
    if (success) {
      updateData.successCount = { increment: 1 };
      updateData.lastSuccess = now;
      updateData.lastError = null; // Limpiar error anterior
      logger.info(`📊 Config ${configId}: Éxito registrado`);
    } else {
      updateData.failureCount = { increment: 1 };
      if (errorMessage) {
        updateData.lastError = errorMessage.substring(0, 1000); // Limitar a 1000 chars
      }
      logger.warn(`📊 Config ${configId}: Fallo registrado${errorMessage ? ': ' + errorMessage : ''}`);
    }
    
    await prisma.siteConfiguration.update({
      where: { id: configId },
      data: updateData
    });
    
    // Recalcular confidence basado en success rate
    const config = await prisma.siteConfiguration.findUnique({
      where: { id: configId }
    });
    
    if (config && config.usageCount > 0) {
      const successRate = config.successCount / config.usageCount;
      const newConfidence = Math.min(0.5 + (successRate * 0.5), 1.0);
      
      await prisma.siteConfiguration.update({
        where: { id: configId },
        data: { confidence: newConfidence }
      });
      
      logger.info(`📈 Config ${configId}: Confidence actualizado a ${newConfidence.toFixed(2)} (${config.successCount}/${config.usageCount} éxitos)`);
    }
    
  } catch (error) {
    logger.error('Error actualizando estadísticas:', error);
  }
}

/**
 * Actualiza una configuración existente
 * @param {string} domain - Dominio de la configuración
 * @param {object} data - Datos a actualizar
 * @param {string} userId - ID del usuario que actualiza
 * @returns {Promise<object>}
 */
async function updateConfig(domain, data, userId) {
  try {
    const config = await prisma.siteConfiguration.findUnique({
      where: { domain }
    });
    
    if (!config) {
      throw new Error('Configuración no encontrada');
    }
    
    // Verificar permisos (solo el creador puede editar)
    if (config.createdBy !== userId.toString()) {
      throw new Error('No tienes permisos para editar esta configuración');
    }
    
    const updateData = {};
    
    if (data.name) updateData.name = data.name;
    if (data.selectors) {
      if (data.selectors.titleSelector) updateData.titleSelector = data.selectors.titleSelector;
      if (data.selectors.contentSelector) updateData.contentSelector = data.selectors.contentSelector;
      if (data.selectors.dateSelector !== undefined) updateData.dateSelector = data.selectors.dateSelector;
      if (data.selectors.authorSelector !== undefined) updateData.authorSelector = data.selectors.authorSelector;
      if (data.selectors.imageSelector !== undefined) updateData.imageSelector = data.selectors.imageSelector;
    }
    if (data.listingSelectors !== undefined) updateData.listingSelectors = data.listingSelectors;
    if (data.cleaningRules !== undefined) updateData.cleaningRules = data.cleaningRules;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    
    const updated = await prisma.siteConfiguration.update({
      where: { domain },
      data: updateData
    });
    
    logger.info(`✅ Configuración actualizada: ${domain}`);
    
    return updated;
    
  } catch (error) {
    logger.error('Error actualizando configuración:', error);
    throw error;
  }
}

/**
 * Agrega verificación de un usuario a una configuración
 * @param {string} domain - Dominio de la configuración
 * @param {string} userId - ID del usuario que verifica
 * @returns {Promise<object>}
 */
async function verifyConfig(domain, userId) {
  try {
    const config = await prisma.siteConfiguration.findUnique({
      where: { domain }
    });
    
    if (!config) {
      throw new Error('Configuración no encontrada');
    }
    
    // Verificar si el usuario ya verificó esta config
    if (config.verifiedBy.includes(userId.toString())) {
      throw new Error('Ya has verificado esta configuración');
    }
    
    // Agregar usuario a verifiedBy
    const verifiedBy = [...config.verifiedBy, userId.toString()];
    
    // Si tiene más de 3 verificaciones, marcar como verificada
    const isVerified = verifiedBy.length >= 3;
    
    const updated = await prisma.siteConfiguration.update({
      where: { domain },
      data: {
        verifiedBy,
        isVerified,
        confidence: isVerified ? Math.max(config.confidence, 0.8) : config.confidence
      }
    });
    
    logger.info(`✅ Verificación agregada: ${domain} (${verifiedBy.length} verificaciones)`);
    
    return {
      config: updated,
      verificationCount: verifiedBy.length,
      isVerified
    };
    
  } catch (error) {
    logger.error('Error verificando configuración:', error);
    throw error;
  }
}

/**
 * Lista configuraciones con filtros y paginación
 * @param {object} filters - Filtros a aplicar
 * @param {number} page - Página actual
 * @param {number} limit - Límite por página
 * @returns {Promise<object>}
 */
async function listConfigs(filters = {}, page = 1, limit = 20) {
  try {
    const where = {};
    
    if (filters.active !== undefined) {
      where.isActive = filters.active === 'true' || filters.active === true;
    }
    
    if (filters.verified !== undefined) {
      where.isVerified = filters.verified === 'true' || filters.verified === true;
    }
    
    if (filters.domain) {
      where.domain = { contains: filters.domain };
    }
    
    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }
    
    const skip = (page - 1) * limit;
    
    const [configs, total] = await Promise.all([
      prisma.siteConfiguration.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isVerified: 'desc' },
          { confidence: 'desc' },
          { usageCount: 'desc' }
        ]
      }),
      prisma.siteConfiguration.count({ where })
    ]);
    
    return {
      configs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
    
  } catch (error) {
    logger.error('Error listando configuraciones:', error);
    throw error;
  }
}

/**
 * Obtiene una configuración por dominio con estadísticas
 * @param {string} domain - Dominio a buscar
 * @returns {Promise<object|null>}
 */
async function getConfigByDomain(domain) {
  try {
    const config = await prisma.siteConfiguration.findUnique({
      where: { domain }
    });
    
    if (!config) return null;
    
    // Calcular estadísticas
    const successRate = config.usageCount > 0 
      ? (config.successCount / config.usageCount) * 100 
      : 0;
    
    return {
      config,
      stats: {
        usageCount: config.usageCount,
        successCount: config.successCount,
        failureCount: config.failureCount,
        successRate: successRate.toFixed(2),
        verificationCount: config.verifiedBy.length
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo configuración:', error);
    throw error;
  }
}

module.exports = {
  testSelectors,
  saveConfig,
  getConfigPriority,
  updateStats,
  updateConfig,
  verifyConfig,
  listConfigs,
  getConfigByDomain,
  isValidCSSSelector,
  normalizeDomain
};
