const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { loggers } = require('../utils/logger');
const EnhancedOCRService = require('./enhancedOCR.service');
const cheerio = require('cheerio');

const logger = loggers.scraping;

/**
 * Servicio Híbrido para scraping de lun.com - VERSIÓN 3.0
 * Combina extracción directa del HTML con OCR como fallback
 * Estrategia principal: Extraer del DOM
 * Estrategia secundaria: OCR mejorado
 */
class LunComHybridService {
  constructor() {
    this.url = 'https://www.lun.com';
    this.ocrService = new EnhancedOCRService();
    this.screenshotDir = path.join(__dirname, '../../temp/lun-screenshots-hybrid');
    this.lastScrapedTime = null;
    this.isScheduled = false;
    
    // Crear directorio de screenshots si no existe
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
    
    logger.info('🎬 LUN.COM Hybrid Scraper Service V3 inicializado (HTML + OCR)');
  }

  /**
   * Iniciar scheduler automático
   */
  startScheduler() {
    if (this.isScheduled) {
      logger.warn('⚠️ Scheduler ya está activo');
      return;
    }
    
    this.isScheduled = true;
    logger.info('📅 Iniciando scheduler de LUN.COM Hybrid (00:01 - 06:00 AM)');
    
    this.schedulerInterval = setInterval(() => {
      this.checkAndExecuteSchedule();
    }, 60000);
    
    this.checkAndExecuteSchedule();
  }

