const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://vdmbvordfslrpnbkozig.supabase.co';
const supabaseServiceKey = 'sb_secret_Z2QYOuGA7OzT_EBTeqGRkg_xLRh1fXY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function assignAdminRole() {
  try {
    const userId = 'a96da5d7-33fa-4768-b963-b3ba8ed72eee';
    const email = 'camiloalegriabarra@gmail.com';
    
    console.log('🔍 Verificando esquema de la tabla users...');
    
    // Primero, verificar si la tabla existe y su estructura
    const { data: tableCheck, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      console.log('❌ La tabla users no existe. Creándola...');
      
      // Crear la tabla users con el esquema correcto
      const { error: createError } = await supabase.rpc('exec_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (createError) {
        console.error('❌ Error creando tabla:', createError);
        console.log('\n⚠️  Por favor, ejecuta este SQL manualmente en Supabase SQL Editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES ('${userId}', '${email}', 'Camilo Alegría', 'admin', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET role = 'admin', updated_at = NOW();
        `);
        return;
      }
    }
    
    console.log('📝 Insertando usuario con rol admin...');
    
    // Insertar o actualizar el usuario con rol admin
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        name: 'Camilo Alegría',
        role: 'admin',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select();
    
    if (error) {
      console.error('❌ Error insertando usuario:', error);
      console.log('\n⚠️  Por favor, ejecuta este SQL manualmente en Supabase SQL Editor:');
      console.log(`
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES ('${userId}', '${email}', 'Camilo Alegría', 'admin', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET role = 'admin', updated_at = NOW();
      `);
      return;
    }
    
    console.log('✅ Rol admin asignado correctamente!');
    console.log('👤 Usuario:', data);
    
    // Verificar el rol
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verificando:', verifyError);
      return;
    }
    
    console.log('\n✅ Verificación:');
    console.log('   ID:', verifyData.id);
    console.log('   Email:', verifyData.email);
    console.log('   Nombre:', verifyData.name);
    console.log('   Rol:', verifyData.role);
    console.log('\n🎉 ¡Acceso administrador configurado correctamente!');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

assignAdminRole();