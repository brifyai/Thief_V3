const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'server/backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('🔍 Verificando usuario camiloalegriabarra@gmail.com...');
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('email', 'camiloalegriabarra@gmail.com');
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Usuario encontrado:');
      console.log('   Email:', data[0].email);
      console.log('   Rol:', data[0].role);
      console.log('   Activo:', data[0].is_active);
      
      if (data[0].role !== 'admin') {
        console.log('\n⚠️ El usuario NO es admin. Actualizando rol...');
        
        const { data: updated, error: updateError } = await supabase
          .from('users')
          .update({ role: 'admin' })
          .eq('id', data[0].id)
          .select();
        
        if (updateError) {
          console.error('❌ Error actualizando rol:', updateError);
        } else {
          console.log('✅ Rol actualizado a admin');
        }
      } else {
        console.log('✅ El usuario ya es admin');
      }
    } else {
      console.log('❌ Usuario no encontrado');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
