// Scraper específico para NewsDetail de LUN.com con Google Vision API
const path = require('path');
const fs = require('fs');

// Configurar automáticamente Google Vision API
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'master-scope-463121-d4-b1a71fa937ed.json');

const EnhancedOCRService = require('./server/backend/src/services/enhancedOCR.service');

class NewsDetailLunScraper {
  constructor() {
    this.ocrService = new EnhancedOCRService();
    this.outputDir = path.join(__dirname, 'lun-news-detail-resultados');
    
    // Crear directorio de salida si no existe
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    console.log('🎬 Scraper NewsDetail LUN.com inicializado');
    console.log(`📁 Directorio de salida: ${this.outputDir}`);
  }

  async scrapNewsDetail(url) {
    let browser;
    
    try {
      console.log(`🚀 Iniciando scraping de NewsDetail: ${url}`);
      
      // Iniciar Puppeteer
      const puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: false, // Modo visible para debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        defaultViewport: { width: 1920, height: 1080 }
      });
      
      const page = await browser.newPage();
      
      // Configurar headers realistas
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      // Navegar al NewsDetail
      console.log(`🌐 Navegando a: ${url}`);
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      // Esperar a que cargue completamente
      console.log('⏳ Esperando a que cargue el contenido...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Scroll para asegurar que todo el contenido esté visible
      console.log('📜 Haciendo scroll para cargar todo el contenido...');
      await this.scrollPage(page);
      
      // Capturar screenshot de alta calidad
      const timestamp = Date.now();
      const screenshotPath = path.join(this.outputDir, `lun-news-detail-${timestamp}.png`);
      
      console.log('📸 Capturando screenshot de alta calidad...');
      await page.setViewport({ width: 2560, height: 1440, deviceScaleFactor: 2 });
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png'
      });
      
      console.log(`✅ Screenshot guardado: ${screenshotPath}`);
      
      // Analizar con Google Vision API
      console.log('🧠 Analizando contenido con Google Vision API...');
      
      const textoExtraido = await this.ocrService.extractTextFromImage(screenshotPath);
      const titulosExtraidos = await this.ocrService.extractTitlesFromImage(screenshotPath);
      
      console.log(`✅ OCR completado!`);
      console.log(`📝 Texto extraído: ${textoExtraido.length} caracteres`);
      console.log(`📰 Títulos encontrados: ${titulosExtraidos.length}`);
      
      // Mostrar resultados
      if (titulosExtraidos.length > 0) {
        console.log('\n📰 Títulos detectados:');
        titulosExtraidos.forEach((titulo, index) => {
          console.log(`   ${index + 1}. ${titulo}`);
        });
      }
      
      if (textoExtraido.length > 0) {
        console.log('\n📄 Primeros 500 caracteres del texto:');
        console.log(`   ${textoExtraido.substring(0, 500)}...`);
      }
      
      // Guardar resultados completos
      const resultado = {
        url: url,
        screenshotPath: screenshotPath,
        textoExtraido: textoExtraido,
        titulosExtraidos: titulosExtraidos,
        timestamp: new Date().toISOString(),
        totalCaracteres: textoExtraido.length,
        totalTitulos: titulosExtraidos.length
      };
      
      const resultadosPath = path.join(this.outputDir, `lun-news-detail-result-${timestamp}.json`);
      fs.writeFileSync(resultadosPath, JSON.stringify(resultado, null, 2));
      
      console.log(`\n💾 Resultados guardados en: ${resultadosPath}`);
      console.log('🎉 Scraping completado exitosamente');
      
      return resultado;
      
    } catch (error) {
      console.error('❌ Error en el scraping:', error.message);
      throw error;
    } finally {
      if (browser) {
        console.log('\n💡 El navegador permanecerá abierto por 30 segundos para revisión...');
        setTimeout(async () => {
          await browser.close();
          console.log('🔒 Navegador cerrado');
        }, 30000);
      }
    }
  }

  async scrollPage(page) {
    try {
      let scrollCount = 0;
      let lastHeight = await page.evaluate(() => document.body.scrollHeight);
      
      while (scrollCount < 5) {
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
      console.warn(`⚠️ Error en scroll: ${error.message}`);
    }
  }

  async scrapMultipleNews(urls) {
    console.log(`🚀 Iniciando scraping de ${urls.length} noticias...`);
    
    const resultados = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n📰 Procesando noticia ${i + 1}/${urls.length}`);
      
      try {
        const resultado = await this.scrapNewsDetail(url);
        resultados.push(resultado);
        
        // Pausa entre procesamientos
        if (i < urls.length - 1) {
          console.log('⏳ Esperando 3 segundos antes del siguiente...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`❌ Error procesando ${url}: ${error.message}`);
      }
    }
    
    // Guardar resultados completos
    const timestamp = Date.now();
    const resultadosPath = path.join(this.outputDir, `lun-multiple-news-${timestamp}.json`);
    fs.writeFileSync(resultadosPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalUrls: urls.length,
      totalProcesadas: resultados.length,
      resultados: resultados
    }, null, 2));
    
    console.log(`\n✅ Todos los resultados guardados en: ${resultadosPath}`);
    console.log(`📊 Total procesadas: ${resultados.length}/${urls.length}`);
    
    return resultados;
  }
}

// Ejecutar el scraper con el URL proporcionado
async function main() {
  const scraper = new NewsDetailLunScraper();
  
  // URL proporcionada por el usuario
  const url = 'https://www.lun.com/Pages/NewsDetail.aspx?dt=2025-11-07&NewsID=554609&BodyID=0&PaginaId=26';
  
  try {
    await scraper.scrapNewsDetail(url);
  } catch (error) {
    console.error('❌ Error en la ejecución principal:', error.message);
  }
}

// También permitir procesar múltiples URLs si se proporcionan como argumentos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Procesar URLs específicas
    const scraper = new NewsDetailLunScraper();
    scraper.scrapMultipleNews(args).catch(console.error);
  } else {
    // Procesar la URL por defecto
    main().catch(console.error);
  }
}

module.exports = NewsDetailLunScraper;