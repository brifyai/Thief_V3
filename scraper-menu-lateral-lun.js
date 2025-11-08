// Scraper para menú lateral de LUN.com con Google Vision API
const path = require('path');
const fs = require('fs');

// Configurar automáticamente Google Vision API
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'master-scope-463121-d4-b1a71fa937ed.json');

const EnhancedOCRService = require('./server/backend/src/services/enhancedOCR.service');

class MenuLateralLunScraper {
  constructor() {
    this.ocrService = new EnhancedOCRService();
    this.outputDir = path.join(__dirname, 'lun-menu-lateral-resultados');
    
    // Crear directorio de salida si no existe
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    console.log('🎬 Scraper Menú Lateral LUN.com inicializado');
    console.log(`📁 Directorio de salida: ${this.outputDir}`);
  }

  async scrapMenuLateral() {
    let browser;
    
    try {
      console.log('🚀 Iniciando scraping del menú lateral de LUN.com...');
      
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
      
      // Navegar a LUN.com
      console.log('🌐 Navegando a https://www.lun.com/');
      await page.goto('https://www.lun.com/', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      // Esperar a que cargue la página completamente
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Buscar el menú lateral izquierdo
      console.log('🔍 Buscando menú lateral izquierdo...');
      
      // Intentar diferentes selectores para el menú lateral
      const menuSelectors = [
        '.menu-lateral a',
        '.sidebar a',
        '.left-menu a',
        '.nav-sidebar a',
        '[class*="menu"] a',
        '[class*="sidebar"] a',
        '[class*="nav"] a',
        'nav a',
        '.navigation a',
        // Selectores más específicos para LUN
        '.lun-menu a',
        '.main-menu a',
        '.category-menu a'
      ];
      
      let menuLinks = [];
      
      for (const selector of menuSelectors) {
        try {
          console.log(`🔎 Probando selector: ${selector}`);
          
          const links = await page.evaluate((sel) => {
            const elements = document.querySelectorAll(sel);
            return Array.from(elements).map(element => ({
              text: element.textContent?.trim(),
              href: element.href,
              className: element.className,
              id: element.id
            })).filter(link => 
              link.text && 
              link.text.length > 3 &&
              link.href &&
              !link.href.includes('javascript:') &&
              !link.href.includes('#') &&
              link.href !== 'javascript:void(0);'
            );
          });
          
          if (links.length > 0) {
            console.log(`✅ Encontrados ${links.length} links con selector: ${selector}`);
            menuLinks = links;
            break;
          }
        } catch (error) {
          console.log(`❌ Selector ${selector} falló: ${error.message}`);
        }
      }
      
      // Si no encontramos con selectores específicos, buscar todos los links azules
      if (menuLinks.length === 0) {
        console.log('🔍 Buscando todos los links azules de la página...');
        
        menuLinks = await page.evaluate(() => {
          const allLinks = document.querySelectorAll('a');
          return Array.from(allLinks).map(element => ({
            text: element.textContent?.trim(),
            href: element.href,
            className: element.className,
            id: element.id,
            color: window.getComputedStyle(element).color,
            backgroundColor: window.getComputedStyle(element).backgroundColor
          })).filter(link => 
            link.text && 
            link.text.length > 3 &&
            link.href &&
            !link.href.includes('javascript:') &&
            !link.href.includes('#') &&
            (link.color.includes('0, 0, 255') || link.color.includes('blue') || link.color.includes('rgb'))
          );
        });
      }
      
      if (menuLinks.length === 0) {
        console.log('❌ No se encontraron links en el menú lateral');
        
        // Debug: Mostrar información de la página
        const pageTitle = await page.title();
        console.log(`📄 Título de la página: ${pageTitle}`);
        
        // Guardar screenshot de la página principal para análisis
        const screenshotPath = path.join(this.outputDir, 'lun-main-page.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot guardado: ${screenshotPath}`);
        
        await browser.close();
        return;
      }
      
      console.log(`📋 Total de links encontrados: ${menuLinks.length}`);
      
      // Mostrar los links encontrados
      console.log('\n📰 Links del menú lateral encontrados:');
      menuLinks.forEach((link, index) => {
        console.log(`   ${index + 1}. ${link.text.substring(0, 50)}${link.text.length > 50 ? '...' : ''} -> ${link.href}`);
      });
      
      // Procesar cada link
      const resultados = [];
      
      for (let i = 0; i < Math.min(menuLinks.length, 10); i++) { // Limitar a 10 para prueba
        const link = menuLinks[i];
        
        console.log(`\n🔄 Procesando link ${i + 1}/${Math.min(menuLinks.length, 10)}: ${link.text}`);
        
        try {
          // Abrir nueva pestaña para el link
          const newPage = await browser.newPage();
          await newPage.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          );
          
          // Navegar al link
          console.log(`🔗 Navegando a: ${link.href}`);
          await newPage.goto(link.href, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });
          
          // Esperar a que cargue
          await newPage.waitForTimeout(3000);
          
          // Capturar screenshot de alta calidad
          const timestamp = Date.now();
          const screenshotPath = path.join(this.outputDir, `lun-menu-${i + 1}-${timestamp}.png`);
          
          await newPage.setViewport({ width: 2560, height: 1440, deviceScaleFactor: 2 });
          await newPage.screenshot({
            path: screenshotPath,
            fullPage: true,
            type: 'png'
          });
          
          console.log(`📸 Screenshot guardado: ${screenshotPath}`);
          
          // Analizar con Google Vision API
          console.log('🧠 Analizando con Google Vision API...');
          
          const textoExtraido = await this.ocrService.extractTextFromImage(screenshotPath);
          const titulosExtraidos = await this.ocrService.extractTitlesFromImage(screenshotPath);
          
          console.log(`✅ OCR completado: ${textoExtraido.length} caracteres, ${titulosExtraidos.length} títulos`);
          
          // Guardar resultados
          const resultado = {
            linkIndex: i + 1,
            linkText: link.text,
            linkUrl: link.href,
            screenshotPath: screenshotPath,
            textoExtraido: textoExtraido,
            titulosExtraidos: titulosExtraidos,
            timestamp: new Date().toISOString()
          };
          
          resultados.push(resultado);
          
          // Mostrar primeros títulos encontrados
          if (titulosExtraidos.length > 0) {
            console.log('📰 Títulos encontrados:');
            titulosExtraidos.slice(0, 3).forEach((titulo, index) => {
              console.log(`   ${index + 1}. ${titulo.substring(0, 80)}...`);
            });
          }
          
          await newPage.close();
          
          // Pequeña pausa entre procesamientos
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`❌ Error procesando link ${link.text}: ${error.message}`);
        }
      }
      
      // Guardar resultados completos
      const resultadosPath = path.join(this.outputDir, `lun-menu-resultados-${Date.now()}.json`);
      fs.writeFileSync(resultadosPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalLinks: menuLinks.length,
        linksProcesados: resultados.length,
        resultados: resultados
      }, null, 2));
      
      console.log(`\n✅ Resultados guardados en: ${resultadosPath}`);
      console.log(`📊 Total de links procesados: ${resultados.length}`);
      console.log('🎉 Scraping completado exitosamente');
      
    } catch (error) {
      console.error('❌ Error en el scraping:', error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

// Ejecutar el scraper
async function main() {
  const scraper = new MenuLateralLunScraper();
  await scraper.scrapMenuLateral();
}

main().catch(console.error);