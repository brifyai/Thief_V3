const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://vdmbvordfslrpnbkozig.supabase.co';
const supabaseServiceKey = 'sb_secret_Z2QYOuGA7OzT_EBTeqGRkg_xLRh1fXY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createDemoUser() {
  console.log('🔧 Creando usuario de demo en Supabase Auth...');
  
  const email = 'demo@scraper.com';
  const password = 'demo123';
  const name = 'Usuario Demo';
  
  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name
      }
    });
    
    if (authError) {
      console.error('❌ Error creando usuario en Auth:', authError);
      return;
    }
    
    console.log('✅ Usuario creado en Supabase Auth:', authData.user.id);
    
    // 2. Crear perfil en la tabla users
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        name: name,
        role: 'admin',
        created_at: authData.user.created_at,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (profileError) {
      console.error('❌ Error creando perfil:', profileError);
    } else {
      console.log('✅ Perfil creado exitosamente:', profileData);
    }
    
    console.log('\n🔐 Credenciales de acceso:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n✅ Usuario demo creado completamente!');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createDemoUser();