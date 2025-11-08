const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración de Google Vision API...\n');

// 1. Verificar si @google-cloud/vision está instalado
try {
  const vision = require('@google-cloud/vision');
  console.log('✅ @google-cloud/vision está instalado');
} catch (error) {
  console.log('❌ @google-cloud/vision NO está instalado');
  console.log('💡 Ejecuta: npm install @google-cloud/vision');
  process.exit(1);
}

// 2. Verificar variable de entorno
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  console.log('❌ GOOGLE_APPLICATION_CREDENTIALS no está configurada');
  console.log('💡 Configura la variable de entorno con la ruta a tu archivo JSON');
  console.log('\nEjemplos:');
  console.log('  Windows (CMD): set GOOGLE_APPLICATION_CREDENTIALS="C:\\ruta\\archivo.json"');
  console.log('  Windows (PS): $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\ruta\\archivo.json"');
  console.log('  Linux/Mac: export GOOGLE_APPLICATION_CREDENTIALS="/ruta/archivo.json"');
  process.exit(1);
}

console.log(`✅ GOOGLE_APPLICATION_CREDENTIALS: ${credentialsPath}`);

// 3. Verificar que el archivo existe
if (!fs.existsSync(credentialsPath)) {
  console.log(`❌ El archivo de credenciales no existe: ${credentialsPath}`);
  console.log('💡 Verifica que la ruta sea correcta y el archivo exista');
  process.exit(1);
}

console.log('✅ Archivo de credenciales encontrado');

// 4. Verificar contenido del archivo JSON
try {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  
  if (!credentials.type || credentials.type !== 'service_account') {
    console.log('❌ El archivo no es una cuenta de servicio válida');
    process.exit(1);
  }
  
  if (!credentials.project_id) {
    console.log('❌ El archivo no tiene project_id');
    process.exit(1);
  }
  
  if (!credentials.private_key) {
    console.log('❌ El archivo no tiene private_key');
    process.exit(1);
  }
  
  if (!credentials.client_email) {
    console.log('❌ El archivo no tiene client_email');
    process.exit(1);
  }
  
  console.log('✅ Archivo de credenciales válido');
  console.log(`📋 Proyecto: ${credentials.project_id}`);
  console.log(`📧 Email: ${credentials.client_email}`);
  
} catch (error) {
  console.log('❌ Error leyendo el archivo JSON:', error.message);
  process.exit(1);
}

// 5. Intentar inicializar el cliente
try {
  const vision = require('@google-cloud/vision');
  const client = new vision.ImageAnnotatorClient();
  console.log('✅ Cliente de Google Vision inicializado correctamente');
} catch (error) {
  console.log('❌ Error inicializando Google Vision:', error.message);
  console.log('💡 Verifica que las credenciales sean correctas y la API esté activada');
  process.exit(1);
}

console.log('\n🎉 ¡Todo está configurado correctamente!');
console.log('🚀 Ahora puedes ejecutar: node test-google-vision-ocr.js');

// 6. Mostrar comandos útiles
console.log('\n📋 Comandos útiles:');
console.log('  Para probar el OCR: node test-google-vision-ocr.js');
console.log('  Para verificar la variable: echo %GOOGLE_APPLICATION_CREDENTIALS% (Windows)');
console.log('  Para verificar la variable: echo $GOOGLE_APPLICATION_CREDENTIALS (Linux/Mac)');