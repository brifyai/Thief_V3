const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { loggers } = require('../utils/logger');
const EnhancedOCRService = require('./enhancedOCR.service');

const logger = loggers.scraping;

/**
 * Servicio mejorado para scraping de lun.com - VERSIÓN 2.0
 * Solución completa a los problemas identificados:
 * - Viewport aumentado de 1280x720 a 1920x1080
 * - Scroll súper agresivo implementado
 * - Múltiples screenshots en diferentes posiciones
 * - OCR con mayor calidad
 */
class LunComScraperServiceV2 {
  constructor() {
    this.url = 'https://www.lun.com';
    this.ocrService = new EnhancedOCRService();
    this.screenshotDir = path.join(__dirname, '../../temp/lun-screenshots-v2');
    this.lastScrapedTime = null;
    this.isScheduled = false;
    
    // Crear directorio de screenshots si no existe
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
    
    logger.info('🎬 LUN.COM Scraper Service V2 inicializado (MEJORADO)');
  }

  /**
   * Iniciar scheduler automático
   * Ejecuta scraping entre 00:01 y 06:00 AM en horarios aleatorios
   */
  startScheduler() {
    if (this.isScheduled) {
      logger.warn('⚠️ Scheduler ya está activo');
      return;
    }
    
    this.isScheduled = true;
    logger.info('📅 Iniciando scheduler de LUN.COM V2 (00:01 - 06:00 AM)');
    
    // Ejecutar verificación cada minuto
    this.schedulerInterval = setInterval(() => {
      this.checkAndExecuteSchedule();
    }, 60000); // Cada minuto
    
    // Ejecutar verificación inicial
    this.checkAndExecuteSchedule();
  }

  /**
   * Detener scheduler
   */
  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.isScheduled = false;
      logger.info('⏹️ Scheduler de LUN.COM V2 detenido');
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
    
    // Ventana de ejecución: 00:01 - 06:00 AM
    const isInWindow = (hours === 0 && minutes >= 1) || (hours >= 1 && hours < 6);
    
    if (!isInWindow) {
      return;
    }
    
    // Verificar si ya se ejecutó hoy
    if (this.lastScrapedTime) {
      const lastDate = new Date(this.lastScrapedTime);
      const today = new Date();
      
      if (
        lastDate.getFullYear() === today.getFullYear() &&
        lastDate.getMonth() === today.getMonth() &&
        lastDate.getDate() === today.getDate()
      ) {
        // Ya se ejecutó hoy
        return;
      }
    }
    
