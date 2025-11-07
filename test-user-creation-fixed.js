#!/usr/bin/env node

/**
 * Test de creación de usuarios - Versión corregida
 * Verifica que los usuarios se crean en auth.users y en la tabla users
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testUserCreation() {
  console.log('🧪 Iniciando test de creación de usuarios...\n');

  const testUsers = [
    {
      email: `test-user-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Test User 1'
    },
    {
      email: `admin-test-${Date.now()}@example.com`,
      password: 'AdminPassword123!',
      name: 'Admin Test User'
    }
  ];

  for (const user of testUsers) {
    try {
      console.log(`📝 Registrando usuario: ${user.email}`);
      
      const response = await axios.post(`${API_URL}/auth/register`, {
        email: user.email,
        password: user.password,
        name: user.name
      });

      if (response.data.success) {
        console.log('✅ Usuario registrado exitosamente');
        console.log(`   ID: ${response.data.user.id}`);
        console.log(`   Email: ${response.data.user.email}`);
        console.log(`   Nombre: ${response.data.user.name}`);
        console.log(`   Rol: ${response.data.user.role}`);
        console.log(`   Token: ${response.data.token.substring(0, 20)}...\n`);
      } else {
        console.error('❌ Error al registrar usuario:', response.data.error);
      }
    } catch (error) {
      console.error('❌ Error en la solicitud:', error.response?.data || error.message);
    }
  }

  // Esperar un poco y luego obtener la lista de usuarios
  console.log('⏳ Esperando 2 segundos antes de obtener la lista de usuarios...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    console.log('📋 Obteniendo lista de usuarios...');
    const response = await axios.get(`${API_URL}/users`);

    if (response.data.success) {
      console.log(`✅ Se obtuvieron ${response.data.data.length} usuarios:\n`);
      response.data.data.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Nombre: ${user.name}`);
        console.log(`   Rol: ${user.role}`);
        console.log(`   Creado: ${user.created_at}\n`);
      });
    } else {
      console.error('❌ Error al obtener usuarios:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error en la solicitud:', error.response?.data || error.message);
  }
}

testUserCreation().catch(console.error);