  /**
   * Detener scheduler
   */
  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.isScheduled = false;
      logger.info('⏹️ Scheduler de LUN.COM Hybrid detenido');
    }
  }

  /**
   * Verificar si debe ejecutarse el scraping
   * @private
   */
  checkAndExecuteSchedule() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    const isInWindow = (hours === 0 && minutes >= 1) || (hours >= 1 && hours < 6);
    
    if (!isInWindow) {
      return;
    }
    
    if (this.lastScrapedTime) {
      const lastDate = new Date(this.lastScrapedTime);
      const today = new Date();
      
      if (
        lastDate.getFullYear() === today.getFullYear() &&
        lastDate.getMonth() === today.getMonth() &&
        lastDate.getDate() === today.getDate()
      ) {
        return;
      }
    }
    
    logger.info(`🚀 Ejecutando scraping híbrido de LUN.COM a las ${hours}:${String(minutes).padStart(2, '0')}`);
    this.scrapeAndSave().catch(error => {
      logger.error(`❌ Error en scraping automático: ${error.message}`);
    });
  }

  /**
   * Ejecutar scraping completo y guardar resultados
   */
  async scrapeAndSave() {
    try {
      logger.info('🔧 Iniciando scraping híbrido de LUN.COM V3');
      
      let noticias = [];
      let method = 'unknown';
      
      // Estrategia 1: Extraer directamente del HTML
      try {
        logger.info('📄 Intentando extracción directa del HTML...');
        noticias = await this.extractFromHTML();
        method = 'html';
        logger.info(`✅ Extracción HTML exitosa: ${noticias.length} noticias`);
      } catch (htmlError) {
        logger.warn(`⚠️ Extracción HTML falló: ${htmlError.message}`);
        
        // Estrategia 2: OCR mejorado como fallback
        try {
          logger.info('📸 Usando OCR mejorado como fallback...');
          noticias = await this.extractWithOCR();
          method = 'ocr';
          logger.info(`✅ OCR fallback exitoso: ${noticias.length} noticias`);
        } catch (ocrError) {
          logger.error(`❌ OCR fallback falló: ${ocrError.message}`);
          throw new Error('Ambos métodos de extracción fallaron');
        }
      }
      
      // Guardar resultados
      const today = new Date().toISOString().split('T')[0];
      const resultsPath = path.join(this.screenshotDir, `lun-results-hybrid-${today}.json`);
      fs.writeFileSync(resultsPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        version: '3.0-hybrid',
        method,
        totalNoticias: noticias.length,
        noticias
      }, null, 2));
      
      logger.info(`✅ Scraping híbrido completado: ${noticias.length} noticias extraídas (método: ${method})`);
      this.lastScrapedTime = new Date();
      
      return noticias;
    } catch (error) {
      logger.error(`❌ Error en scrapeAndSave híbrido: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extraer noticias directamente del HTML
   * @private
   */
  async extractFromHTML() {
    let browser;
    const strategies = [
      {
        name: 'chrome-installed',
        executablePath: 'C:\\Users\\admin\\.cache\\puppeteer\\chrome\\win64-142.0.7444.59\\chrome-win64\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      },
      { name: 'default', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] }
    ];

    for (let attempt = 0; attempt < strategies.length; attempt++) {
      try {
        const strategy = strategies[attempt];
        logger.debug(`🌐 Intento HTML ${attempt + 1}/${strategies.length} - Estrategia: ${strategy.name}`);

        const launchOptions = {
          headless: 'new',
          args: strategy.args,
          timeout: 45000
        };

        if (strategy.executablePath) {
          launchOptions.executablePath = strategy.executablePath;
        }

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        // Configurar headers realistas
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        
        await page.setViewport({ width: 1920, height: 1080 });

        // Navegar a lun.com
        await page.goto(this.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Esperar a que cargue el contenido dinámico
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Scroll para cargar más contenido
        await this.scrollPage(page);

        // Extraer el HTML
        const html = await page.content();
        
        await browser.close();

        // Procesar HTML con Cheerio
        const noticias = this.processHTML(html);
        
        if (noticias.length === 0) {
          throw new Error('No se encontraron noticias en el HTML');
        }

        return noticias;

      } catch (error) {
        logger.warn(`⚠️ Estrategia HTML ${strategies[attempt].name} falló: ${error.message}`);
        if (browser) await browser.close().catch(() => {});
        
        if (attempt === strategies.length - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Procesar HTML para extraer noticias
   * @private
   */
  processHTML(html) {
    const $ = cheerio.load(html);
    const noticias = [];
    
    // Selectores para diferentes tipos de artículos en LUN
    const selectors = [
      'article h2 a',
      'article h3 a',
      'h1 a',
      'h2 a',
      'h3 a',
      '.headline a',
      '.title a',
      '[data-testid="headline"] a',
      '.news-title a',
      '.article-title a'
    ];
    
    selectors.forEach(selector => {
      $(selector).each((i, element) => {
        const $el = $(element);
        const title = $el.text().trim();
        const href = $el.attr('href');
        
        if (title && title.length > 15 && title.length < 300) {
          // Construir URL completa si es relativa
          let fullUrl = href;
          if (href && !href.startsWith('http')) {
            fullUrl = href.startsWith('/') ? this.url + href : this.url + '/' + href;
          }
          
          // Evitar duplicados
          const exists = noticias.some(n => 
            n.titulo.toLowerCase() === title.toLowerCase()
          );
          
          if (!exists) {
            noticias.push({
              titulo: title,
              descripcion: '',
              fuente: 'lun.com',
              url: fullUrl || this.url,
              fechaExtraccion: new Date().toISOString(),
              version: '3.0-hybrid',
              method: 'html'
            });
          }
        }
      });
    });
    
    // Si no encontramos nada con selectores, intentar con texto plano
    if (noticias.length === 0) {
      const textContent = $('body').text();
      const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      lines.forEach(line => {
        if (
          line.length > 20 &&
          line.length < 200 &&
          !line.includes('publicidad') &&
          !line.includes('suscríbete') &&
          !line.includes('newsletter') &&
          !line.match(/^[0-9\s\-\.]+$/)
        ) {
          noticias.push({
            titulo: line,
            descripcion: '',
            fuente: 'lun.com',
            url: this.url,
            fechaExtraccion: new Date().toISOString(),
            version: '3.0-hybrid',
            method: 'html-text'
          });
        }
      });
    }
    
    return this.deduplicateNews(noticias);
  }

  /**
   * Extraer noticias usando OCR (fallback)
   * @private
   */
  async extractWithOCR() {
    // Usar el scraper V2 con OCR mejorado
    const { getLunComScraperServiceV2 } = require('./lunComScraper-v2.service');
    const scraperV2 = getLunComScraperServiceV2();
    
    const noticias = await scraperV2.scrapeManual();
    
    // Agregar metadata del método híbrido
    return noticias.map(noticia => ({
      ...noticia,
      version: '3.0-hybrid',
      method: 'ocr-fallback'
    }));
  }

  /**
   * Scroll para cargar contenido dinámico
   * @private
   */
  async scrollPage(page) {
    try {
      let scrollCount = 0;
      let lastHeight = await page.evaluate(() => document.body.scrollHeight);
      
      while (scrollCount < 10) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const newHeight = await page.evaluate(() => document.body.scrollHeight);
        
        if (newHeight === lastHeight) break;
        
        lastHeight = newHeight;
        scrollCount++;
      }
      
      // Volver al inicio
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      logger.warn(`⚠️ Error en scroll: ${error.message}`);
    }
  }

  /**
   * Remover noticias duplicadas
   * @private
   */
  deduplicateNews(noticias) {
    const seen = new Set();
    const unique = [];
    
    for (const noticia of noticias) {
      const key = noticia.titulo.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(noticia);
      }
    }
    
    return unique;
  }

  /**
   * Obtener noticias scrapeadas hoy
   */
  async getTodayNews() {
    try {
      const files = fs.readdirSync(this.screenshotDir);
      const today = new Date().toISOString().split('T')[0];
      
      for (const file of files) {
        if (file.includes('results') && file.includes('hybrid') && file.includes(today)) {
          const filePath = path.join(this.screenshotDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return data.noticias;
        }
      }
      
      return null;
    } catch (error) {
      logger.error(`❌ Error obteniendo noticias de hoy híbridas: ${error.message}`);
      return null;
    }
  }

  /**
   * Ejecutar scraping manual (para testing)
   */
  async scrapeManual() {
    try {
      logger.info('🔧 Ejecutando scraping manual híbrido de LUN.COM');
      return await this.scrapeAndSave();
    } catch (error) {
      logger.error(`❌ Error en scraping manual híbrido: ${error.message}`);
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getLunComHybridService() {
  if (!instance) {
    instance = new LunComHybridService();
  }
  return instance;
}

module.exports = {
  LunComHybridService,
  getLunComHybridService
};