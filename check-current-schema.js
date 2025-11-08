// Cargar variables de entorno
require('dotenv').config({ path: './server/backend/.env' });

const { createClient } = require('@supabase/supabase-js');

async function checkCurrentSchema() {
  try {
    console.log('🔍 Verificando esquema actual de la base de datos...\n');

    // Conectar a Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Verificar estructura de ai_usage_logs
    console.log('📝 Estructura actual de ai_usage_logs:');
    
    try {
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .limit(1);

      if (error) {
        console.log('❌ Error:', error.message);
      } else if (data && data.length > 0) {
        const sample = data[0];
        console.log('📊 Columnas encontradas:');
        Object.keys(sample).forEach(key => {
          console.log(`   - ${key}: ${typeof sample[key]} (${sample[key]})`);
        });
      } else {
        console.log('📊 La tabla existe pero está vacía');
        
        // Intentar insertar un registro para ver la estructura
        try {
          const { data: insertData, error: insertError } = await supabase
            .from('ai_usage_logs')
            .insert({
              user_id: '00000000-0000-0000-0000-000000000001',
              operation_type: 'test',
              tokens_used: 100
            })
            .select()
            .single();

          if (insertError) {
            console.log('❌ Error insertando registro de prueba:', insertError.message);
            console.log('   Esto nos ayuda a entender qué columnas faltan');
          } else {
            console.log('✅ Registro insertado exitosamente');
            console.log('📊 Columnas del registro insertado:');
            Object.keys(insertData).forEach(key => {
              console.log(`   - ${key}: ${typeof insertData[key]} (${insertData[key]})`);
            });

            // Eliminar el registro de prueba
            await supabase
              .from('ai_usage_logs')
              .delete()
              .eq('id', insertData.id);
          }
        } catch (insertErr) {
          console.log('❌ Error en prueba de inserción:', insertErr.message);
        }
      }
    } catch (err) {
      console.log('❌ Error verificando ai_usage_logs:', err.message);
    }

    // 2. Verificar si user_interaction_configs existe
    console.log('\n📝 Verificando user_interaction_configs:');
    
    try {
      const { data, error } = await supabase
        .from('user_interaction_configs')
        .select('*')
        .limit(1);

      if (error) {
        console.log('❌ La tabla no existe:', error.message);
      } else {
        console.log('✅ La tabla existe');
        if (data && data.length > 0) {
          console.log('📊 Columnas:');
          Object.keys(data[0]).forEach(key => {
            console.log(`   - ${key}: ${typeof data[0][key]}`);
          });
        }
      }
    } catch (err) {
      console.log('❌ Error verificando user_interaction_configs:', err.message);
    }

    // 3. Listar todas las tablas
    console.log('\n📋 Listando tablas disponibles:');
    
    try {
      // Usar una consulta para listar tablas
      const { data, error } = await supabase
        .rpc('get_tables');

      if (error) {
        console.log('⚠️ No se puede listar tablas via RPC');
        
        // Alternativa: intentar consultar tablas conocidas
        const knownTables = [
          'users',
          'ai_usage_logs', 
          'user_interaction_configs',
          'news',
          'highlights',
          'saved_articles',
          'public_urls',
          'scraping_results'
        ];

        for (const table of knownTables) {
          try {
            const { data: tableData, error: tableError } = await supabase
              .from(table)
              .select('*')
              .limit(1);

            if (tableError) {
              console.log(`   ❌ ${table}: No existe o sin permisos`);
            } else {
              console.log(`   ✅ ${table}: Existe`);
            }
          } catch (err) {
            console.log(`   ❌ ${table}: Error - ${err.message}`);
          }
        }
      } else {
        console.log('✅ Tablas encontradas:');
        data.forEach(table => {
          console.log(`   - ${table}`);
        });
      }
    } catch (err) {
      console.log('❌ Error listando tablas:', err.message);
    }

    // 4. Verificar usuarios
    console.log('\n👤 Verificando usuarios:');
    
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, role, is_active')
        .eq('is_active', true);

      if (error) {
        console.log('❌ Error obteniendo usuarios:', error.message);
      } else {
        console.log(`✅ Usuarios activos: ${users.length}`);
        users.forEach(user => {
          console.log(`   👤 ${user.name} (${user.email}) - ${user.role}`);
        });
      }
    } catch (err) {
      console.log('❌ Error verificando usuarios:', err.message);
    }

    console.log('\n🎯 Recomendaciones:');
    console.log('1. Si user_interaction_configs no existe, créala manualmente en Supabase');
    console.log('2. Si ai_usage_logs no tiene las columnas necesarias, agrégalas');
    console.log('3. Ejecuta el SQL del archivo setup-interactions-schema.sql en el panel de Supabase');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar verificación
checkCurrentSchema();