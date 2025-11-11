require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function restoreUser() {
  try {
    console.log('🔧 Restaurando usuario camiloalegriabarra@gmail.com...');

    // Datos del usuario
    const userData = {
      email: 'camiloalegriabarra@gmail.com',
      password: 'password123', // Contraseña por defecto
      name: 'Camilo Alegría Barra',
      role: 'admin'
    };

    // Verificar si el usuario ya existe
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      console.log('✅ El usuario ya existe:');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   ID: ${existingUser.id}`);
      return;
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error al verificar usuario:', checkError);
      return;
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Crear usuario
    const { data: newUser, error: insertError } = await supabase
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

    if (insertError) {
      console.error('❌ Error al crear usuario:', insertError);
      return;
    }

    console.log('\n✅ Usuario restaurado exitosamente:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Nombre: ${newUser.name}`);
    console.log(`   Role: ${newUser.role}`);
    console.log('\n🔐 Credenciales de acceso:');
    console.log(`   Email: ${userData.email}`);
    console.log(`   Password: ${userData.password}`);
    console.log('\n💡 Puedes cambiar la contraseña después de iniciar sesión.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar
restoreUser();
