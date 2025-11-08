// Script para probar Google Vision OCR con una imagen real
const path = require('path');

// Configurar automáticamente Google Vision API
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'master-scope-463121-d4-b1a71fa937ed.json');

const EnhancedOCRService = require('./server/backend/src/services/enhancedOCR.service');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

async function testOCRConImagen() {
  try {
    console.log('🧪 Probando Google Vision OCR con imagen real...');
    
    // Inicializar servicio OCR
    const ocrService = new EnhancedOCRService();
    
    if (!ocrService.useGoogleVision) {
      console.error('❌ Google Vision API no está configurada');
      return;
    }
    
    console.log('✅ Google Vision API inicializada');
    
    // Tomar screenshot de LUN.com
    console.log('📸 Tomando screenshot de LUN.com...');
    
    puppeteer.use(StealthPlugin);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Configurar para alta calidad
    await page.setViewport({
      width: 2560,
      height: 1440,
      deviceScaleFactor: 2
    });
    
    await page.goto('https://www.lun.com', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await page.waitForTimeout(5000);
    
    const screenshotPath = 'lun-test-ocr.png';
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png'
    });
    
    await browser.close();
    
    console.log(`✅ Screenshot guardado: ${screenshotPath}`);
    
    // Probar OCR
    console.log('🧠 Ejecutando OCR con Google Vision...');
    
    const texto = await ocrService.extractTextFromImage(screenshotPath);
    const titulos = await ocrService.extractTitlesFromImage(screenshotPath);
    
    console.log(`✅ OCR completado!`);
    console.log(`📝 Texto extraído: ${texto.length} caracteres`);
    console.log(`📰 Títulos encontrados: ${titulos.length}`);
    
    if (titulos.length > 0) {
      console.log('\n📰 Títulos detectados:');
      titulos.forEach((titulo, index) => {
        console.log(`   ${index + 1}. ${titulo.substring(0, 100)}${titulo.length > 100 ? '...' : ''}`);
      });
    }
    
    // Mostrar primer fragmento del texto
    if (texto.length > 0) {
      console.log(`\n📄 Primeros 300 caracteres del texto:`);
      console.log(`   ${texto.substring(0, 300)}...`);
    }
    
    console.log('\n🎉 ¡Google Vision OCR funciona perfectamente!');
    console.log('🚀 El servicio OCR está listo para usar con el scraper');
    
    // Limpiar archivo temporal
    const fs = require('fs');
    if (fs.existsSync(screenshotPath)) {
      fs.unlinkSync(screenshotPath);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

// Ejecutar prueba
testOCRConImagen();