const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testUserRegistration() {
  try {
    console.log('🧪 Iniciando prueba de registro de usuarios...\n');

    // Test 1: Intentar registrar un nuevo usuario
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Test User';

    console.log(`📝 Intentando registrar usuario:`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   Name: ${testName}\n`);

    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
      name: testName
    });

    console.log('✅ Registro exitoso:');
    console.log(JSON.stringify(registerResponse.data, null, 2));

    const token = registerResponse.data.token;
    const userId = registerResponse.data.user.id;

    // Test 2: Verificar que el usuario se guardó en Supabase
    console.log('\n🔍 Verificando si el usuario se guardó en Supabase...\n');

    const meResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Usuario encontrado en Supabase:');
    console.log(JSON.stringify(meResponse.data, null, 2));

    // Test 3: Intentar login con el nuevo usuario
    console.log('\n🔐 Intentando login con el nuevo usuario...\n');

    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });

    console.log('✅ Login exitoso:');
    console.log(JSON.stringify(loginResponse.data, null, 2));

    console.log('\n✅ TODOS LOS TESTS PASARON - Los usuarios se están guardando correctamente en Supabase');

  } catch (error) {
    console.error('❌ Error durante la prueba:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

testUserRegistration();
