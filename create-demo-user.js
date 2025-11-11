require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://demo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseKey || supabaseKey.includes('demo')) {
  console.log('🎭 Modo demo detectado. Creando usuario de demo localmente...');
  
  // En modo demo, simplemente mostramos las credenciales sugeridas
  console.log('\n📋 Credenciales sugeridas para modo demo:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email: demo@scraper.com');
  console.log('🔑 Password: demo123');
  console.log('👤 Nombre: Usuario Demo');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 Usa estas credenciales para registrarte en la aplicación.');
  console.log('   Ve a http://localhost:3005 y haz clic en "Registrarse"');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createDemoUser() {
  try {
    console.log('🔧 Creando usuario de demo...');

    // Datos del usuario demo
    const userData = {
      email: 'demo@scraper.com',
      password: 'demo123',
      name: 'Usuario Demo',
      role: 'admin'
    };

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      console.log('⚠️ El usuario demo ya existe:');
      console.log(`   Email: ${userData.email}`);
      console.log('\n🔐 Credenciales de acceso:');
      console.log(`   Email: ${userData.email}`);
      console.log(`   Password: ${userData.password}`);
      return;
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Crear usuario
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('\n✅ Usuario demo creado exitosamente:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Nombre: ${newUser.name}`);
    console.log(`   Role: ${newUser.role}`);
    console.log('\n🔐 Credenciales de acceso:');
    console.log(`   Email: ${userData.email}`);
    console.log(`   Password: ${userData.password}`);

  } catch (error) {
    console.error('❌ Error al crear usuario demo:', error);
  }
}

// Ejecutar
createDemoUser();