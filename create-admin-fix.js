// Script para crear/asignar usuario admin
// Ejecutar con: node create-admin-fix.js

const axios = require('axios');

async function createAdminUser() {
  try {
    console.log('🚀 Creando/actualizando usuario administrador...');
    
    // Primero intentar login con credenciales de admin
    const loginResponse = await axios.post('http://localhost:3005/api/auth/login', {
      email: 'admin@demo.com',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Usuario admin logueado exitosamente');
      console.log('👤 Rol actual:', loginResponse.data.user.role);
      
      // Si el rol no es admin, actualizarlo
      if (loginResponse.data.user.role !== 'admin') {
        console.log('🔄 Actualizando rol a admin...');
        
        // Actualizar el rol en la base de datos via Supabase
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          'https://xjqfhpnfmnubqtvsbvos.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqcWZocG5mbW51YnF0dnNidm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0NDg1NzQsImV4cCI6MjA0OTAyNDU3NH0.Ia7RvbJ6q3bNq9dC4TMfwDBZCfIQbFgKVJBYTdSdyLw'
        );
        
        const { data, error } = await supabase
          .from('users')
          .update({ role: 'admin' })
          .eq('email', 'admin@demo.com')
          .select();
          
        if (error) {
          console.error('❌ Error actualizando rol:', error);
        } else {
          console.log('✅ Rol actualizado a admin exitosamente');
        }
      } else {
        console.log('✅ El usuario ya tiene rol de admin');
      }
      
      return {
        success: true,
        message: 'Usuario admin configurado correctamente',
        user: loginResponse.data.user
      };
    }
    
  } catch (error) {
    // Si el usuario admin no existe, crearlo
    if (error.response?.status === 401) {
      console.log('📝 Usuario admin no encontrado, creando uno nuevo...');
      
      // Registrar nuevo usuario admin
      try {
        const registerResponse = await axios.post('http://localhost:3005/api/auth/register', {
          email: 'admin@demo.com',
          password: 'admin123',
          name: 'Administrador'
        });
        
        console.log('✅ Usuario admin creado exitosamente');
        return {
          success: true,
          message: 'Nuevo usuario admin creado',
          user: registerResponse.data.user
        };
      } catch (registerError) {
        console.error('❌ Error creando usuario admin:', registerError.response?.data || registerError.message);
      }
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
    return {
      success: false,
      message: 'No se pudo configurar usuario admin',
      error: error.response?.data || error.message
    };
  }
}

createAdminUser().then(result => {
  console.log('\n🎉 RESULTADO FINAL:', result);
  if (result.success) {
    console.log('\n🔑 CREDENCIALES DE ADMIN:');
    console.log('   Email: admin@demo.com');
    console.log('   Password: admin123');
    console.log('\n📋 INSTRUCCIONES:');
    console.log('   1. Cierra sesión del usuario actual');
    console.log('   2. Inicia sesión con las credenciales de admin');
    console.log('   3. Accede al panel AI Tokens sin problemas');
  }
}).catch(console.error);