// Script para configurar y probar Google Vision API en una sola ejecución
const path = require('path');
const fs = require('fs');

// Configurar la variable de entorno para esta ejecución
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'master-scope-463121-d4-b1a71fa937ed.json');

console.log('🔧 Configurando Google Vision API...');
console.log(`📁 Credenciales: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

// Verificar que el archivo existe
if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.error('❌ Archivo de credenciales no encontrado');
  process.exit(1);
}

console.log('✅ Archivo de credenciales encontrado');

// Importar y probar el servicio OCR
const EnhancedOCRService = require('./server/backend/src/services/enhancedOCR.service');

async function testGoogleVision() {
  try {
    console.log('\n🧪 Iniciando prueba de Google Vision API...');
    
    // Inicializar el servicio OCR
    const ocrService = new EnhancedOCRService();
    
    if (!ocrService.useGoogleVision) {
      console.error('❌ Google Vision API no está configurada correctamente');
      process.exit(1);
    }
    
    console.log('✅ Google Vision API inicializada correctamente');
    
    // Tomar screenshot de prueba
    console.log('\n📸 Tomando screenshot de LUN.com para prueba...');
    
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
    
    await page.goto('https://www.lun.com', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    await page.waitForTimeout(5000);
    
    const screenshotPath = 'lun-test-screenshot.png';
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png'
    });
    
    await browser.close();
    
    console.log(`✅ Screenshot guardado: ${screenshotPath}`);
    
    // Probar OCR
    console.log('\n🧠 Probando OCR con Google Vision...');
    
    const texto = await ocrService.extractTextFromImage(screenshotPath);
    const titulos = await ocrService.extractTitlesFromImage(screenshotPath);
    
    console.log(`✅ OCR exitoso!`);
    console.log(`📝 Texto extraído: ${texto.length} caracteres`);
    console.log(`📰 Títulos encontrados: ${titulos.length}`);
    
    if (titulos.length > 0) {
      console.log('\n📰 Títulos detectados:');
      titulos.forEach((titulo, index) => {
        console.log(`   ${index + 1}. ${titulo.substring(0, 100)}${titulo.length > 100 ? '...' : ''}`);
      });
    }
    
    console.log('\n🎉 ¡Google Vision API está funcionando perfectamente!');
    console.log('🚀 El servicio OCR está listo para usar con el scraper de LUN.com');
    
    // Limpiar archivo temporal
    fs.unlink(screenshotPath, () => {});
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    process.exit(1);
  }
}

// Ejecutar prueba
testGoogleVision();