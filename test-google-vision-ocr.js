const EnhancedOCRService = require('./server/backend/src/services/enhancedOCR.service');
const fs = require('fs');
const path = require('path');

async function testGoogleVisionOCR() {
  console.log('🧪 Probando Google Vision OCR Service...\n');
  
  try {
    // Inicializar el servicio OCR
    const ocrService = new EnhancedOCRService();
    
    // Verificar si Google Vision está disponible
    if (!ocrService.useGoogleVision) {
      console.error('❌ Google Vision API no está configurada');
      console.log('Por favor, configure GOOGLE_APPLICATION_CREDENTIALS en las variables de entorno');
      return;
    }
    
    console.log('✅ Google Vision API está configurada\n');
    
    // Buscar imágenes de prueba en el directorio actual
    const testImages = fs.readdirSync('.').filter(file => 
      file.match(/\.(png|jpg|jpeg)$/i)
    );
    
    if (testImages.length === 0) {
      console.log('📸 No se encontraron imágenes de prueba. Tomando un screenshot de prueba...');
      
      // Tomar screenshot de LUN.com como prueba
      const puppeteer = require('puppeteer-extra');
      const StealthPlugin = require('puppeteer-extra-plugin-stealth');
      
      puppeteer.use(StealthPlugin);
      
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Configurar viewport de alta resolución
      await page.setViewport({
        width: 2560,
        height: 1440,
        deviceScaleFactor: 2
      });
      
      console.log('🌐 Navegando a LUN.com...');
      await page.goto('https://www.lun.com', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      // Esperar a que cargue el contenido
      await page.waitForTimeout(5000);
      
      // Tomar screenshot
      const screenshotPath = 'lun-test-screenshot.png';
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png'
      });
      
      await browser.close();
      
      console.log(`📸 Screenshot guardado: ${screenshotPath}\n`);
      testImages.push(screenshotPath);
    }
    
    // Probar OCR con cada imagen
    for (const image of testImages) {
      console.log(`📸 Procesando imagen: ${image}`);
      
      try {
        // Extraer texto completo
        const texto = await ocrService.extractTextFromImage(image);
        console.log(`✅ Texto extraído: ${texto.length} caracteres`);
        console.log(`📝 Primeros 200 caracteres: ${texto.substring(0, 200)}...\n`);
        
        // Extraer títulos
        const titulos = await ocrService.extractTitlesFromImage(image);
        console.log(`📰 Títulos encontrados: ${titulos.length}`);
        
        if (titulos.length > 0) {
          titulos.forEach((titulo, index) => {
            console.log(`   ${index + 1}. ${titulo.substring(0, 100)}${titulo.length > 100 ? '...' : ''}`);
          });
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
        
      } catch (error) {
        console.error(`❌ Error procesando ${image}: ${error.message}\n`);
      }
    }
    
    console.log('🎉 Prueba completada');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

// Ejecutar prueba
testGoogleVisionOCR();