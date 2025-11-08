const { supabase } = require('./server/backend/src/config/database');

async function checkAuthStatus() {
  try {
    console.log('🔍 Verificando estado de autenticación...');
    
    // 1. Verificar si hay usuarios admin
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .eq('is_active', true);
    
    if (adminError) {
      console.error('❌ Error buscando usuarios admin:', adminError);
      return;
    }
    
    console.log(`📊 Usuarios admin encontrados: ${adminUsers.length}`);
    
    if (adminUsers.length > 0) {
      adminUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.name}) - ID: ${user.id}`);
      });
    } else {
      console.log('⚠️ No hay usuarios admin. Creando uno...');
      
      // Crear usuario admin demo
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@example.com',
          name: 'Demo Admin',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creando usuario admin:', createError);
      } else {
        console.log('✅ Usuario admin creado:', newUser);
      }
    }
    
    // 2. Verificar variables de entorno
    console.log('\n🔧 Variables de entorno:');
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`   JWT_EXPIRATION: ${process.env.JWT_EXPIRATION || 'No configurado'}`);
    console.log(`   DEMO_MODE: ${process.env.DEMO_MODE || 'No configurado'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'No configurado'}`);
    
    // 3. Probar generación de token
    const { generateToken } = require('./server/backend/src/utils/jwtHelper');
    const testUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@example.com',
      name: 'Demo Admin',
      role: 'admin'
    };
    
    const testToken = generateToken(testUser);
    console.log(`\n🔑 Token de prueba generado: ${testToken.substring(0, 50)}...`);
    
    // 4. Probar verificación de token
    const { verifyToken } = require('./server/backend/src/utils/jwtHelper');
    const decoded = verifyToken(testToken);
    console.log(`✅ Verificación de token: ${decoded ? 'Exitosa' : 'Fallida'}`);
    
    if (decoded) {
      console.log(`   Usuario decodificado: ${decoded.email} (${decoded.role})`);
    }
    
    console.log('\n🎯 Para probar la autenticación en el navegador:');
    console.log('1. Abre el desarrollador del navegador (F12)');
    console.log('2. En la consola, ejecuta:');
    console.log(`   localStorage.setItem('token', '${testToken}')`);
    console.log('3. Recarga la página');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkAuthStatus();