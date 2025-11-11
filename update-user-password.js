const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://vdmbvordfslrpnbkozig.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbWJ2b3JkZnNscnBuYmtvemln Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTU2NDI5NywiZXhwIjoyMDQ3MTQwMjk3fQ.MZ1Ih5Py8H_ZUQ-F4SmtXlS8vwBHcIJCfxc6i7kZhIs';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateUserPassword() {
  try {
    const email = 'camiloalegriabarra@gmail.com';
    const newPassword = 'Antonito26';
    
    console.log('🔍 Buscando usuario...');
    
    // Buscar el usuario por email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listando usuarios:', listError);
      return;
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.log('❌ Usuario no encontrado. Creando nuevo usuario...');
      
      // Crear el usuario con email confirmado
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          name: 'Camilo Alegría'
        }
      });
      
      if (createError) {
        console.error('❌ Error creando usuario:', createError);
        return;
      }
      
      console.log('✅ Usuario creado:', newUser.user.email);
      
      // Actualizar la tabla users con el rol admin
      const { error: insertError } = await supabase
        .from('users')
        .upsert({
          id: newUser.user.id,
          email: email,
          name: 'Camilo Alegría',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('❌ Error insertando en tabla users:', insertError);
      } else {
        console.log('✅ Rol admin asignado en tabla users');
      }
      
    } else {
      console.log('✅ Usuario encontrado:', user.email);
      console.log('📝 Estado actual:', {
        email_confirmed: user.email_confirmed_at ? 'Sí' : 'No',
        last_sign_in: user.last_sign_in_at || 'Nunca'
      });
      
      // Actualizar la contraseña y confirmar el email
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          password: newPassword,
          email_confirm: true
        }
      );
      
      if (updateError) {
        console.error('❌ Error actualizando usuario:', updateError);
        return;
      }
      
      console.log('✅ Contraseña actualizada y email confirmado');
      
      // Asegurar que el rol admin esté en la tabla users
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: email,
          name: 'Camilo Alegría',
          role: 'admin',
          updated_at: new Date().toISOString()
        });
      
      if (upsertError) {
        console.error('❌ Error actualizando tabla users:', upsertError);
      } else {
        console.log('✅ Rol admin actualizado en tabla users');
      }
    }
    
    console.log('\n✅ Usuario listo para login:');
    console.log('   Email:', email);
    console.log('   Password:', newPassword);
    console.log('   Rol: admin');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

updateUserPassword();