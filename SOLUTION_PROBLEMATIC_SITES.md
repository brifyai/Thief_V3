/**
 * Servicio de Scraping Robusto
 * Maneja sitios problemáticos con reintentos, Puppeteer y fallbacks
 */

const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

class RobustScraperService {
  constructor() {
    this.browser = null;
  }

  /**
   * Scrape con reintentos automáticos
   */
  async scrapeWithRetries(url, config = {}) {
    const maxRetries = config.maxRetries || 5;
    const retryDelay = config.retryDelay || 2000;
    const usePuppeteer = config.usePuppeteer !== false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[Intento ${attempt}/${maxRetries}] Scrapeando ${url}`);

        if (usePuppeteer) {
          return await this.scrapeWithPuppeteer(url, config);
        } else {
          return await this.scrapeWithAxios(url, config);
        }
      } catch (error) {
        logger.warn(`[Intento ${attempt}] Error: ${error.message}`);

        if (attempt === maxRetries) {
          logger.error(`Todos los intentos fallaron para ${url}`);
          throw error;
        }

        // Backoff exponencial
        const delay = retryDelay * attempt;
        logger.info(`Esperando ${delay}ms antes de reintentar...`);
        await this.delay(delay);
      }
    }
  }

  /**
   * Scrape con Puppeteer (para sitios dinámicos)
   */
  async scrapeWithPuppeteer(url, config = {}) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      // Configurar headers
      if (config.headers) {
        await page.setUserAgent(config.headers['User-Agent'] || 'Mozilla/5.0');
        await page.setExtraHTTPHeaders(config.headers);
      }

      // Navegar
      const timeout = config.timeout || 30000;
      const waitUntil = config.puppeteerWaitUntil || 'networkidle2';

      await page.goto(url, {
        waitUntil: waitUntil,
        timeout: timeout
      });

      // Scroll para cargar contenido dinámico
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await this.delay(2000);

      // Obtener HTML
      const html = await page.content();
      await browser.close();

      return this.extractNews(html);
    } catch (error) {
      if (browser) await browser.close();
      throw error;
    }
  }

  /**
   * Scrape con Axios (más rápido para sitios estáticos)
   */
  async scrapeWithAxios(url, config = {}) {
    const timeout = config.timeout || 15000;
    const headers = config.headers || {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    const response = await axios.get(url, {
      timeout: timeout,
      httpsAgent: httpsAgent,
      headers: headers
    });

    return this.extractNews(response.data);
  }

  /**
   * Extraer noticias del HTML
   */
  extractNews(html) {
    const $ = cheerio.load(html);

    const articles = [];

    // Buscar artículos
    $('article, .article, .post, .news-item, [data-article]').each((i, el) => {
      const $el = $(el);

      const title = $el.find('h1, h2, h3, .title, .headline').first().text().trim();
      const link = $el.find('a[href]').first().attr('href');
      const description = $el.find('p, .description, .excerpt').first().text().trim();

      if (title && link) {
        articles.push({
          title: title.substring(0, 200),
          link: link,
          description: description.substring(0, 500)
        });
      }
    });

    // Si no encontró artículos, buscar links
    if (articles.length === 0) {
      $('a[href*="/"]').each((i, el) => {
        if (articles.length >= 50) return false;

        const $el = $(el);
        const link = $el.attr('href');
        const title = $el.text().trim();

        if (title && link && title.length > 5) {
          articles.push({
            title: title.substring(0, 200),
            link: link,
            description: ''
          });
        }
      });
    }

    return articles;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cerrar browser si está abierto
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new RobustScraperService();