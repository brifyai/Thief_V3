/**
 * Test para validar que el registro de usuarios funciona correctamente
 * con el servicio de autenticación mejorado
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testUserRegistration() {
  console.log('🧪 Iniciando test de registro de usuarios...\n');

  const testUsers = [
    {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Test User 1'
    },
    {
      email: `test-${Date.now() + 1}@example.com`,
      password: 'TestPassword456!',
      name: 'Test User 2'
    }
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const user of testUsers) {
    try {
      console.log(`📝 Registrando usuario: ${user.email}`);
      
      const response = await axios.post(`${API_URL}/auth/register`, {
        email: user.email,
        password: user.password,
        name: user.name
      }, {
        timeout: 10000
      });

      if (response.status === 201 && response.data.token) {
        console.log(`✅ Usuario registrado exitosamente`);
        console.log(`   ID: ${response.data.user.id}`);
        console.log(`   Email: ${response.data.user.email}`);
        console.log(`   Nombre: ${response.data.user.name}`);
        console.log(`   Rol: ${response.data.user.role}\n`);
        successCount++;
      } else {
        console.log(`❌ Respuesta inesperada: ${response.status}`);
        console.log(`   ${JSON.stringify(response.data)}\n`);
        failureCount++;
      }
    } catch (error) {
      console.log(`❌ Error registrando usuario:`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Respuesta completa:`, JSON.stringify(error.response.data, null, 2));
        console.log(`   Headers:`, JSON.stringify(error.response.headers, null, 2));
      } else if (error.request) {
        console.log(`   No response received:`, error.message);
      } else {
        console.log(`   Error:`, error.message);
      }
      console.log();
      failureCount++;
    }
  }

  // Resumen
  console.log('\n📊 Resumen del test:');
  console.log(`   ✅ Exitosos: ${successCount}`);
  console.log(`   ❌ Fallidos: ${failureCount}`);
  console.log(`   Total: ${testUsers.length}`);

  if (successCount === testUsers.length) {
    console.log('\n✅ ¡ÉXITO! Todos los usuarios se registraron correctamente');
    process.exit(0);
  } else {
    console.log('\n❌ FALLO: Algunos usuarios no se registraron correctamente');
    process.exit(1);
  }
}

// Esperar a que el servidor esté listo
setTimeout(() => {
  testUserRegistration().catch(error => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  });
}, 2000);
