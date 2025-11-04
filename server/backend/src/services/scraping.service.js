const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const { limpiarTexto, obtenerURLBase, commonConfig, isValidUrl, exponentialBackoff } = require('../utils/scraperHelpers');
const configLoader = require('./configLoader.service');
const smartScraper = require('./smartScraper.service');
const siteConfigService = require('./siteConfigService');
const { loggers } = require('../utils/logger');

const logger = loggers.scraping;

// Configuración de Puppeteer
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

/**
 * Función helper para extraer noticias con Cheerio
 * Elimina duplicación de código entre scraper específico y genérico
 */
const extractNewsWithCheerio = ($, containerSelector, selectors, baseUrl, keyword = null) => {
  const noticias = [];
  
  $(containerSelector).each((_, element) => {
    const $element = $(element);
    
    // Extraer título
    let titulo = "";
    if (selectors.title) {
      const titleSelector = Array.isArray(selectors.title) 
        ? selectors.title.join(", ") 
        : selectors.title;
      titulo = limpiarTexto($element.find(titleSelector).first().text());
    }
    
    // Extraer enlace
    let enlace = "";
    if (selectors.link) {
      const linkSelector = Array.isArray(selectors.link) 
        ? selectors.link.join(", ") 
        : selectors.link;
      enlace = $element.find(linkSelector).first().attr("href");
    }
    
    // Extraer descripción
    let descripcion = "";
    if (selectors.description) {
      const descSelector = Array.isArray(selectors.description) 
        ? selectors.description.join(", ") 
        : selectors.description;
      descripcion = limpiarTexto($element.find(descSelector).first().text());
    }
    
    // Normalizar enlace
    if (enlace) {
      try {
        enlace = enlace.split("#")[0].split("?")[0];
        if (!enlace.startsWith("http")) {
          enlace = new URL(enlace, baseUrl).href;
        }
      } catch (e) {
        logger.warn("Error al procesar URL:", e.message);
        return;
      }
    }
    
    // Validar y agregar noticia
    if (
      titulo &&
      titulo.length > 10 &&
      !titulo.match(/menu|navegacion|search|newsletter/i) &&
      enlace
    ) {
      if (
        !keyword ||
        titulo.toLowerCase().includes(keyword.toLowerCase()) ||
        descripcion.toLowerCase().includes(keyword.toLowerCase())
      ) {
        noticias.push({
          titulo,
          descripcion: descripcion || "No hay descripción disponible",
          enlace,
        });
      }
    }
  });
  
  return noticias;
};

