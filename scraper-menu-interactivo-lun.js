// Scraper interactivo para menú de LUN.com con Google Vision API
const path = require('path');
const fs = require('fs');

// Configurar automáticamente Google Vision API
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'master-scope-463121-d4-b1a71fa937ed.json');

const EnhancedOCRService = require('./server/backend/src/services/enhancedOCR.service');

class MenuInteractivoLunScraper {
  constructor() {
    this.ocrService = new EnhancedOCRService();
    this.outputDir = path.join(__dirname, 'lun-menu-interactivo-resultados');
    
    // Crear directorio de salida si no existe
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    console.log('🎬 Scraper Interactivo LUN.com inicializado');
    console.log(`📁 Directorio de salida: ${this.outputDir}`);
  }

  async scrapMenuInteractivo() {
    let browser;
    
    try {
      console.log('🚀 Iniciando scraping interactivo de LUN.com...');
      
      // Iniciar Puppeteer
      const puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: false, // Modo visible para que veas qué encuentra
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
      
      // Extraer TODOS los links de la página
      console.log('🔍 Extrayendo todos los links de la página...');
      
      const allLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map((element, index) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          
          return {
            index: index,
            text: element.textContent?.trim(),
            href: element.href,
            className: element.className,
            id: element.id,
            color: style.color,
            backgroundColor: style.backgroundColor,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            position: {
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              width: rect.width,
              height: rect.height
            },
            isVisible: rect.width > 0 && rect.height > 0,
            isClickable: element.href && !element.href.includes('javascript:') && element.href !== '#'
          };
        }).filter(link => 
          link.isClickable && 
          link.isVisible &&
          link.text && 
          link.text.length > 2 &&
          link.text.length < 200
        );
      });
      
      console.log(`📋 Total de links encontrados: ${allLinks.length}`);
      
      // Mostrar los links encontrados
      console.log('\n📰 Links encontrados en LUN.com:');
      console.log('=' .repeat(80));
      
      allLinks.forEach((link, index) => {
        const colorIndicator = link.color.includes('blue') || link.color.includes('0, 0, 255') ? '🔵' : '⚪';
        console.log(`${(index + 1).toString().padStart(2)}. ${colorIndicator} ${link.text.substring(0, 60)}${link.text.length > 60 ? '...' : ''}`);
        console.log(`     -> ${link.href}`);
        console.log(`     Color: ${link.color} | Tamaño: ${link.fontSize}`);
        console.log('');
      });
      
      // Guardar screenshot para referencia visual
      const screenshotPath = path.join(this.outputDir, 'lun-page-con-links.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot guardado: ${screenshotPath}`);
      
      // Simular selección automática de links que podrían ser del menú lateral
      console.log('🤖 Analizando links para identificar posibles elementos del menú...');
      
      // Filtrar links que podrían ser del menú (basado en posición y características)
      const potentialMenuLinks = allLinks.filter(link => {
        // Links en el tercio izquierdo de la pantalla
        const isInLeftArea = link.position.x < 600;
        
        // Links con colores comunes de menú
        const hasMenuColor = link.color.includes('blue') || 
                           link.color.includes('0, 0, 255') ||
                           link.color.includes('rgb');
        
        // Links con texto corto (típico de menú)
        const hasMenuLength = link.text.length > 3 && link.text.length < 50;
        
        // Links que no sean del header o footer
        const isInContentArea = link.position.y > 100 && link.position.y < 800;
        
        return isInLeftArea && hasMenuColor && hasMenuLength && isInContentArea;
      });
      
      console.log(`🎯 Links potenciales del menú izquierdo: ${potentialMenuLinks.length}`);
      
      if (potentialMenuLinks.length > 0) {
        console.log('\n📋 Links potenciales del menú:');
        potentialMenuLinks.forEach((link, index) => {
          console.log(`${index + 1}. ${link.text} -> ${link.href}`);
        });
        
        // Procesar los primeros 5 links potenciales
        await this.processLinks(browser, potentialMenuLinks.slice(0, 5));
      } else {
        console.log('❌ No se encontraron links potenciales del menú');
        console.log('🔄 Procesando los primeros 10 links encontrados...');
        await this.processLinks(browser, allLinks.slice(0, 10));
      }
      
    } catch (error) {
      console.error('❌ Error en el scraping:', error.message);
    } finally {
      if (browser) {
        // No cerrar el navegador inmediatamente para que puedas ver los resultados
        console.log('\n💡 El navegador permanecerá abierto para que puedas revisar los resultados...');
        console.log('   Ciérralo manualmente cuando termines');
        
        // Esperar 30 segundos antes de cerrar automáticamente
        setTimeout(async () => {
          await browser.close();
          console.log('🔒 Navegador cerrado automáticamente');
        }, 30000);
      }
    }
  }

  async processLinks(browser, links) {
    const resultados = [];
    
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      
      console.log(`\\n🔄 Procesando link ${i + 1}/${links.length}: ${link.text}`);
      
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
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Capturar screenshot de alta calidad
        const timestamp = Date.now();
        const screenshotPath = path.join(this.outputDir, `lun-link-${i + 1}-${timestamp}.png`);
        
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
    const resultadosPath = path.join(this.outputDir, `lun-resultados-${Date.now()}.json`);
    fs.writeFileSync(resultadosPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalLinks: links.length,
      linksProcesados: resultados.length,
      resultados: resultados
    }, null, 2));
    
    console.log(`\n✅ Resultados guardados en: ${resultadosPath}`);
    console.log(`📊 Total de links procesados: ${resultados.length}`);
    console.log('🎉 Scraping completado exitosamente');
  }
}

// Ejecutar el scraper
async function main() {
  const scraper = new MenuInteractivoLunScraper();
  await scraper.scrapMenuInteractivo();
}

main().catch(console.error);