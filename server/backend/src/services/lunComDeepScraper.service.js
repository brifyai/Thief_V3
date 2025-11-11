const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { loggers } = require('../utils/logger');
const EnhancedOCRService = require('./enhancedOCR.service');

const logger = loggers.scraping;

// Configurar automáticamente Google Vision API para esta ejecución
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../../../master-scope-463121-d4-b1a71fa937ed.json');

/**
 * Servicio Deep Scraper para LUN.com - VERSIÓN 4.0
 * Navega a cada noticia individual para capturar contenido en alta calidad
 * Estrategia: Extraer enlaces → Navegar individualmente → Capturar texto grande
 */
class LunComDeepScraperService {
  constructor() {
    this.url = 'https://www.lun.com';
    this.ocrService = new EnhancedOCRService();
    this.screenshotDir = path.join(__dirname, '../../temp/lun-screenshots-deep');
    this.lastScrapedTime = null;
    this.isScheduled = false;
    this.maxNewsToProcess = 20; // Límite para no sobrecargar
    
    // Crear directorio de screenshots si no existe
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
    
    logger.info('🎬 LUN.COM Deep Scraper Service V4 inicializado (Navegación Individual)');
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
    logger.info('📅 Iniciando scheduler de LUN.COM Deep (00:01 - 06:00 AM)');
    
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
      logger.info('⏹️ Scheduler de LUN.COM Deep detenido');
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
    
    logger.info(`🚀 Ejecutando scraping profundo de LUN.COM a las ${hours}:${String(minutes).padStart(2, '0')}`);
    this.scrapeAndSave().catch(error => {
      logger.error(`❌ Error en scraping automático: ${error.message}`);
    });
  }