    // Ejecutar scraping con horario aleatorio
    logger.info(`🚀 Ejecutando scraping de LUN.COM V2 a las ${hours}:${String(minutes).padStart(2, '0')}`);
    this.scrapeAndSave().catch(error => {
      logger.error(`❌ Error en scraping automático: ${error.message}`);
    });
  }

  /**
   * Ejecutar scraping completo y guardar resultados
   */
  async scrapeAndSave() {
    try {
      logger.info('📸 Iniciando captura de pantalla mejorada de LUN.COM V2');
      
      // Capturar múltiples screenshots (nueva funcionalidad)
      const screenshotPaths = await this.captureMultipleScreenshotsImproved();
      
      // Extraer texto con OCR mejorado de todas las imágenes
      logger.info('🚀 Extrayendo texto con OCR mejorado de múltiples imágenes');
      const allTexts = [];
      
      for (const screenshotPath of screenshotPaths) {
        try {
          const extractedText = await this.ocrService.extractTextFromImage(screenshotPath);
          allTexts.push(extractedText);
        } catch (error) {
          logger.warn(`⚠️ Error procesando imagen ${screenshotPath}: ${error.message}`);
        }
      }
      
      // Combinar todos los textos extraídos
      const combinedText = allTexts.join('\n');
      logger.info(`📄 Texto combinado: ${combinedText.length} caracteres de ${screenshotPaths.length} imágenes`);
      
      // Procesar texto para extraer noticias
      const noticias = this.processExtractedText(combinedText);
      
      // Guardar resultados con nombre basado en fecha
      const today = new Date().toISOString().split('T')[0];
      const resultsPath = path.join(this.screenshotDir, `lun-results-v2-${today}.json`);
      fs.writeFileSync(resultsPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        version: '2.0',
        screenshotPaths,
        totalImages: screenshotPaths.length,
        totalNoticias: noticias.length,
        noticias
      }, null, 2));
      
      logger.info(`✅ Scraping V2 completado: ${noticias.length} noticias extraídas de ${screenshotPaths.length} imágenes`);
      this.lastScrapedTime = new Date();
      
      return noticias;
    } catch (error) {
      logger.error(`❌ Error en scrapeAndSave V2: ${error.message}`);
      throw error;
    }
  }

  /**
   * Capturar múltiples screenshots mejorados en diferentes posiciones
   * SOLUCIÓN: Viewport 1920x1080 + Scroll súper agresivo
   * @private
   */
  async captureMultipleScreenshotsImproved() {
    let browser;
    const screenshots = [];
    const strategies = [
      {
        name: 'chrome-installed',
        executablePath: 'C:\\Users\\admin\\.cache\\puppeteer\\chrome\\win64-142.0.7444.59\\chrome-win64\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      },
      { name: 'default', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'] },
      { name: 'stealth', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-blink-features=AutomationControlled'] },
      { name: 'minimal', args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    ];

    for (let attempt = 0; attempt < strategies.length; attempt++) {
      try {
        const strategy = strategies[attempt];
        logger.debug(`🌐 Intento ${attempt + 1}/${strategies.length} - Estrategia: ${strategy.name}`);

        const launchOptions = {
          headless: 'new',
          args: strategy.args,
          timeout: 45000
        };

        if (strategy.executablePath) {
          launchOptions.executablePath = strategy.executablePath;
          logger.debug(`📍 Usando Chrome instalado: ${strategy.executablePath}`);
        }

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        // MEJORA 1: Viewport de muy alta resolución para Google Vision
        await page.setViewport({
          width: 2560, // 4K width
          height: 1440, // 2K height
          deviceScaleFactor: 2 // High DPI
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.setExtraHTTPHeaders({
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive'
        });

        await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 30000 });

        const title = await page.title();
        logger.debug(`📄 Título de página: ${title}`);

        // MEJORA 2: Scroll súper agresivo para cargar TODO el contenido
        await this.superAggressiveScrollImproved(page);

        // MEJORA 3: Capturar múltiples screenshots en diferentes posiciones
        const positions = [0, 0.2, 0.4, 0.6, 0.8, 1.0]; // 6 posiciones en lugar de 5
        
        for (let i = 0; i < positions.length; i++) {
          const position = positions[i];
          const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
          const targetPosition = Math.floor(scrollHeight * position);
          
          // Scroll a la posición
          await page.evaluate((pos) => {
            window.scrollTo(0, pos);
          }, targetPosition);
          
          // Esperar para estabilizar
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // MEJORA 4: Screenshot de máxima calidad para Google Vision
          const screenshotPath = path.join(
            this.screenshotDir,
            `lun-v2-multi-${i}-${Date.now()}.png` // PNG para máxima calidad
          );
          
          await page.screenshot({
            path: screenshotPath,
            fullPage: false,
            type: 'png', // PNG sin compresión para máxima calidad
            omitBackground: false // Mantener fondo para mejor OCR
          });
          
          screenshots.push(screenshotPath);
          logger.debug(`📸 Screenshot V2 ${i + 1}/6 capturado en posición ${position * 100}%`);
        }

        await browser.close();
        logger.info(`✅ Captura múltiple completada: ${screenshots.length} screenshots en Full HD`);
        return screenshots;

      } catch (error) {
        logger.warn(`⚠️ Estrategia ${strategies[attempt].name} falló: ${error.message}`);
        if (browser) await browser.close().catch(() => {});
        
        if (attempt === strategies.length - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Scroll súper agresivo mejorado para cargar TODO el contenido dinámico
   * SOLUCIÓN: Mayor tiempo de espera y mejor detección de cambios
   * @private
   */
  async superAggressiveScrollImproved(page) {
    try {
      logger.debug('📜 Iniciando scroll súper agresivo mejorado V2');

      // Obtener altura inicial
      const initialHeight = await page.evaluate(() => document.body.scrollHeight);
      logger.debug(`📏 Altura inicial: ${initialHeight}px`);

      let scrollCount = 0;
      let lastHeight = initialHeight;
      let noChangeCount = 0;

      // MEJORA: Más intentos y mejor detección
      while (scrollCount < 25 && noChangeCount < 4) { // Aumentado de 20/3 a 25/4
        try {
          // Scroll hacia abajo de forma más agresiva
          await page.evaluate(() => {
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: 'smooth'
            });
          });

          // MEJORA: Esperar más tiempo para contenido dinámico
          await new Promise(resolve => setTimeout(resolve, 3000)); // Aumentado de 2000 a 3000ms

          // Verificar si cambió la altura
          const newHeight = await page.evaluate(() => document.body.scrollHeight);

          if (newHeight === lastHeight) {
            noChangeCount++;
            logger.debug(`📜 No cambio en altura (${noChangeCount}/4): ${newHeight}px`);
          } else {
            noChangeCount = 0;
            lastHeight = newHeight;
            logger.debug(`📜 Scroll V2 ${scrollCount + 1}: altura ${newHeight}px (cambio: +${newHeight - initialHeight}px)`);
          }

          scrollCount++;

        } catch (scrollError) {
          logger.warn(`⚠️ Error en scroll V2 ${scrollCount}: ${scrollError.message}`);
          noChangeCount++;
        }
      }

      // Scroll hacia arriba para volver al inicio
      await page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      // Esperar para estabilizar
      await new Promise(resolve => setTimeout(resolve, 2000));

      logger.debug(`✅ Scroll súper agresivo V2 completado: ${scrollCount} scrolls, altura final: ${lastHeight}px (+${lastHeight - initialHeight}px)`);
    } catch (error) {
      logger.warn(`⚠️ Error en scroll súper agresivo V2: ${error.message}`);
    }
  }

  /**
   * Procesar texto extraído para obtener noticias
   * @private
   */
  processExtractedText(texto) {
    if (!texto) return [];
    
    const noticias = [];
    const lineas = texto.split('\n');
    
    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i].trim();
      
      // Filtrar líneas válidas
      if (
        linea.length > 15 &&
        linea.length < 300 &&
        !this.isExcludedContent(linea)
      ) {
        // Intentar obtener descripción de líneas siguientes
        let descripcion = '';
        for (let j = i + 1; j < Math.min(i + 3, lineas.length); j++) {
          const nextLine = lineas[j].trim();
          if (nextLine.length > 10 && nextLine.length < 200) {
            descripcion = nextLine;
            break;
          }
        }
        
        noticias.push({
          titulo: linea,
          descripcion: descripcion || '',
          fuente: 'lun.com',
          url: this.url,
          fechaExtraccion: new Date().toISOString(),
          version: '2.0'
        });
      }
    }
    
    // Remover duplicados
    return this.deduplicateNews(noticias);
  }

  /**
   * Verificar si el contenido debe ser excluido
   * @private
   */
  isExcludedContent(texto) {
    const excludedPatterns = [
      /publicidad/i,
      /anuncio/i,
      /advertisement/i,
      /haga click/i,
      /suscríbete/i,
      /regístrate/i,
      /newsletter/i,
      /cookie/i,
      /términos/i,
      /privacidad/i,
      /^[a-z0-9]{20,}$/i, // Strings aleatorios
      /^[0-9\s\-\.]+$/, // Solo números
      /^[A-Z\s]{20,}$/ // Solo mayúsculas
    ];
    
    return excludedPatterns.some(pattern => pattern.test(texto));
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
        if (file.includes('results') && file.includes('v2') && file.includes(today)) {
          const filePath = path.join(this.screenshotDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return data.noticias;
        }
      }
      
      return null;
    } catch (error) {
      logger.error(`❌ Error obteniendo noticias de hoy V2: ${error.message}`);
      return null;
    }
  }

  /**
   * Ejecutar scraping manual mejorado (para testing)
   */
  async scrapeManual() {
    try {
      logger.info('🔧 Ejecutando scraping manual V2 de LUN.COM');
      return await this.scrapeAndSave();
    } catch (error) {
      logger.error(`❌ Error en scraping manual V2: ${error.message}`);
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getLunComScraperServiceV2() {
  if (!instance) {
    instance = new LunComScraperServiceV2();
  }
  return instance;
}

module.exports = {
  LunComScraperServiceV2,
  getLunComScraperServiceV2
};