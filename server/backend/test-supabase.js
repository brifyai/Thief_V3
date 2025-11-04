// Script para verificar la conexión a Supabase
require('dotenv').config();
const supabase = require('./src/config/supabase');

async function testSupabaseConnection() {
  console.log('🔍 Verificando configuración de Supabase...\n');
  
  // Verificar variables de entorno
  console.log('✓ SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurada' : '❌ No configurada');
  console.log('✓ SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Configurada' : '❌ No configurada');
  console.log('✓ SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ No configurada');
  console.log('');

  try {
    // Intentar hacer una consulta simple
    console.log('🔄 Intentando conectar a Supabase...');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(0);

    if (error) {
      console.error('❌ Error al conectar:', error.message);
      process.exit(1);
    }

    console.log('✅ Conexión exitosa a Supabase');
    console.log('✅ La tabla "users" existe y es accesible');
    
    // Verificar estructura de la tabla
    const { data: tableData, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.warn('⚠️  Advertencia al leer estructura:', tableError.message);
    } else {
      console.log('✅ Estructura de tabla verificada');
    }

    console.log('\n🎉 Todo está configurado correctamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    process.exit(1);
  }
}

testSupabaseConnection();
