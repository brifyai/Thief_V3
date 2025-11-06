const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://vdmbvordfslrpnbkozig.supabase.co';
const supabaseAnonKey = 'sb_publishable_X9VIsoJfDIYG9tGt3L2whA_2iLhSzwp';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminUser() {
  try {
    const email = 'camiloalegriabarra@gmail.com';
    const password = 'Antonito26';
    
    console.log('📝 Intentando crear usuario...');
    
    // Intentar registrar el usuario
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: 'Camilo Alegría'
        }
      }
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        console.log('⚠️  Usuario ya existe. Necesitas:');
        console.log('   1. Ir al Dashboard de Supabase: https://vdmbvordfslrpnbkozig.supabase.co');
        console.log('   2. Ir a Authentication > Users');
        console.log('   3. Buscar el usuario:', email);
        console.log('   4. Hacer clic en el usuario y actualizar:');
        console.log('      - Email Confirmed: ✓ (marcar como confirmado)');
        console.log('      - Reset password a:', password);
        console.log('   5. Ejecutar este SQL en SQL Editor:');
        console.log('');
        console.log('      UPDATE users');
        console.log('      SET role = \'admin\'');
        console.log(`      WHERE email = '${email}';`);
        console.log('');
        console.log('   Luego intenta hacer login nuevamente.');
        return;
      }
      console.error('❌ Error al crear usuario:', error);
      return;
    }
    
    console.log('✅ Usuario creado exitosamente');
    console.log('📧 Email:', data.user?.email);
    console.log('🆔 ID:', data.user?.id);
    
    if (data.user?.id) {
      console.log('\n⚠️  IMPORTANTE: Ejecuta este SQL en Supabase SQL Editor:');
      console.log('');
      console.log('INSERT INTO users (id, email, name, role, created_at, updated_at)');
      console.log(`VALUES ('${data.user.id}', '${email}', 'Camilo Alegría', 'admin', NOW(), NOW())` );
      console.log('ON CONFLICT (id) DO UPDATE');
      console.log('SET role = \'admin\', updated_at = NOW();');
      console.log('');
      console.log('✅ Luego verifica tu email para confirmar la cuenta o');
      console.log('   confirma manualmente en Dashboard > Authentication > Users');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createAdminUser();