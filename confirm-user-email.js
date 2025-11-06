const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase - usando las claves del .env
const supabaseUrl = 'https://vdmbvordfslrpnbkozig.supabase.co';

// Intentar diferentes formatos de la clave de servicio
const serviceKeys = [
  'sb_secret_Z2QYOuGA7OzT_EBTeqGRkg_xLRh1fXY',
  process.env.SUPABASE_SERVICE_ROLE_KEY
];

async function tryConfirmEmail(serviceKey) {
  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const email = 'camiloalegriabarra@gmail.com';
    const userId = 'a96da5d7-33fa-4768-b963-b3ba8ed72eee';
    
    console.log('🔍 Intentando confirmar email con Admin API...');
    
    // Actualizar el usuario para confirmar su email
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true
    });
    
    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
    
    console.log('✅ Email confirmado exitosamente!');
    console.log('📧 Usuario:', data.user.email);
    console.log('✓ Email confirmado:', data.user.email_confirmed_at ? 'Sí' : 'No');
    return true;
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    return false;
  }
}

async function confirmEmail() {
  console.log('🔐 Confirmando email del usuario...\n');
  
  for (const key of serviceKeys) {
    if (!key) continue;
    
    console.log('Probando con clave:', key.substring(0, 20) + '...');
    const success = await tryConfirmEmail(key);
    
    if (success) {
      console.log('\n✅ ¡Listo! Ahora puedes iniciar sesión con:');
      console.log('   Email: camiloalegriabarra@gmail.com');
      console.log('   Password: Antonito26');
      return;
    }
    console.log('');
  }
  
  console.log('\n⚠️  No se pudo confirmar el email automáticamente.');
  console.log('Por favor, confírmalo manualmente en el Dashboard');
  console.log('\nPasos:');
  console.log('1. Ve a: https://supabase.com/dashboard/project/vdmbvordfslrpnbkozig');
  console.log('2. Authentication > Users');
  console.log('3. Busca: camiloalegriabarra@gmail.com');
  console.log('4. Haz clic en el usuario');
  console.log('5. Marca "Confirm email"');
  console.log('6. Guarda');
}

confirmEmail();