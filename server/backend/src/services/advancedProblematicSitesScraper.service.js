/**
 * Scraper Avanzado para 8 Sitios Problemáticos
 * Aplica la misma lógica de T13 (detección de selectores de atributo)
 * CON SOPORTE PARA PUPPETEER Y MANEJO ROBUSTO DE ERRORES
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { limpiarTexto, obtenerURLBase } = require('../utils/scraperHelpers');
const { loggers } = require('../utils/logger');

const logger = loggers.scraping;

class AdvancedProblematicSitesScraper {
  constructor() {
    this.commonHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache'
    };

    this.sitesConfig = {
      'diariocoquimbo.cl': {
        name: 'Diario Coquimbo',
        urls: ['https://diariocoquimbo.cl', 'https://www.diariocoquimbo.cl', 'https://diariocoquimbo.com'],
        usePuppeteer: true,
        selectors: {
          container: 'article, .article, .post, [class*="noticia"], [class*="news"]',
          title: 'h1, h2, h3, .title, [class*="title"], [title]',
          link: 'a[href]'
        }
      },
      'diariotemuco.cl': {
        name: 'Diario Temuco',
        urls: ['https://diariotemuco.cl', 'https://www.diariotemuco.cl', 'https://diariotemuco.com'],
        usePuppeteer: true,
        selectors: {
          container: 'article, .article, .post, [class*="noticia"], [class*="news"]',
          title: 'h1, h2, h3, .title, [class*="title"], [title]',
          link: 'a[href]'
        }
      },
      'diariovaldivia.cl': {
        name: 'Diario Valdivia',
        urls: ['https://diariovaldivia.cl', 'https://www.diariovaldivia.cl', 'https://diariovaldivia.com'],
        usePuppeteer: true,
        selectors: {
          container: 'article, .article, .post, [class*="noticia"], [class*="news"]',
          title: 'h1, h2, h3, .title, [class*="title"], [title]',
          link: 'a[href]'
        }
      },
      'diariopuertomontt.cl': {
        name: 'Diario Puerto Montt',
        urls: ['https://diariopuertomontt.cl', 'https://www.diariopuertomontt.cl', 'https://diariopuertomontt.com'],
        usePuppeteer: true,
        selectors: {
          container: 'article, .article, .post, [class*="noticia"], [class*="news"]',
          title: 'h1, h2, h3, .title, [class*="title"], [title]',
          link: 'a[href]'
        }
      },
      'diariopuntaarenas.cl': {
        name: 'Diario Punta Arenas',
        urls: ['https://diariopuntaarenas.cl', 'https://www.diariopuntaarenas.cl', 'https://diariopuntaarenas.com'],
        usePuppeteer: true,
        selectors: {
          container: 'article, .article, .post, [class*="noticia"], [class*="news"]',
          title: 'h1, h2, h3, .title, [class*="title"], [title]',
          link: 'a[href]'
        }
      },
      'orbe.cl': {
        name: 'Orbe',
        urls: ['https://orbe.cl', 'https://www.orbe.cl'],
        usePuppeteer: true,
        selectors: {
          container: 'article, .article, .post, [class*="noticia"], [class*="news"]',
          title: 'h1, h2, h3, .title, [class*="title"], [title]',
          link: 'a[href]'
        }
      },
      'reuters.com': {
        name: 'Reuters Chile',
        urls: ['https://www.reuters.com/places/chile', 'https://reuters.com/places/chile'],
        usePuppeteer: true,
        customHeaders: {
          'Referer': 'https://www.reuters.com/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        selectors: {
          container: 'article, [class*="article"], [class*="news"], a[data-testid*="Link"]',
          title: 'h3, h2, [class*="title"], [title]',
          link: 'a[href]'
        }
      },
      'france24.com': {
        name: 'France24 Español',
        urls: ['https://www.france24.com/es', 'https://france24.com/es'],
        usePuppeteer: true,
        customHeaders: {
          'Referer': 'https://www.france24.com/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        selectors: {
          container: 'article, [class*="article"], [class*="news"]',
          title: 'h2, h3, .title, [class*="title"], [title]',
          link: 'a[href]'
        }
      }
    };
  }

  /**
   * Detectar si es un selector de atributo (ej: a[title], div[data-title])
   */
  isAttributeSelector(selector) {
    return selector && selector.includes('[') && selector.includes(']');
  }

  /**
   * Extraer atributo de un selector (ej: a[title] → 'title')
   */
  extractAttributeName(selector) {
    const match = selector.match(/\[([^\]]+)\]/);
    if (match) {
      return match[1].replace(/^["']|["']$/g, '');
    }
    return null;
  }

  /**
   * Extraer noticias usando lógica mejorada de T13
   */
  extractNews($, containerSelector, titleSelectors, linkSelectors, baseUrl) {
    const noticias = [];
    const titleSels = Array.isArray(titleSelectors) ? titleSelectors : [titleSelectors];
    const linkSels = Array.isArray(linkSelectors) ? linkSelectors : [linkSelectors];

    $(containerSelector).each((_, element) => {
      const $element = $(element);
      let titulo = '';
      let enlace = '';

      // Extraer título con lógica de atributos
      for (const titleSel of titleSels) {
        if (this.isAttributeSelector(titleSel)) {
          const attrName = this.extractAttributeName(titleSel);
          if (attrName) {
            const $titleEl = $element.find(titleSel).first();
            if ($titleEl.length > 0) {
              titulo = limpiarTexto($titleEl.attr(attrName) || $titleEl.text());
              if (titulo) break;
            }
          }
        } else {
          const foundTitle = limpiarTexto($element.find(titleSel).first().text());
          if (foundTitle && foundTitle.length > 10) {
            titulo = foundTitle;
            break;
          }
        }
      }

      // Extraer enlace con lógica de atributos
      for (const linkSel of linkSels) {
        if (this.isAttributeSelector(linkSel)) {
          const attrName = this.extractAttributeName(linkSel);
          if (attrName) {
            const $linkEl = $element.find(linkSel).first();
            if ($linkEl.length > 0) {
              enlace = $linkEl.attr(attrName) || $linkEl.attr('href');
              if (enlace) break;
            }
          }
        } else {
          const foundLink = $element.find(linkSel).first().attr('href');
          if (foundLink) {
            enlace = foundLink;
            break;
          }
        }
      }

      // Normalizar enlace
      if (enlace) {
        try {
          enlace = enlace.split('#')[0].split('?')[0];
          if (!enlace.startsWith('http')) {
            enlace = new URL(enlace, baseUrl).href;
          }
        } catch (e) {
          return;
        }
      }

      // Validar y agregar
      if (titulo && titulo.length > 10 && enlace && !titulo.match(/menu|navegacion|search|newsletter/i)) {
        noticias.push({
          titulo,
          enlace,
          descripcion: 'No hay descripción disponible'
        });
      }
    });

    return noticias;
  }

  /**
   * Scrapear con Puppeteer (para sitios que requieren JavaScript)
   */
  async scrapeWithPuppeteer(url, config) {
    let browser;
    try {
      logger.info(`🚀 Usando Puppeteer para: ${url}`);
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      await page.setUserAgent(this.commonHeaders['User-Agent']);
      
      // Establecer headers personalizados
      const headers = { ...this.commonHeaders };
      if (config.customHeaders) {
        Object.assign(headers, config.customHeaders);
      }
      await page.setExtraHTTPHeaders(headers);

      logger.info(`📡 Navegando a: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      }).catch(err => {
        logger.warn(`⚠️ Timeout en navegación: ${err.message}`);
      });

      // Scroll para cargar contenido dinámico
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      const html = await page.content();
      await browser.close();

      return html;
    } catch (error) {
      if (browser) {
        await browser.close().catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Scrapear sitio con reintentos y URLs alternativas
   */
  async scrapeSite(domain, targetUrl) {
    const config = this.sitesConfig[domain];
    if (!config) {
      logger.warn(`⚠️ No hay configuración para: ${domain}`);
      return null;
    }

    logger.info(`🚀 Scraper Avanzado: ${config.name}`);

    const urlsToTry = config.urls || [targetUrl];

    for (const url of urlsToTry) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          logger.info(`📡 Intentando: ${url} (intento ${attempt + 1}/3)`);

          let html;
          
          // Usar Puppeteer si está configurado
          if (config.usePuppeteer) {
            html = await this.scrapeWithPuppeteer(url, config);
          } else {
            const headers = { ...this.commonHeaders };
            if (config.customHeaders) {
              Object.assign(headers, config.customHeaders);
            }
            
            const response = await axios.get(url, {
              headers: headers,
              timeout: 15000,
              maxRedirects: 5
            });
            html = response.data;
          }

          const $ = cheerio.load(html);
          const baseUrl = obtenerURLBase(url);

          // Estrategia 1: Usar selectores configurados
          let noticias = this.extractNews(
            $,
            config.selectors.container,
            config.selectors.title,
            config.selectors.link,
            baseUrl
          );

          if (noticias.length > 0) {
            logger.info(`✅ ${config.name}: ${noticias.length} noticias extraídas`);
            return noticias;
          }

          // Estrategia 2: Búsqueda exhaustiva
          logger.info(`🔍 Estrategia 2: Búsqueda exhaustiva...`);
          const allLinks = $('a[href]');
          const newsUrls = new Set();

          allLinks.each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();

            if (href && text && text.length > 10 && !text.match(/menu|navegacion|search/i)) {
              if (href.includes('/') && !href.startsWith('#')) {
                try {
                  const fullUrl = new URL(href, baseUrl).href;
                  if (fullUrl.includes(domain) || fullUrl.startsWith(baseUrl)) {
                    newsUrls.add(fullUrl);
                  }
                } catch (e) {
                  // Ignorar URLs inválidas
                }
              }
            }
          });

          if (newsUrls.size > 0) {
            noticias = Array.from(newsUrls).map(url => ({
              titulo: $(allLinks).filter(`[href="${url}"]`).text().trim() || 'Sin título',
              enlace: url,
              descripcion: 'No hay descripción disponible'
            }));

            logger.info(`✅ ${config.name}: ${noticias.length} noticias (búsqueda exhaustiva)`);
            return noticias;
          }

        } catch (error) {
          logger.warn(`⚠️ Error en ${url}: ${error.message}`);
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
    }

    logger.warn(`❌ No se pudo scrapear: ${config.name}`);
    return null;
  }

  /**
   * Método principal para scrapear cualquier sitio problemático
   */
  async scrapeProblematicSite(targetUrl) {
    // Encontrar dominio
    const domain = Object.keys(this.sitesConfig).find(d => targetUrl.includes(d));

    if (!domain) {
      logger.warn(`⚠️ Sitio no configurado: ${targetUrl}`);
      return null;
    }

    const noticias = await this.scrapeSite(domain, targetUrl);

    if (!noticias || noticias.length === 0) {
      return null;
    }

    // Deduplicar
    const noticiasUnicas = Array.from(new Set(noticias.map(n => n.titulo)))
      .map(titulo => noticias.find(n => n.titulo === titulo))
      .filter(n => n && n.enlace);

    return {
      sitio: obtenerURLBase(targetUrl),
      total_noticias: noticiasUnicas.length,
      noticias: noticiasUnicas,
      metadata: {
        configType: 'advanced',
        configSource: 'problematic-sites-scraper',
        method: 'puppeteer-cheerio',
        scrapedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = { AdvancedProblematicSitesScraper };
