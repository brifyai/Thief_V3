/**
 * Test directo del servicio de autenticación sin HTTP
 */

// Cargar variables de entorno
require('dotenv').config();

const authService = require('./server/backend/src/services/auth.service');

async function testRegisterDirect() {
  console.log('🧪 Test directo del servicio de autenticación\n');

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';

  try {
    console.log(`📝 Intentando registrar: ${testEmail}`);
    const result = await authService.register(testEmail, testPassword, testName);
    console.log('✅ Registro exitoso:', result);
  } catch (error) {
    console.log('❌ Error en registro:');
    console.log('   message:', error?.message);
    console.log('   code:', error?.code);
    console.log('   details:', error?.details);
    console.log('   hint:', error?.hint);
    console.log('   stack:', error?.stack);
    console.log('\n📋 Error completo:', JSON.stringify(error, null, 2));
  }
}

testRegisterDirect().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
