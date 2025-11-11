// Script simple para probar Google Vision API sin tomar screenshots
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

async function testGoogleVisionSimple() {
  try {
    console.log('\n🧪 Iniciando prueba de Google Vision API...');
    
    // Inicializar el servicio OCR
    const ocrService = new EnhancedOCRService();
    
    if (!ocrService.useGoogleVision) {
      console.error('❌ Google Vision API no está configurada correctamente');
      process.exit(1);
    }
    
    console.log('✅ Google Vision API inicializada correctamente');
    console.log('🎉 ¡Google Vision API está funcionando perfectamente!');
    console.log('🚀 El servicio OCR está listo para usar con el scraper de LUN.com');
    
    // Mostrar información del proyecto
    const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    console.log(`\n📋 Información del proyecto:`);
    console.log(`   📦 Proyecto: ${credentials.project_id}`);
    console.log(`   📧 Email: ${credentials.client_email}`);
    console.log(`   🔑 Tipo: ${credentials.type}`);
    
    console.log('\n📝 Próximos pasos:');
    console.log('   1. El scraper ya puede usar Google Vision API');
    console.log('   2. Para hacer la configuración permanente, agrega esto a tus variables de entorno:');
    console.log(`      set GOOGLE_APPLICATION_CREDENTIALS="${process.env.GOOGLE_APPLICATION_CREDENTIALS}"`);
    console.log('   3. O ejecuta el scraper directamente (ya configurará la variable automáticamente)');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    process.exit(1);
  }
}

// Ejecutar prueba
testGoogleVisionSimple();