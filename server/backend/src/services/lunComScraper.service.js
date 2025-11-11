const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { loggers } = require('../utils/logger');
const TesseractOCRService = require('./tesseractOCR.service');

const logger = loggers.scraping;

/**
 * Servicio especializado para scraping de lun.com
 * Utiliza Puppeteer para capturar pantallas + Tesseract.js OCR para extraer texto
 * Se ejecuta automáticamente entre 00:01 y 06:00 AM en horarios aleatorios
 * 
 * IMPORTANTE: Este es el servicio LUN V1.0
 * Para usar LUN V2.0 con mejores resultados, debe cargarse lunComScraper-v2.service.js
 */
class LunComScraperService {
  constructor() {
    this.url = 'https://www.lun.com';
    this.ocrService = new TesseractOCRService();
    this.screenshotDir = path.join(__dirname, '../../temp/lun-screenshots');
    this.lastScrapedTime = null;
    this.isScheduled = false;
    
    // Crear directorio de screenshots si no existe
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
    
    logger.info('🎬 LUN.COM Scraper Service V1.0 inicializado');
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
    logger.info('📅 Iniciando scheduler de LUN.COM (00:01 - 06:00 AM)');
    
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
      logger.info('⏹️ Scheduler de LUN.COM detenido');
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
    logger.info(`🚀 Ejecutando scraping de LUN.COM a las ${hours}:${String(minutes).padStart(2, '0')}`);
    this.scrapeAndSave().catch(error => {
      logger.error(`❌ Error en scraping automático: ${error.message}`);
    });
  }

  /**
   * Ejecutar scraping completo y guardar resultados
   */
  async scrapeAndSave() {
    try {
      logger.info('📸 Iniciando captura de pantalla de LUN.COM');
      
      // Capturar pantalla
      const screenshotPath = await this.captureScreenshot();
      
      // Extraer texto con Tesseract.js
      logger.info('🤖 Extrayendo texto con Tesseract.js');
      const extractedText = await this.ocrService.extractTextFromImage(screenshotPath);
      
      // Procesar texto para extraer noticias
      const noticias = this.processExtractedText(extractedText);
      
      // Guardar resultados con nombre basado en fecha
      const today = new Date().toISOString().split('T')[0];
      const resultsPath = path.join(this.screenshotDir, `lun-results-${today}.json`);
      fs.writeFileSync(resultsPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        screenshotPath,
        totalNoticias: noticias.length,
        noticias
      }, null, 2));
      
      logger.info(`✅ Scraping completado: ${noticias.length} noticias extraídas`);
      this.lastScrapedTime = new Date();
      
      return noticias;
    } catch (error) {
      logger.error(`❌ Error en scrapeAndSave: ${error.message}`);
      throw error;
    }
  }

  /**
   * Capturar pantalla de lun.com con múltiples estrategias de conexión
   * @private
   */
  async captureScreenshot() {
    let browser;
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

        // Usar Chrome instalado si está disponible
        if (strategy.executablePath) {
          launchOptions.executablePath = strategy.executablePath;
          logger.debug(`📍 Usando Chrome instalado: ${strategy.executablePath}`);
        }

        browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();

        // Configurar viewport más grande para capturar más contenido
        await page.setViewport({
          width: 1280,
          height: 720
        });

        // Configurar headers más realistas
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Navegar a lun.com con retry
        logger.debug('📄 Navegando a lun.com');
        await page.goto(this.url, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Verificar que la página cargó correctamente
        const title = await page.title();
        if (!title || title.length < 5) {
          throw new Error('Página no cargó correctamente - título vacío');
        }

        logger.debug(`📄 Título de página: ${title}`);

        // Scroll para cargar contenido dinámico
        logger.debug('📜 Realizando scroll para cargar contenido');
        await this.basicScroll(page);

        // Esperar a que se carguen imágenes
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Capturar pantalla
        const screenshotPath = path.join(
          this.screenshotDir,
          `lun-${Date.now()}.jpg`
        );

        logger.debug(`📸 Capturando pantalla: ${screenshotPath}`);
        await page.screenshot({
          path: screenshotPath,
          fullPage: false,
          type: 'jpeg',
          quality: 85
        });

        await browser.close();

        logger.debug(`✅ Pantalla capturada exitosamente: ${screenshotPath}`);
        return screenshotPath;

      } catch (error) {
        logger.warn(`⚠️ Estrategia ${strategies[attempt].name} falló: ${error.message}`);

        if (browser) {
          await browser.close().catch(() => {});
        }

        if (attempt === strategies.length - 1) {
          logger.error(`❌ Todas las estrategias fallaron. Último error: ${error.message}`);
          throw new Error(`No se pudo capturar pantalla después de ${strategies.length} intentos: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Scroll básico para cargar contenido dinámico
   * @private
   */
  async basicScroll(page) {
    try {
      logger.debug('📜 Iniciando scroll básico');

      // Scroll hacia abajo
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Esperar a que cargue contenido
      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.debug('✅ Scroll básico completado');
    } catch (error) {
      logger.warn(`⚠️ Error en scroll básico: ${error.message}`);
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
          fechaExtraccion: new Date().toISOString()
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
        if (file.includes('results') && file.includes(today)) {
          const filePath = path.join(this.screenshotDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return data.noticias;
        }
      }
      
      return null;
    } catch (error) {
      logger.error(`❌ Error obteniendo noticias de hoy: ${error.message}`);
      return null;
    }
  }

  /**
   * Ejecutar scraping manual (para testing)
   */
  async scrapeManual() {
    try {
      logger.info('🔧 Ejecutando scraping manual de LUN.COM');
      return await this.scrapeAndSave();
    } catch (error) {
      logger.error(`❌ Error en scraping manual: ${error.message}`);
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getLunComScraperService() {
  if (!instance) {
    instance = new LunComScraperService();
  }
  return instance;
}

module.exports = {
  LunComScraperService,
  getLunComScraperService
};
