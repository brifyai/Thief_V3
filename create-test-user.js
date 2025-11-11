require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  try {
    console.log('🔧 Creando usuario de prueba con Supabase Auth...');

    // Crear usuario con Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'Test123456!',
      email_confirm: true,
      user_metadata: {
        name: 'Test User',
        role: 'admin'
      }
    });

    if (error) {
      console.error('❌ Error creando usuario:', error);
      return;
    }

    console.log('✅ Usuario creado exitosamente:');
    console.log(`   ID: ${data.user.id}`);
    console.log(`   Email: ${data.user.email}`);
    console.log('\n🔐 Credenciales de acceso:');
    console.log('   Email: test@example.com');
    console.log('   Password: Test123456!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestUser();