// Scraping con reintentos y mejor manejo de errores
// 🆕 Acepta options.temporaryConfig para tests
const scrapeSite = async (targetUrl, options = {}, keyword = null, maxRetries = 3) => {
  // Validar URL
  if (!isValidUrl(targetUrl)) {
    throw new Error(`URL inválida: ${targetUrl}`);
  }

  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.info(`🔍 Intento ${attempt + 1}/${maxRetries} para scrapear: ${targetUrl}`);
      
      const response = await axios.get(targetUrl, commonConfig);
      
      // Verificar que la respuesta sea exitosa
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Verificar que haya contenido
      if (!response.data || response.data.length === 0) {
        throw new Error('Respuesta vacía del servidor');
      }
      
      // 🆕 Pasar options a processScraping
      return await processScraping(response, targetUrl, keyword, options);
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Error en intento ${attempt + 1}:`, error.message);
      
      // No reintentar en errores 4xx (excepto 429)
      if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
        throw new Error(`Error del cliente (${error.response.status}): No se puede acceder a la URL`);
      }
      
      if (attempt < maxRetries - 1) {
        await exponentialBackoff(attempt, maxRetries);
      }
    }
  }
  
  throw new Error(`Fallo después de ${maxRetries} intentos: ${lastError.message}`);
};

// Función auxiliar para procesar el scraping
// 🆕 Acepta options.temporaryConfig para tests
const processScraping = async (response, targetUrl, keyword, options = {}) => {
  const baseUrl = obtenerURLBase(targetUrl);
  let noticias = [];

  // 🆕 PRIORIDAD 1: Usar configuración temporal (para tests)
  if (options.temporaryConfig) {
    logger.info('🎯 Usando configuración temporal del test');
    const priorityConfig = {
      config: options.temporaryConfig,
      type: 'temporary',
      source: 'test',
      id: null
    };
    // Continuar con el flujo normal usando esta config
    const siteConfig = priorityConfig.config;
    const configType = priorityConfig.type;
    const configSource = priorityConfig.source;
    const configId = priorityConfig.id;
    
    // Si tiene selectores de listado, usar Puppeteer
    if (siteConfig.listingSelectors && siteConfig.listingSelectors.containerSelector) {
      logger.info('🌐 Usando Puppeteer con configuración temporal...');
      
      let browser;
      try {
        browser = await puppeteer.launch(browserConfig);
        const page = await browser.newPage();
        
        await page.goto(targetUrl, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
        
        const containerSel = siteConfig.listingSelectors.containerSelector;
        const linkSel = siteConfig.listingSelectors.linkSelector;
        const titleSel = siteConfig.listingSelectors.titleSelector;
        
        logger.info(`🎯 Buscando elementos con selector: "${containerSel}"`);
        
        await page.waitForSelector(containerSel, { timeout: 10000 }).catch(() => {
          logger.warn(`⚠️ Timeout esperando selector: ${containerSel}`);
        });
        
        const noticiasExtraidas = await page.evaluate((containerSel, linkSel, titleSel, baseUrl) => {
          const containers = document.querySelectorAll(containerSel);
          const results = [];
          
          containers.forEach(container => {
            try {
              const linkEl = container.querySelector(linkSel);
              const titleEl = titleSel ? container.querySelector(titleSel) : linkEl;
              
              if (linkEl && titleEl) {
                let enlace = linkEl.href || linkEl.getAttribute('href');
                const titulo = titleEl.textContent?.trim() || '';
                
                if (enlace && !enlace.startsWith('http')) {
                  enlace = new URL(enlace, baseUrl).href;
                }
                
                if (titulo && titulo.length > 10 && enlace) {
                  results.push({
                    titulo,
                    enlace,
                    descripcion: 'No hay descripción disponible'
                  });
                }
              }
            } catch (e) {
              // Ignorar errores individuales
            }
          });
          
          return results;
        }, containerSel, linkSel, titleSel, baseUrl);
        
        await browser.close();
        
        logger.info(`✅ Puppeteer extrajo ${noticiasExtraidas.length} noticias`);
        
        if (keyword) {
          noticias = noticiasExtraidas.filter(n => 
            n.titulo.toLowerCase().includes(keyword.toLowerCase())
          );
        } else {
          noticias = noticiasExtraidas;
        }
        
        const noticiasUnicas = Array.from(new Set(noticias.map((n) => n.titulo)))
          .map((titulo) => noticias.find((n) => n.titulo === titulo))
          .filter((noticia) => noticia && noticia.enlace);

        logger.info(`✅ Scraping exitoso con Puppeteer (config temporal): ${noticiasUnicas.length} noticias`);
        
        return {
          sitio: baseUrl,
          total_noticias: noticiasUnicas.length,
          noticias: noticiasUnicas,
          metadata: {
            configType: 'temporary',
            configSource: 'test',
            siteName: siteConfig.name,
            method: 'puppeteer',
            scrapedAt: new Date().toISOString()
          }
        };
        
      } catch (error) {
        logger.error(`❌ Error con Puppeteer (config temporal): ${error.message}`);
        if (browser) {
          await browser.close().catch(() => {});
        }
        // Continuar con flujo normal
      }
    }
  }

  // PRIORIDAD 2: Intentar obtener configuración de BD primero, luego JSON
  const priorityConfig = await siteConfigService.getConfigPriority(targetUrl);
  let siteConfig = null;
  let configType = 'generic';
  let configSource = 'none';
  let configId = null;
  
  if (priorityConfig) {
    // Convertir formato de BD a formato esperado por el código
    if (priorityConfig.source === 'database') {
      logger.info(`📋 Usando config de BD: ${priorityConfig.config.name} (${priorityConfig.config.domain})`);
      logger.debug(`🔍 Config completa:`, JSON.stringify(priorityConfig.config, null, 2));
      configSource = 'database';
      configType = 'database';
      configId = priorityConfig.config.id;
      
      // Convertir formato de BD a formato interno
      siteConfig = {
        name: priorityConfig.config.name,
        domain: priorityConfig.config.domain,
        selectors: {
          listing: {
            container: priorityConfig.config.listingSelectors?.containerSelector,
            link: priorityConfig.config.listingSelectors?.linkSelector,
            title: priorityConfig.config.listingSelectors?.titleSelector,
            description: null
          }
        }
      };
      
      // 🚀 SI HAY LISTING SELECTORS EN BD, USAR PUPPETEER
      logger.debug(`🔍 Verificando listingSelectors:`, {
        exists: !!priorityConfig.config.listingSelectors,
        containerSelector: priorityConfig.config.listingSelectors?.containerSelector,
        linkSelector: priorityConfig.config.listingSelectors?.linkSelector,
        titleSelector: priorityConfig.config.listingSelectors?.titleSelector
      });
      
      if (priorityConfig.config.listingSelectors?.containerSelector) {
        logger.info(`🚀 Usando Puppeteer para extraer listado con config de BD`);
        
        let browser;
        try {
          browser = await puppeteer.launch(browserConfig);
          
          try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            
            logger.info(`📡 Navegando a: ${targetUrl}`);
            await page.goto(targetUrl, { 
              waitUntil: 'networkidle0', 
              timeout: 30000 
            });
            
            // Esperar a que el contenedor esté presente
            const containerSel = priorityConfig.config.listingSelectors.containerSelector;
            const linkSel = priorityConfig.config.listingSelectors.linkSelector;
            const titleSel = priorityConfig.config.listingSelectors.titleSelector;
            
            logger.info(`🎯 Buscando elementos con selector: "${containerSel}"`);
            
            await page.waitForSelector(containerSel, { timeout: 10000 }).catch(() => {
              logger.warn(`⚠️ Timeout esperando selector: ${containerSel}`);
            });
            
            // Extraer noticias con Puppeteer
            const noticiasExtraidas = await page.evaluate((containerSel, linkSel, titleSel, baseUrl) => {
              const containers = document.querySelectorAll(containerSel);
              const results = [];
              
              containers.forEach(container => {
                try {
                  const linkEl = container.querySelector(linkSel);
                  const titleEl = titleSel ? container.querySelector(titleSel) : linkEl;
                  
                  if (linkEl && titleEl) {
                    let enlace = linkEl.href || linkEl.getAttribute('href');
                    const titulo = titleEl.textContent?.trim() || '';
                    
                    // Normalizar enlace
                    if (enlace && !enlace.startsWith('http')) {
                      enlace = new URL(enlace, baseUrl).href;
                    }
                    
                    if (titulo && titulo.length > 10 && enlace) {
                      results.push({
                        titulo,
                        enlace,
                        descripcion: 'No hay descripción disponible'
                      });
                    }
                  }
                } catch (e) {
                  // Ignorar errores individuales
                }
              });
              
              return results;
            }, containerSel, linkSel, titleSel, baseUrl);
            
            await browser.close();
            
            logger.info(`✅ Puppeteer extrajo ${noticiasExtraidas.length} noticias`);
            
            // Filtrar por keyword si existe
            if (keyword) {
              noticias = noticiasExtraidas.filter(n => 
                n.titulo.toLowerCase().includes(keyword.toLowerCase())
              );
              logger.info(`🔍 Filtradas por keyword "${keyword}": ${noticias.length} noticias`);
            } else {
              noticias = noticiasExtraidas;
            }
            
            // Actualizar estadísticas de éxito
            if (configId) {
              await siteConfigService.updateStats(configId, noticias.length > 0);
            }
            
            // Retornar directamente si Puppeteer tuvo éxito
            const noticiasUnicas = Array.from(new Set(noticias.map((n) => n.titulo)))
              .map((titulo) => noticias.find((n) => n.titulo === titulo))
              .filter((noticia) => noticia && noticia.enlace);

            logger.info(`✅ Scraping exitoso con Puppeteer: ${noticiasUnicas.length} noticias (config: ${configType}, source: ${configSource})`);
            
            return {
              sitio: baseUrl,
              total_noticias: noticiasUnicas.length,
              noticias: noticiasUnicas,
              metadata: {
                configType: configType,
                configSource: configSource,
                siteName: siteConfig.name,
                method: 'puppeteer',
                scrapedAt: new Date().toISOString()
              }
            };
            
          } catch (error) {
            logger.error(`❌ Error con Puppeteer: ${error.message}`);
            
            // Actualizar estadísticas de fallo
            if (configId) {
              await siteConfigService.updateStats(configId, false, `Puppeteer error: ${error.message}`);
            }
            
            // Continuar con Cheerio como fallback
            logger.info(`🔄 Intentando con Cheerio como fallback...`);
          } finally {
            if (browser) {
              await browser.close().catch(err => logger.warn('Error cerrando browser:', err.message));
            }
          }
          
        } catch (error) {
          logger.error(`❌ Error lanzando Puppeteer: ${error.message}`);
          logger.info(`🔄 Continuando con Cheerio...`);
          if (browser) {
            await browser.close().catch(err => logger.warn('Error cerrando browser:', err.message));
          }
        }
      }
    } else if (priorityConfig.source === 'json') {
      logger.info(`📋 Usando config de JSON: ${priorityConfig.config.name}`);
      configSource = 'json';
      configType = 'specific';
      siteConfig = priorityConfig.config;
    }
  }
  
  // FALLBACK: Usar Cheerio si Puppeteer falló o no hay config de BD
  let $;
  try {
    $ = cheerio.load(response.data);
  } catch (error) {
    throw new Error(`Error al parsear HTML: ${error.message}`);
  }
  
  // Fallback: si no hay config de BD ni JSON, intentar con configLoader
  if (!siteConfig) {
    siteConfig = configLoader.getConfigForDomain(targetUrl);
    if (siteConfig) {
      configSource = 'json';
      configType = 'specific';
    }
  }

  if (siteConfig) {
    // Usar configuración específica del sitio
    configType = 'specific';
    logger.info(`🎯 Usando configuración específica para: ${siteConfig.name} (${siteConfig.domain})`);
    
    const listingSelectors = siteConfig.selectors.listing;
    
    // Procesar con selectores configurados usando helper
    if (listingSelectors.container) {
      const containerSelector = Array.isArray(listingSelectors.container) 
        ? listingSelectors.container.join(", ") 
        : listingSelectors.container;
      
      const extractedNews = extractNewsWithCheerio($, containerSelector, listingSelectors, baseUrl, keyword);
      noticias.push(...extractedNews);
      
      // Aplicar reglas de limpieza si existen
      if (siteConfig.cleaningRules) {
        noticias.forEach(noticia => {
          noticia.descripcion = configLoader.applyCleaningRules(noticia.descripcion, siteConfig);
        });
      }
    }
  } else {
    // Usar scraping genérico para sitios sin configuración específica
    configType = 'generic';
    logger.info(`🔧 Usando scraper genérico para: ${baseUrl}`);
    
    const selectores = [
      "article",
      ".article",
      ".post",
      ".entry",
      ".news-item",
      ".blog-post",
      '[class*="article"]',
      '[class*="post"]',
      '[class*="entry"]',
    ].join(", ");

    $(selectores).each((_, element) => {
      const $element = $(element);

      const titulo = limpiarTexto(
        $element
          .find('h1, h2, h3, .title, .headline, [class*="title"]')
          .first()
          .text(),
      );

      let enlace;
      const tituloLink = $element
        .find("a")
        .filter(function () {
          return (
            $(this).text().trim() === titulo ||
            $(this).find("h1, h2, h3").text().trim() === titulo
          );
        })
        .first();

      if (tituloLink.length) {
        enlace = tituloLink.attr("href");
      } else {
        enlace = $element
          .find("a")
          .not('[href*="category"], [href*="tag"], [href*="author"]')
          .first()
          .attr("href");
      }

      if (enlace) {
        try {
          enlace = enlace.split("#")[0].split("?")[0];
          if (!enlace.startsWith("http")) {
            enlace = new URL(enlace, baseUrl).href;
          }
        } catch (e) {
          logger.warn("Error al procesar URL:", e);
          return;
        }
      }

      const descripcion = limpiarTexto(
        $element
          .find(
            'p, [class*="excerpt"], [class*="description"], [class*="summary"]',
          )
          .first()
          .text(),
      );

      if (
        titulo &&
        titulo.length > 10 &&
        !titulo.match(/menu|navegacion|search|newsletter/i) &&
        enlace
      ) {
        if (
          !keyword ||
          titulo.toLowerCase().includes(keyword.toLowerCase()) ||
          descripcion.toLowerCase().includes(keyword.toLowerCase())
        ) {
          noticias.push({
            titulo,
            descripcion: descripcion || "No hay descripción disponible",
            enlace,
          });
        }
      }
    });
  }

  const noticiasUnicas = Array.from(new Set(noticias.map((n) => n.titulo)))
    .map((titulo) => noticias.find((n) => n.titulo === titulo))
    .filter((noticia) => noticia && noticia.enlace);

  logger.info(`✅ Scraping exitoso: ${noticiasUnicas.length} noticias encontradas (config: ${configType}, source: ${configSource})`);
  
  return {
    sitio: baseUrl,
    total_noticias: noticiasUnicas.length,
    noticias: noticiasUnicas,
    metadata: {
      configType: configType,
      configSource: configSource,
      siteName: siteConfig ? siteConfig.name : 'Generic',
      scrapedAt: new Date().toISOString()
    }
  };
};

const scrapeSingleArticle = async (url, customSelectors = null, maxRetries = 3) => {
  // Validar URL
  if (!isValidUrl(url)) {
    throw new Error(`URL inválida: ${url}`);
  }
  
  // PRIORIDAD 1: Si hay selectores personalizados, usarlos PRIMERO
  if (customSelectors && (customSelectors.titleSelector || customSelectors.contentSelector)) {
    logger.info('🎯 Usando selectores personalizados proporcionados por el usuario');
    
    try {
      const customResult = await scrapeWithCustomSelectors(url, customSelectors);
      
      if (customResult.success) {
        logger.info('✅ Scraping exitoso con selectores personalizados');
        return customResult;
      } else {
        logger.warn('⚠️ Selectores personalizados fallaron, continuando con sistema automático');
      }
    } catch (error) {
      logger.error(`❌ Error con selectores personalizados: ${error.message}`);
      logger.info('⚠️ Continuando con sistema automático');
    }
  }
  
  // PRIORIDAD 2-4: Obtener configuración con prioridad: BD (verified) → BD (unverified) → JSON
  logger.info(`🔍 Buscando configuración para URL: ${url}`);
  const priorityConfig = await siteConfigService.getConfigPriority(url);
  let siteConfig = null;
  let configId = null;
  let configSource = 'none';
  let usePuppeteer = false;
  
  if (priorityConfig) {
    configSource = priorityConfig.source;
    if (priorityConfig.source === 'database') {
      configId = priorityConfig.config.id;
      usePuppeteer = true; // ✅ USAR PUPPETEER PARA CONFIGS DE BD
      
      // Convertir formato de BD a formato esperado
      siteConfig = {
        name: priorityConfig.config.name,
        domain: priorityConfig.config.domain,
        selectors: {
          article: {
            title: priorityConfig.config.titleSelector,
            content: priorityConfig.config.contentSelector,
            date: priorityConfig.config.dateSelector,
            author: priorityConfig.config.authorSelector,
            images: priorityConfig.config.imageSelector ? [priorityConfig.config.imageSelector] : []
          }
        }
      };
      logger.info(`📋 ✅ Config de BD encontrada (${priorityConfig.config.isVerified ? 'VERIFICADA' : 'no verificada'}): ${siteConfig.name}`);
      logger.info(`🎯 Selectores: title="${priorityConfig.config.titleSelector}", content="${priorityConfig.config.contentSelector}"`);
      logger.info(`🚀 Usando Puppeteer para mayor compatibilidad`);
    } else {
      siteConfig = priorityConfig.config;
      logger.info(`📋 Usando config de JSON: ${siteConfig.name}`);
    }
  } else {
    logger.info(`⚠️ No se encontró configuración específica para este dominio`);
  }
  
  // Configuración cargada, se usará en el flujo principal

  async function intentarScraping(urlToTry, attempt = 0) {
    try {
      console.log(`📰 Extrayendo artículo (intento ${attempt + 1}/${maxRetries}): ${urlToTry}`);
      
      const response = await axios.get(urlToTry, commonConfig);
      
      if (response.status === 404) {
        throw new Error("Página no encontrada (404)");
      }
      
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!response.data || response.data.length === 0) {
        throw new Error('Respuesta vacía del servidor');
      }
      
      return response;
      
    } catch (error) {
      // Si es un error de red o timeout, reintentar
      if ((error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') && attempt < maxRetries - 1) {
        console.log(`⚠️ Error de conexión, reintentando...`);
        await exponentialBackoff(attempt, maxRetries);
        return intentarScraping(urlToTry, attempt + 1);
      }
      throw error;
    }
  }

  let response;
  let lastError;
  
  // Intentar con URL original
  try {
    response = await intentarScraping(url);
  } catch (error) {
    lastError = error;
    console.log(`⚠️ Fallo con URL original, intentando variación...`);
    
    // Intentar con variación de URL (con/sin trailing slash)
    const alternativeUrl = url.endsWith("/") ? url.slice(0, -1) : url + "/";
    try {
      response = await intentarScraping(alternativeUrl);
      url = alternativeUrl;
    } catch (secondError) {
      throw new Error(`No se pudo acceder a la página: ${lastError.message}`);
    }
  }

  let $;
  try {
    $ = cheerio.load(response.data);
  } catch (error) {
    throw new Error(`Error al parsear HTML del artículo: ${error.message}`);
  }

  // ESTRATEGIA 1: Intentar con configuración de BD o JSON si existe
  if (siteConfig) {
    logger.info(`🎯 Intentando con configuración específica: ${siteConfig.name}`);
    
    try {
      const selectors = siteConfig.selectors.article;
      let extractionResult;
      
      // ✅ USAR PUPPETEER SI ES CONFIG DE BD (más confiable)
      if (usePuppeteer) {
        logger.info(`🚀 Usando Puppeteer para config de BD...`);
        extractionResult = await scrapeWithCustomSelectors(url, {
          titleSelector: selectors.title,
          contentSelector: selectors.content,
          dateSelector: selectors.date,
          authorSelector: selectors.author,
          imageSelector: selectors.images && selectors.images.length > 0 ? selectors.images[0] : null
        });
        
        if (extractionResult.success) {
          logger.info(`✅ Extracción exitosa con Puppeteer + config BD: ${siteConfig.name}`);
          logger.info(`📊 Título: ${extractionResult.titulo ? '✓' : '✗'}, Contenido: ${extractionResult.contenido ? extractionResult.contenido.length + ' chars' : '✗'}`);
          
          // Actualizar estadísticas de éxito
          if (configId) {
            await siteConfigService.updateStats(configId, true);
          }
          
          return {
            ...extractionResult,
            metadata: {
              configType: 'database',
              configSource: 'database',
              siteName: siteConfig.name,
              extractedAt: new Date().toISOString(),
              confidence: 0.9,
              method: 'puppeteer'
            }
          };
        } else {
          logger.warn(`⚠️ Puppeteer falló con config BD, intentando con Cheerio como fallback`);
        }
      }
      
      // FALLBACK: Usar Cheerio (para configs JSON o si Puppeteer falló)
      logger.info(`📄 Usando Cheerio para extracción...`);
      
      // Extraer título
      let titulo = null;
      if (selectors.title) {
        const titleElement = $(selectors.title).first();
        if (titleElement.length > 0) {
          titulo = limpiarTexto(titleElement.text());
        }
      }
      
      // Extraer contenido
      let contenido = null;
      if (selectors.content) {
        const contentElement = $(selectors.content);
        if (contentElement.length > 0) {
          const paragraphs = [];
          contentElement.find('p').each((_, p) => {
            const text = $(p).text().trim();
            if (text.length > 20) {
              paragraphs.push(text);
            }
          });
          
          if (paragraphs.length > 0) {
            contenido = paragraphs.join('\n\n');
          } else {
            contenido = limpiarTexto(contentElement.text());
          }
        }
      }
      
      // Extraer fecha
      let fecha = null;
      if (selectors.date) {
        const dateElement = $(selectors.date).first();
        if (dateElement.length > 0) {
          fecha = limpiarTexto(dateElement.text());
        }
      }
      
      // Extraer autor
      let autor = null;
      if (selectors.author) {
        const authorElement = $(selectors.author).first();
        if (authorElement.length > 0) {
          autor = limpiarTexto(authorElement.text());
        }
      }
      
      // Extraer imágenes
      const imagenes = [];
      if (selectors.images && selectors.images.length > 0) {
        selectors.images.forEach(imgSelector => {
          $(imgSelector).each((_, element) => {
            const src = $(element).attr('src') || $(element).attr('data-src');
            if (src && !src.match(/avatar|icon|logo|banner|advertisement/i)) {
              try {
                const imageUrl = new URL(src, url).href;
                if (!imagenes.includes(imageUrl)) {
                  imagenes.push(imageUrl);
                }
              } catch (e) {
                // Ignorar URLs inválidas
              }
            }
          });
        });
      }
      
      // Validar que se extrajo contenido mínimo
      if (titulo && contenido && contenido.length > 100) {
        logger.info(`✅ Extracción exitosa con Cheerio + config: ${siteConfig.name}`);
        logger.info(`📊 Título: ${titulo ? '✓' : '✗'}, Contenido: ${contenido.length} chars`);
        
        // Actualizar estadísticas de éxito
        if (configId) {
          await siteConfigService.updateStats(configId, true);
        }
        
        return {
          success: true,
          titulo: titulo,
          fecha: fecha || "Fecha no disponible",
          autor: autor || "Autor no especificado",
          contenido: contenido,
          imagenes: imagenes.slice(0, 5),
          url: url,
          metadata: {
            configType: configSource === 'database' ? 'database' : 'json',
            configSource: configSource,
            siteName: siteConfig.name,
            extractedAt: new Date().toISOString(),
            confidence: 0.85,
            method: 'cheerio'
          }
        };
      } else {
        const errorMsg = `Config no extrajo suficiente contenido (título: ${!!titulo}, contenido: ${contenido?.length || 0} chars). Selectores: title="${selectors.title}", content="${selectors.content}"`;
        logger.warn(`⚠️ ${errorMsg}`);
        // Actualizar estadísticas de fallo
        if (configId) {
          await siteConfigService.updateStats(configId, false, errorMsg);
        }
      }
    } catch (error) {
      logger.error(`❌ Error usando config: ${error.message}`);
      logger.error(`🔍 Stack: ${error.stack}`);
      // Actualizar estadísticas de fallo
      if (configId) {
        await siteConfigService.updateStats(configId, false, `Error: ${error.message}`);
      }
    }
  }
  
  // ESTRATEGIA 2: Fallback a Smart Scraper
  logger.info(`🧠 Usando smart scraper como fallback para: ${url}`);
  
  const smartResult = await smartScraper.smartScrape(url, response.data);
  
  if (smartResult.success) {
      const result = {
        success: true,
        titulo: smartResult.title || "Sin título",
        fecha: smartResult.date || "Fecha no disponible",
        autor: smartResult.author || "Autor no especificado",
        contenido: smartResult.content || "No se pudo extraer el contenido",
        imagenes: smartResult.images?.slice(0, 5) || [],
        url: url,
        metadata: {
          configType: 'smart',
          configSource: 'smart-scraper',
          strategy: smartResult.strategy,
          confidence: smartResult.confidence,
          siteName: 'Smart Scraper',
          extractedAt: smartResult.extractedAt,
          needsHelp: smartResult.confidence < 0.5
        }
      };
      
      // Actualizar estadísticas si se usó config de BD
      if (configId) {
        await siteConfigService.updateStats(configId, true);
      }
      
      return result;
    } else {
      // Si el smart scraper falla, retornar error con flag de ayuda
      
      // Actualizar estadísticas de fallo si se usó config de BD
      if (configId) {
        await siteConfigService.updateStats(configId, false, smartResult.reason || 'Smart scraper falló');
      }
      
    return {
      success: false,
      titulo: "Error de extracción",
      fecha: "No disponible",
      autor: "No disponible",
      contenido: "No se pudo extraer el contenido del artículo",
      imagenes: [],
      url: url,
      metadata: {
        configType: 'smart',
        configSource: 'smart-scraper',
        strategy: 'failed',
        confidence: 0,
        siteName: 'Smart Scraper',
        extractedAt: smartResult.extractedAt,
        needsHelp: true,
        failureReason: smartResult.reason,
        attemptedStrategies: smartResult.attemptedStrategies
      }
    };
  }
};

/**
 * Probar selectores personalizados en una URL
 * @param {string} url - URL a scrapear
 * @param {object} customSelectors - Selectores CSS personalizados
 * @returns {Promise<object>} Resultado con datos extraídos
 */
async function testCustomSelectors(url, customSelectors) {
  logger.info(`🧪 Probando selectores personalizados para: ${url}`);
  
  let browser;
  try {
    browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();
    
    // Configurar timeout y user agent
    await page.setDefaultNavigationTimeout(30000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Navegar a la URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extraer contenido usando los selectores
    const result = await page.evaluate((selectors) => {
      const data = {};
      
      // Título
      if (selectors.titleSelector) {
        try {
          const titleEl = document.querySelector(selectors.titleSelector);
          data.titulo = titleEl?.textContent?.trim() || null;
        } catch (e) {
          data.titulo = null;
        }
      }
      
      // Contenido
      if (selectors.contentSelector) {
        try {
          // Intentar con querySelectorAll primero para capturar múltiples elementos
          const contentEls = document.querySelectorAll(selectors.contentSelector);
          if (contentEls.length > 0) {
            // Si hay múltiples elementos, concatenar su contenido
            const paragraphs = Array.from(contentEls)
              .map(el => el.textContent?.trim())
              .filter(text => text && text.length > 20); // Filtrar párrafos muy cortos
            data.contenido = paragraphs.join('\n\n') || null;
          } else {
            // Fallback: intentar con querySelector
            const contentEl = document.querySelector(selectors.contentSelector);
            data.contenido = contentEl?.textContent?.trim() || null;
          }
        } catch (e) {
          data.contenido = null;
        }
      }
      
      // Fecha
      if (selectors.dateSelector) {
        try {
          const dateEl = document.querySelector(selectors.dateSelector);
          data.fecha = dateEl?.textContent?.trim() || 
                      dateEl?.getAttribute('datetime') || 
                      dateEl?.getAttribute('content') || null;
        } catch (e) {
          data.fecha = null;
        }
      }
      
      // Autor
      if (selectors.authorSelector) {
        try {
          const authorEl = document.querySelector(selectors.authorSelector);
          data.autor = authorEl?.textContent?.trim() || null;
        } catch (e) {
          data.autor = null;
        }
      }
      
      // Imágenes
      if (selectors.imageSelector) {
        try {
          const imgEls = document.querySelectorAll(selectors.imageSelector);
          data.imagenes = Array.from(imgEls)
            .map(img => {
              return img.src || 
                     img.getAttribute('data-src') || 
                     img.getAttribute('content') || 
                     null;
            })
            .filter(Boolean)
            .slice(0, 5); // Máximo 5 imágenes
        } catch (e) {
          data.imagenes = [];
        }
      }
      
      return data;
    }, customSelectors);
    
    await browser.close();
    
    // Validar que se extrajo algo útil
    if (!result.titulo && !result.contenido) {
      logger.warn('⚠️ No se pudo extraer contenido con los selectores proporcionados');
      return {
        success: false,
        error: 'No se pudo extraer contenido con los selectores proporcionados. Verifica que los selectores sean correctos.'
      };
    }
    
    logger.info(`✅ Selectores probados exitosamente. Título: ${result.titulo ? 'Sí' : 'No'}, Contenido: ${result.contenido ? result.contenido.length + ' chars' : 'No'}`);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    if (browser) await browser.close();
    logger.error(`❌ Error al probar selectores: ${error.message}`);
    return {
      success: false,
      error: `Error al probar selectores: ${error.message}`
    };
  }
}

/**
 * Scrapear con selectores personalizados (wrapper para usar en scrapeSingleArticle)
 * @param {string} url - URL a scrapear
 * @param {object} customSelectors - Selectores CSS personalizados
 * @returns {Promise<object>} Resultado formateado
 */
async function scrapeWithCustomSelectors(url, customSelectors) {
  const result = await testCustomSelectors(url, customSelectors);
  
  if (!result.success) {
    return result;
  }
  
  // Retornar en formato estándar (datos directos, no anidados)
  return {
    success: true,
    titulo: result.data.titulo || "Sin título",
    fecha: result.data.fecha || "Fecha no disponible",
    autor: result.data.autor || "Autor no especificado",
    contenido: result.data.contenido || "No se pudo extraer el contenido",
    imagenes: result.data.imagenes || [],
    url: url,
    metadata: {
      configType: 'custom',
      configSource: 'user-provided',
      confidence: 0.8,
      timestamp: new Date().toISOString(),
      selectorsUsed: customSelectors
    }
  };
}

/**
 * Scrapear listado de noticias de una página principal
 * @param {string} url - URL de la página de listado
 * @param {object} listingSelectors - Selectores para encontrar noticias en el listado
 * @param {object} articleSelectors - Selectores para extraer contenido de cada artículo
 * @returns {Promise<object>} Resultado con todas las noticias scrapeadas
 */
async function scrapeListingPage(url, listingSelectors, articleSelectors) {
  logger.info(`📋 Scrapeando listado de: ${url}`);
  
  let browser;
  try {
    browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();
    
    await page.setDefaultNavigationTimeout(30000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Navegar a la página de listado
    logger.info('📡 Cargando página de listado...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extraer todas las URLs de noticias
    logger.info('🔍 Extrayendo URLs de noticias...');
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
      
      return urls;
    }, listingSelectors);
    
    await browser.close();
    
    logger.info(`✅ Encontradas ${newsUrls.length} noticias en el listado`);
    
    if (newsUrls.length === 0) {
      return {
        success: false,
        error: 'No se encontraron noticias con los selectores proporcionados',
        totalFound: 0,
        totalScraped: 0,
        articles: []
      };
    }
    
    // Scrapear cada noticia individualmente
    const results = [];
    const errors = [];
    
    for (let i = 0; i < newsUrls.length; i++) {
      const newsItem = newsUrls[i];
      try {
        logger.info(`📰 [${i + 1}/${newsUrls.length}] Scrapeando: ${newsItem.previewTitle}`);
        
        const articleResult = await scrapeWithCustomSelectors(
          newsItem.url, 
          articleSelectors
        );
        
        if (articleResult.success) {
          results.push({
            titulo: articleResult.titulo,
            contenido: articleResult.contenido,
            fecha: articleResult.fecha,
            autor: articleResult.autor,
            imagenes: articleResult.imagenes,
            sourceUrl: newsItem.url,
            listingIndex: newsItem.index,
            scrapedAt: new Date().toISOString()
          });
          logger.info(`   ✅ Éxito: ${articleResult.titulo?.substring(0, 50)}...`);
        } else {
          errors.push({
            url: newsItem.url,
            title: newsItem.previewTitle,
            error: articleResult.error
          });
          logger.warn(`   ⚠️ Fallo: ${articleResult.error}`);
        }
      } catch (error) {
        errors.push({
          url: newsItem.url,
          title: newsItem.previewTitle,
          error: error.message
        });
        logger.error(`   ❌ Error: ${error.message}`);
      }
    }
    
    const successRate = (results.length / newsUrls.length * 100).toFixed(1);
    
    logger.info(`✅ Scraping completado: ${results.length}/${newsUrls.length} exitosos (${successRate}%)`);
    
    return {
      success: true,
      totalFound: newsUrls.length,
      totalScraped: results.length,
      totalFailed: errors.length,
      successRate: parseFloat(successRate),
      articles: results,
      errors: errors,
      metadata: {
        listingUrl: url,
        scrapedAt: new Date().toISOString(),
        listingSelectors: listingSelectors,
        articleSelectors: articleSelectors
      }
    };
    
  } catch (error) {
    if (browser) await browser.close();
    logger.error(`❌ Error al scrapear listado: ${error.message}`);
    return {
      success: false,
      error: `Error al scrapear listado: ${error.message}`,
      totalFound: 0,
      totalScraped: 0,
      articles: []
    };
  }
}

module.exports = {
  scrapeSite,
  scrapeSingleArticle,
  testCustomSelectors,
  scrapeWithCustomSelectors,
  scrapeListingPage
};
