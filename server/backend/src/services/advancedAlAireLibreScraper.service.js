const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { loggers } = require('../utils/logger');
const { isValidTitle, isValidContent, sanitizeText, extractImages } = require('../utils/contentValidator');

const logger = loggers.scraping;

/**
 * Scraper avanzado personalizado para Al Aire Libre
 * Implementa múltiples estrategias para maximizar la extracción de noticias
 */
class AdvancedAlAireLibreScraper {
  constructor() {
    this.baseUrl = 'https://alairelibre.cl';
    this.maxRetries = 3;
    this.timeout = 30000;

    // Headers avanzados para bypass anti-bot
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    };
  }

  /**
   * Método principal de scraping
   */
  async scrape() {
    logger.info('🚀 Iniciando scraper avanzado para Al Aire Libre');

    try {
      // Estrategia 1: Puppeteer con scroll agresivo y JavaScript
      logger.info('📱 Estrategia 1: Puppeteer con scroll infinito y ejecución de JS');
      const puppeteerResults = await this.scrapeWithPuppeteer();

      if (puppeteerResults && puppeteerResults.length > 10) {
        logger.info(`✅ Puppeteer exitoso: ${puppeteerResults.length} noticias`);
        return puppeteerResults;
      }

      // Estrategia 2: Axios con headers avanzados + análisis profundo (6 estrategias)
      logger.info('🌐 Estrategia 2: Axios con análisis profundo del HTML (6 estrategias)');
      const axiosResults = await this.scrapeWithAxiosDeep();

      if (axiosResults && axiosResults.length > puppeteerResults.length) {
        logger.info(`✅ Axios profundo exitoso: ${axiosResults.length} noticias`);
        return axiosResults;
      }

      // Estrategia 3: Combinar resultados y deduplicar
      logger.info('🔄 Estrategia 3: Combinando resultados');
      const combinedResults = this.combineAndDeduplicate(puppeteerResults, axiosResults);

      logger.info(`🎯 Resultado final: ${combinedResults.length} noticias únicas`);
      return combinedResults;

    } catch (error) {
      logger.error('❌ Error en scraper avanzado:', error);
      throw error;
    }
  }

  /**
   * Estrategia 1: Puppeteer con scroll infinito y JavaScript
   */
  async scrapeWithPuppeteer() {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      });

      const page = await browser.newPage();

      // Configurar página
      await page.setDefaultNavigationTimeout(this.timeout);
      await page.setUserAgent(this.headers['User-Agent']);
      await page.setExtraHTTPHeaders(this.headers);

      // Bloquear recursos innecesarios
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      logger.info('🔍 Navegando a Al Aire Libre...');
      await page.goto(this.baseUrl, {
        waitUntil: 'networkidle2',
        timeout: this.timeout
      });

      // Esperar a que cargue el contenido dinámico
      await page.waitForTimeout(3000);

      // Scroll agresivo para cargar más contenido
      await this.performAggressiveScroll(page);

      // Ejecutar JavaScript adicional para cargar más contenido
      await page.evaluate(() => {
        // Disparar eventos de carga
        document.querySelectorAll('[data-lazy]').forEach(el => {
          el.dispatchEvent(new Event('load'));
        });

        // Simular interacciones con botones de "cargar más"
        document.querySelectorAll('button[data-load-more], .load-more, [class*="load-more"], [class*="ver-mas"]').forEach(btn => {
          try {
            btn.click();
          } catch (e) {}
        });
      });

      // Esperar a que se cargue el contenido adicional
      await page.waitForTimeout(2000);

      // Extraer noticias con múltiples estrategias
      const newsData = await page.evaluate(() => {
        const news = [];

        // Estrategia A: Buscar todas las tarjetas de noticias
        const cards = document.querySelectorAll('.card, .post, .entry, article, .news-item, [class*="post"], [class*="item"]');
        cards.forEach(card => {
          const link = card.querySelector('a[href]');
          if (link) {
            const href = link.href;
            const title = link.textContent?.trim() ||
                         link.getAttribute('title') ||
                         card.querySelector('h1, h2, h3, h4')?.textContent?.trim();

            const image = card.querySelector('img')?.src ||
                         card.querySelector('img')?.getAttribute('data-src');

            if (title && title.length > 10 && href) {
              news.push({
                title: title.substring(0, 200),
                url: href,
                image: image,
                source: 'Al Aire Libre',
                extractedAt: new Date().toISOString(),
                method: 'puppeteer-cards'
              });
            }
          }
        });

        // Estrategia B: Buscar en menús y navegación
        const menuLinks = document.querySelectorAll('menu a, nav a, .navbar a, .menu a, .navigation a');
        menuLinks.forEach(link => {
          const href = link.href;
          const title = link.textContent?.trim() || link.getAttribute('title');

          if (href && title && title.length > 5 && !news.find(n => n.url === href)) {
            news.push({
              title: title.substring(0, 200),
              url: href,
              image: null,
              source: 'Al Aire Libre',
              extractedAt: new Date().toISOString(),
              method: 'puppeteer-menu'
            });
          }
        });

        // Estrategia C: Buscar todos los enlaces que parezcan noticias
        const allLinks = document.querySelectorAll('a[href]');
        allLinks.forEach(link => {
          const href = link.href;
          const title = link.textContent?.trim() ||
                       link.getAttribute('title') ||
                       link.getAttribute('aria-label');

          if (href && title && title.length > 10 && title.length < 300 && !news.find(n => n.url === href)) {
            news.push({
              title: title.substring(0, 200),
              url: href,
              image: null,
              source: 'Al Aire Libre',
              extractedAt: new Date().toISOString(),
              method: 'puppeteer-all-links'
            });
          }
        });

        return news;
      });

      logger.info(`📊 Puppeteer encontró ${newsData.length} noticias`);
      return newsData;

    } catch (error) {
      logger.error('❌ Error en Puppeteer:', error.message);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Realizar scroll agresivo para cargar contenido dinámico
   */
  async performAggressiveScroll(page) {
    try {
      logger.info('📜 Iniciando scroll agresivo para cargar contenido dinámico...');
      
      await page.evaluate(async () => {
        let scrollCount = 0;
        const maxScrolls = 20; // Muy agresivo
        let lastHeight = document.body.scrollHeight;

        while (scrollCount < maxScrolls) {
          // Scroll al final
          window.scrollTo(0, document.body.scrollHeight);
          
          // Esperar a que cargue contenido
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Calcular nueva altura
          const newHeight = document.body.scrollHeight;
          
          // Si no hay cambio en altura, probablemente no hay más contenido
          if (newHeight === lastHeight) {
            scrollCount++;
            if (scrollCount > 5) break; // Permitir 5 scrolls sin cambio antes de salir
          } else {
            scrollCount = 0; // Resetear contador si hay nuevo contenido
            lastHeight = newHeight;
          }
        }

        // Scroll final al inicio para asegurar que todo está cargado
        window.scrollTo(0, 0);
        await new Promise(resolve => setTimeout(resolve, 1000));
      });

      logger.info('✅ Scroll completado');
    } catch (error) {
      logger.warn('⚠️ Error durante scroll:', error.message);
    }
  }

  /**
   * Estrategia 2: Axios con análisis profundo del HTML (6 estrategias)
   */
  async scrapeWithAxiosDeep() {
    try {
      logger.info('🌐 Iniciando análisis profundo con Axios...');

      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        timeout: this.timeout,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      const news = [];

      // Estrategia 1: Análisis de contenedores principales
      logger.info('🔍 Estrategia 1: Analizando contenedores principales...');
      const containerResults = this.extractFromContainers($);
      news.push(...containerResults);

      // Estrategia 2: Análisis de menús y navegación
      logger.info('🔍 Estrategia 2: Analizando menús y navegación...');
      const menuResults = this.extractFromMenus($);
      news.push(...menuResults);

      // Estrategia 3: Búsqueda exhaustiva de todos los enlaces
      logger.info('🔍 Estrategia 3: Búsqueda exhaustiva de enlaces...');
      const exhaustiveResults = this.extractExhaustiveLinks($);
      news.push(...exhaustiveResults);

      // Estrategia 4: Análisis de JSON-LD
      logger.info('🔍 Estrategia 4: Analizando JSON-LD...');
      const jsonLdResults = this.extractFromJsonLd($);
      news.push(...jsonLdResults);

      // Estrategia 5: Buscar en atributos de datos (data-*)
      logger.info('🔍 Estrategia 5: Analizando atributos de datos...');
      const dataAttrResults = this.extractFromDataAttributes($);
      news.push(...dataAttrResults);

      // Estrategia 6: Buscar en elementos con clases comunes de noticias
      logger.info('🔍 Estrategia 6: Analizando clases comunes de noticias...');
      const newsClassResults = this.extractFromNewsClasses($);
      news.push(...newsClassResults);

      logger.info(`📊 Axios profundo encontró ${news.length} noticias (antes de deduplicar)`);
      return news;

    } catch (error) {
      logger.error('❌ Error en Axios profundo:', error.message);
      return [];
    }
  }

  /**
   * Estrategia 1: Buscar en contenedores principales
   */
  extractFromContainers($) {
    const articles = [];
    const containers = [
      'main',
      '.container',
      '.displa-posts-block',
      '.main',
      'div.row.row-cols-1.row-cols-md-3.g-4.mb-5',
      'div.acf-block.category-block',
      '.posts-container',
      '.news-container',
      '.articles-container',
      '[role="main"]',
      '.content-main',
      '.site-content'
    ];

    for (const container of containers) {
      try {
        $(container).each((i, elem) => {
          const $container = $(elem);

          // Buscar todos los enlaces dentro del contenedor
          $container.find('a').each((j, link) => {
            const $link = $(link);
            const href = $link.attr('href');
            const title = $link.attr('title') || $link.attr('aria-label') || $link.text().trim();
            const image = $link.find('img').attr('src') || $link.find('img').attr('data-src');

            if (href && title && title.length > 5 && this.isValidNewsItem(title, href)) {
              articles.push({
                title: this.cleanText(title),
                url: this.normalizeUrl(href),
                image: image ? this.normalizeUrl(image) : null,
                source: 'Al Aire Libre',
                extractedAt: new Date().toISOString(),
                method: 'axios-containers'
              });
            }
          });
        });
      } catch (e) {
        // Continuar con siguiente contenedor
      }
    }

    return articles;
  }

  /**
   * Estrategia 2: Buscar en menús y navegación
   */
  extractFromMenus($) {
    const articles = [];
    const menuSelectors = [
      'nav a',
      '.menu a',
      '.nav a',
      '.navbar a',
      '.navigation a',
      '.breadcrumb a',
      '.sidebar a',
      '.widget a',
      '.widget-content a',
      '.recent-posts a',
      '.popular-posts a',
      '.trending a',
      '[data-menu] a',
      '.category-menu a',
      '.section-menu a'
    ];

    for (const selector of menuSelectors) {
      try {
        $(selector).each((i, elem) => {
          const $link = $(elem);
          const href = $link.attr('href');
          const title = $link.attr('title') || $link.attr('aria-label') || $link.text().trim();

          if (href && title && title.length > 5 && this.isValidNewsItem(title, href)) {
            articles.push({
              title: this.cleanText(title),
              url: this.normalizeUrl(href),
              source: 'Al Aire Libre',
              extractedAt: new Date().toISOString(),
              method: 'axios-menu'
            });
          }
        });
      } catch (e) {
        // Continuar
      }
    }

    return articles;
  }

  /**
   * Estrategia 3: Búsqueda exhaustiva de todos los enlaces
   */
  extractExhaustiveLinks($) {
    const articles = [];
    const seen = new Set();

    $('a').each((i, elem) => {
      try {
        const $link = $(elem);
        const href = $link.attr('href');
        const title = $link.attr('title') || $link.attr('aria-label') || $link.text().trim();
        const image = $link.find('img').attr('src') || $link.find('img').attr('data-src');
        
        if (href && title && title.length > 5 && !seen.has(href) && this.isValidNewsItem(title, href)) {
          seen.add(href);
          articles.push({
            title: this.cleanText(title),
            url: this.normalizeUrl(href),
            image: image ? this.normalizeUrl(image) : null,
            source: 'Al Aire Libre',
            extractedAt: new Date().toISOString(),
            method: 'axios-exhaustive'
          });
        }
      } catch (e) {
        // Continuar
      }
    });

    return articles;
  }

  /**
   * Estrategia 4: Buscar en JSON-LD
   */
  extractFromJsonLd($) {
    const articles = [];

    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const json = JSON.parse($(elem).html());

        if (json['@type'] === 'NewsArticle' || json['@type'] === 'Article') {
          const title = json.headline || json.name;
          const url = json.url;
          if (this.isValidNewsItem(title, url)) {
            articles.push({
              title: title,
              url: url,
              image: json.image?.url || json.image,
              source: 'Al Aire Libre',
              extractedAt: new Date().toISOString(),
              method: 'axios-json-ld'
            });
          }
        } else if (Array.isArray(json)) {
          json.forEach(item => {
            if (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') {
              const title = item.headline || item.name;
              const url = item.url;
              if (this.isValidNewsItem(title, url)) {
                articles.push({
                  title: title,
                  url: url,
                  image: item.image?.url || item.image,
                  source: 'Al Aire Libre',
                  extractedAt: new Date().toISOString(),
                  method: 'axios-json-ld'
                });
              }
            }
          });
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    });

    return articles;
  }

  /**
   * Estrategia 5: Buscar en atributos de datos (data-*)
   */
  extractFromDataAttributes($) {
    const articles = [];
    const seen = new Set();

    // Buscar elementos con atributos data-*
    $('[data-url], [data-href], [data-link], [data-title], [data-article], [data-post]').each((i, elem) => {
      try {
        const $elem = $(elem);
        const href = $elem.attr('data-url') || $elem.attr('data-href') || $elem.attr('data-link');
        const title = $elem.attr('data-title') || $elem.attr('title') || $elem.text().trim();

        if (href && title && title.length > 5 && !seen.has(href) && this.isValidNewsItem(title, href)) {
          seen.add(href);
          articles.push({
            title: this.cleanText(title),
            url: this.normalizeUrl(href),
            source: 'Al Aire Libre',
            extractedAt: new Date().toISOString(),
            method: 'axios-data-attributes'
          });
        }
      } catch (e) {
        // Continuar
      }
    });

    return articles;
  }

  /**
   * Estrategia 6: Buscar en elementos con clases comunes de noticias
   */
  extractFromNewsClasses($) {
    const articles = [];
    const seen = new Set();
    const newsClasses = [
      '.news',
      '.article',
      '.post',
      '.story',
      '.item',
      '.entry',
      '.card',
      '.tile',
      '.block',
      '.box',
      '[class*="news"]',
      '[class*="article"]',
      '[class*="post"]',
      '[class*="story"]',
      '[class*="item"]'
    ];

    for (const selector of newsClasses) {
      try {
        $(selector).each((i, elem) => {
          const $elem = $(elem);
          const $link = $elem.find('a').first();
          
          if ($link.length) {
            const href = $link.attr('href');
            const title = $link.attr('title') || $link.text().trim();

            if (href && title && title.length > 5 && !seen.has(href) && this.isValidNewsItem(title, href)) {
              seen.add(href);
              articles.push({
                title: this.cleanText(title),
                url: this.normalizeUrl(href),
                source: 'Al Aire Libre',
                extractedAt: new Date().toISOString(),
                method: 'axios-news-classes'
              });
            }
          }
        });
      } catch (e) {
        // Continuar
      }
    }

    return articles;
  }

  /**
   * Limpiar texto
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  /**
   * Normalizar URL
   */
  normalizeUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${this.baseUrl}${url}`;
    return `${this.baseUrl}/${url}`;
  }

  /**
   * Combinar y deduplicar resultados de múltiples estrategias
   */
  combineAndDeduplicate(...resultArrays) {
    const allNews = resultArrays.flat();
    const uniqueNews = [];
    const seenUrls = new Set();

    // Ordenar por método (priorizar puppeteer sobre axios)
    const methodPriority = {
      'puppeteer-cards': 1,
      'puppeteer-menu': 2,
      'puppeteer-all-links': 3,
      'axios-containers': 4,
      'axios-menu': 5,
      'axios-exhaustive': 6,
      'axios-json-ld': 7,
      'axios-data-attributes': 8,
      'axios-news-classes': 9
    };

    allNews.sort((a, b) => {
      const priorityA = methodPriority[a.method] || 999;
      const priorityB = methodPriority[b.method] || 999;
      return priorityA - priorityB;
    });

    for (const news of allNews) {
      if (!seenUrls.has(news.url) && this.isValidNewsItem(news.title, news.url)) {
        uniqueNews.push(news);
        seenUrls.add(news.url);
      }
    }

    return uniqueNews.slice(0, 100); // Limitar a 100 noticias máximo
  }

  /**
   * Validar si un item es una noticia válida
   */
  isValidNewsItem(title, url) {
    if (!title || !url) return false;

    // Excluir URLs no deseadas - LISTA EXPANDIDA
    const excludePatterns = [
      '/categoria/', '/tag/', '/author/', '/page/', '/search/',
      '/contacto/', '/acerca-de/', '/privacidad/', '/terminos/',
      '/politica-de-privacidad/', '/politica-de-afiliados/',
      '/aviso-legal/', '/terminos-y-condiciones/',
      '/juego-responsable/', '/adiccion-al-juego/',
      '/sobre-nosotros/', '/carta-del-periodista/',
      '/todas-las-noticias/', '/apuestas/', '/lucha-libre/',
      '/polideportivo/', '/fuera-de-juego/',
      '#', 'javascript:', 'mailto:', 'tel:'
    ];

    // Excluir URLs que terminan en categorías sin artículo específico
    const categoryOnlyPatterns = [
      /\/futbol\/$/, /\/tenis\/$/, /\/polideportivo\/$/,
      /\/lucha-libre\/$/, /\/fuera-de-juego\/$/, /\/apuestas\/$/,
      /\/contacto\/$/, /\/sobre-nosotros\/$/, /\/politica-de-privacidad\/$/
    ];

    if (excludePatterns.some(pattern => url.includes(pattern))) {
      return false;
    }

    if (categoryOnlyPatterns.some(pattern => pattern.test(url))) {
      return false;
    }

    // Validar longitud del título
    if (title.length < 5 || title.length > 300) return false;

    // Excluir títulos que parecen ser categorías o páginas especiales
    const excludeTitles = [
      'Futbol', 'Tenis', 'Polideportivo', 'Lucha Libre', 'Fuera de Juego',
      'Apuestas', 'Contacto', 'Sobre nosotros', 'Privacidad', 'Términos',
      'Aviso Legal', 'Política de Privacidad', 'Política de Afiliados',
      'Juego Responsable', 'Adicción al Juego', 'Carta del Periodista',
      'Todas las Noticias'
    ];

    if (excludeTitles.some(excluded => title.toLowerCase().includes(excluded.toLowerCase()))) {
      return false;
    }

    return true;
  }

  /**
   * Método público para usar desde el scraper principal
   * Retorna en formato compatible con scraping.service.js
   */
  async scrapeAlAireLibre() {
    const results = await this.scrape();
    
    // Convertir formato: { title, url } → { titulo, enlace }
    return results.map(item => ({
      titulo: item.title,
      enlace: item.url,
      descripcion: 'No hay descripción disponible',
      source: item.source,
      method: item.method
    }));
  }
}

module.exports = { AdvancedAlAireLibreScraper };