  /**
   * Ejecutar scraping completo y guardar resultados
   */
  async scrapeAndSave() {
    try {
      logger.info('🔍 Iniciando scraping profundo de LUN.COM V4');
      
      // Paso 1: Extraer enlaces de noticias de la página principal
      const newsLinks = await this.extractNewsLinks();
      logger.info(`📋 Encontrados ${newsLinks.length} enlaces de noticias`);
      
      // Paso 2: Limitar cantidad para no sobrecargar
      const linksToProcess = newsLinks.slice(0, this.maxNewsToProcess);
      logger.info(`🎯 Procesando ${linksToProcess.length} noticias (límite: ${this.maxNewsToProcess})`);
      
      // Paso 3: Navegar a cada noticia y extraer contenido
      const noticias = [];
      for (let i = 0; i < linksToProcess.length; i++) {
        const link = linksToProcess[i];
        logger.info(`📰 Procesando noticia ${i + 1}/${linksToProcess.length}: ${link.title}`);
        
        try {
          const noticia = await this.extractFromIndividualNews(link);
          if (noticia) {
            noticias.push(noticia);
            logger.info(`✅ Noticia extraída: ${noticia.titulo.substring(0, 50)}...`);
          }
        } catch (error) {
          logger.warn(`⚠️ Error procesando noticia ${link.url}: ${error.message}`);
        }
        
        // Pequeña pausa entre noticias para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Guardar resultados
      const today = new Date().toISOString().split('T')[0];
      const resultsPath = path.join(this.screenshotDir, `lun-results-deep-${today}.json`);
      fs.writeFileSync(resultsPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        version: '4.0-deep',
        totalEnlaces: newsLinks.length,
        totalProcesadas: linksToProcess.length,
        totalExtraidas: noticias.length,
        noticias
      }, null, 2));
      
      logger.info(`✅ Scraping profundo completado: ${noticias.length}/${newsLinks.length} noticias extraídas`);
      this.lastScrapedTime = new Date();
      
      return noticias;
    } catch (error) {
      logger.error(`❌ Error en scrapeAndSave profundo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extraer enlaces de noticias de la página principal
   * @private
   */
  async extractNewsLinks() {
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
        logger.debug(`🌐 Intento enlaces ${attempt + 1}/${strategies.length} - Estrategia: ${strategy.name}`);

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

        // Navegar directamente al frame de contenido de LUN
        const contentUrl = 'https://www.lun.com/pages/LUNHomepage.aspx?xp=07-11-2025 0:00:00&BodyID=0';
        logger.debug(`🔗 Navegando directamente al contenido: ${contentUrl}`);
        
        await page.goto(contentUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Esperar más tiempo para que cargue el contenido del frame
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Scroll para cargar más contenido
        await this.scrollPage(page);

        // Debug: Capturar HTML para análisis
        const pageHtml = await page.content();
        const htmlPath = path.join(this.screenshotDir, `lun-debug-${Date.now()}.html`);
        fs.writeFileSync(htmlPath, pageHtml);
        logger.debug(`📄 HTML guardado para análisis: ${htmlPath}`);

        // Debug: Contar todos los enlaces en la página
        const allLinksCount = await page.evaluate(() => {
          return document.querySelectorAll('a').length;
        });
        logger.debug(`🔗 Total de enlaces encontrados: ${allLinksCount}`);

        // Debug: Extraer muestra de enlaces
        const sampleLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a')).slice(0, 10);
          return links.map(link => ({
            text: link.textContent?.trim().substring(0, 50),
            href: link.href,
            className: link.className
          }));
        });
        logger.debug('📋 Muestra de enlaces encontrados:', sampleLinks);

        // Extraer enlaces usando múltiples selectores mejorados
        const links = await page.evaluate(() => {
          const selectors = [
            // Selectores más específicos para LUN
            'a[href*="/noticias/"]',
            'a[href*="/article/"]',
            'a[href*="/news/"]',
            'article a[href]',
            '.news-item a',
            '.article-item a',
            '.story a',
            '.post a',
            // Selectores generales como fallback
            'article a',
            'h1 a',
            'h2 a',
            'h3 a',
            'h4 a',
            '.headline a',
            '.title a',
            '.news-title a',
            '.article-title a',
            '[data-testid="headline"] a',
            '[data-testid*="headline"] a',
            '[data-testid*="title"] a',
            // Selectores por clases comunes
            '.card a',
            '.item a',
            '.link a',
            'a[class*="title"]',
            'a[class*="headline"]',
            'a[class*="news"]'
          ];
          
          const foundLinks = [];
          const seenUrls = new Set();
          
          // Intentar cada selector
          for (const selector of selectors) {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(element => {
                const title = element.textContent?.trim();
                const href = element.href;
                
                if (title && href &&
                    title.length > 5 &&
                    title.length < 300 &&
                    !title.toLowerCase().includes('publicidad') &&
                    !title.toLowerCase().includes('suscríbete') &&
                    !title.toLowerCase().includes('newsletter') &&
                    !title.toLowerCase().includes('comentarios') &&
                    !title.toLowerCase().includes('leer más') &&
                    !title.toLowerCase().includes('ver el catálogo') &&
                    (href.includes('lun.com') || href.startsWith('/') || href.includes('pages/'))) {
                  
                  // Construir URL completa si es relativa
                  let fullUrl = href;
                  if (!href.startsWith('http')) {
                    fullUrl = href.startsWith('/') ? 'https://www.lun.com' + href : 'https://www.lun.com/' + href;
                  }
                  
                  // Evitar duplicados y URLs no válidas
                  if (!seenUrls.has(fullUrl) &&
                      !fullUrl.includes('#') &&
                      !fullUrl.includes('javascript:void(0)') &&
                      !fullUrl.includes('javascript:sendAnalytics') &&
                      !fullUrl.includes('javascript:AbrirPopup') &&
                      !fullUrl.includes('javascript:Wopen') &&
                      !fullUrl.includes('mailto:') &&
                      !fullUrl.includes('tel:') &&
                      !fullUrl.includes('che374')) { // Excluir banners específicos
                    seenUrls.add(fullUrl);
                    foundLinks.push({
                      title: title,
                      url: fullUrl,
                      selector: selector // Para debugging
                    });
                  }
                }
              });
            } catch (error) {
              // Ignorar errores de selectores inválidos
            }
          }
          
          // Si no encontramos nada, intentar con todos los enlaces y filtrar
          if (foundLinks.length === 0) {
            const allLinks = document.querySelectorAll('a[href]');
            allLinks.forEach(element => {
              const title = element.textContent?.trim();
              const href = element.href;
              
              if (title && href &&
                  title.length > 15 &&
                  title.length < 200 &&
                  (href.includes('lun.com') || href.startsWith('/')) &&
                  !title.toLowerCase().includes('publicidad') &&
                  !title.toLowerCase().includes('suscríbete') &&
                  !href.includes('#') &&
                  !href.includes('javascript:')) {
                
                let fullUrl = href;
                if (!href.startsWith('http')) {
                  fullUrl = href.startsWith('/') ? 'https://www.lun.com' + href : 'https://www.lun.com/' + href;
                }
                
                if (!seenUrls.has(fullUrl)) {
                  seenUrls.add(fullUrl);
                  foundLinks.push({
                    title: title,
                    url: fullUrl,
                    selector: 'fallback-all'
                  });
                }
              }
            });
          }
          
          return foundLinks;
        });

        await browser.close();
        
        logger.debug(`✅ ${links.length} enlaces extraídos`);
        return links;

      } catch (error) {
        logger.warn(`⚠️ Estrategia enlaces ${strategies[attempt].name} falló: ${error.message}`);
        if (browser) await browser.close().catch(() => {});
        
        if (attempt === strategies.length - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Extraer contenido de una noticia individual
   * @private
   */
  async extractFromIndividualNews(link) {
    let browser;
    
    try {
      const launchOptions = {
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        timeout: 45000
      };

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();

      // Configurar para máxima calidad
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      await page.setViewport({
        width: 2560, // 4K width
        height: 1440, // 2K height  
        deviceScaleFactor: 2 // High DPI
      });

      // Navegar a la noticia individual
      logger.debug(`🔗 Navegando a: ${link.url}`);
      await page.goto(link.url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Esperar a que cargue completamente
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Scroll para asegurar que todo el contenido esté visible
      await this.scrollPage(page);

      // Capturar screenshot de alta calidad de la noticia individual
      const screenshotPath = path.join(
        this.screenshotDir,
        `lun-deep-${Date.now()}.png`
      );
      
      await page.screenshot({
        path: screenshotPath,
        fullPage: true, // Capturar página completa
        type: 'png', // PNG sin compresión
        omitBackground: false
      });

      // Extraer texto usando OCR mejorado
      const extractedText = await this.ocrService.extractTextFromImage(screenshotPath);
      
      // Procesar texto para obtener título y contenido limpio
      const processedContent = this.processNewsContent(extractedText, link);

      await browser.close();

      // Limpiar archivo temporal
      if (fs.existsSync(screenshotPath)) {
        fs.unlinkSync(screenshotPath);
      }

      return processedContent;

    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      throw error;
    }
  }

  /**
   * Procesar contenido extraído de una noticia
   * @private
   */
  processNewsContent(texto, originalLink) {
    if (!texto) return null;
    
    const lineas = texto.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Buscar el título (generalmente la primera línea larga y significativa)
    let titulo = originalLink.title;
    let contenido = '';
    
    // Si el título original no parece válido, intentar extraer del texto
    if (titulo.length < 15 || titulo.length > 200) {
      for (const linea of lineas) {
        if (linea.length > 20 && linea.length < 150 && 
            !linea.includes('www.lun.com') &&
            !linea.includes('Las Últimas Noticias')) {
          titulo = linea;
          break;
        }
      }
    }
    
    // Extraer contenido (todo el texto excepto el título y elementos basura)
    const contenidoLineas = lineas.filter(linea => 
      linea !== titulo &&
      !linea.includes('www.lun.com') &&
      !linea.includes('Las Últimas Noticias') &&
      !linea.includes('publicidad') &&
      !linea.includes('suscríbete') &&
      linea.length > 10
    );
    
    contenido = contenidoLineas.join(' ').substring(0, 1000); // Limitar a 1000 caracteres
    
    if (!titulo || titulo.length < 15) {
      return null;
    }
    
    return {
      titulo: titulo,
      descripcion: contenido,
      fuente: 'lun.com',
      url: originalLink.url,
      fechaExtraccion: new Date().toISOString(),
      version: '4.0-deep',
      method: 'individual-navigation'
    };
  }

  /**
   * Scroll para cargar contenido dinámico
   * @private
   */
  async scrollPage(page) {
    try {
      let scrollCount = 0;
      let lastHeight = await page.evaluate(() => document.body.scrollHeight);
      
      while (scrollCount < 5) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const newHeight = await page.evaluate(() => document.body.scrollHeight);
        
        if (newHeight === lastHeight) break;
        
        lastHeight = newHeight;
        scrollCount++;
      }
      
      // Volver al inicio
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      logger.warn(`⚠️ Error en scroll: ${error.message}`);
    }
  }

  /**
   * Ejecutar scraping manual (para testing)
   */
  async scrapeManual() {
    try {
      logger.info('🔧 Ejecutando scraping manual profundo de LUN.COM');
      return await this.scrapeAndSave();
    } catch (error) {
      logger.error(`❌ Error en scraping manual profundo: ${error.message}`);
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getLunComDeepScraperService() {
  if (!instance) {
    instance = new LunComDeepScraperService();
  }
  return instance;
}

module.exports = {
  LunComDeepScraperService,
  getLunComDeepScraperService
};