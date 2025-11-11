// Cargar variables de entorno
require('dotenv').config({ path: './server/backend/.env' });

const { createClient } = require('@supabase/supabase-js');

async function checkAiUsageLogsStructure() {
  try {
    console.log('🔍 Analizando estructura detallada de ai_usage_logs...\n');

    // Conectar a Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Intentar diferentes combinaciones para descubrir las columnas
    console.log('📊 Intentando descubrir columnas de ai_usage_logs...');

    const possibleColumns = [
      'id',
      'user_id', 
      'operation_type',
      'tokens_used',
      'cost_usd',
      'input_text',
      'output_text', 
      'model_used',
      'created_at',
      'metadata',
      'timestamp',
      'user',
      'operation',
      'tokens',
      'cost'
    ];

    let existingColumns = [];

    for (const column of possibleColumns) {
      try {
        const { data, error } = await supabase
          .from('ai_usage_logs')
          .select(column)
          .limit(1);

        if (error) {
          console.log(`   ❌ ${column}: No existe`);
        } else {
          console.log(`   ✅ ${column}: Existe`);
          existingColumns.push(column);
        }
      } catch (err) {
        console.log(`   ❌ ${column}: Error - ${err.message}`);
      }
    }

    console.log(`\n📋 Columnas encontradas: ${existingColumns.join(', ')}`);

    // Intentar insertar un registro con columnas básicas
    console.log('\n🧪 Intentando insertar registro con columnas mínimas...');

    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    // Intentar diferentes combinaciones de inserción
    const insertAttempts = [
      {
        name: 'Solo user_id',
        data: { user_id: testUserId }
      },
      {
        name: 'user_id + operation_type', 
        data: { user_id: testUserId, operation_type: 'test' }
      },
      {
        name: 'user_id + operation_type + created_at',
        data: { 
          user_id: testUserId, 
          operation_type: 'test',
          created_at: new Date().toISOString()
        }
      }
    ];

    for (const attempt of insertAttempts) {
      try {
        console.log(`\n📝 Intentando: ${attempt.name}`);
        
        const { data, error } = await supabase
          .from('ai_usage_logs')
          .insert(attempt.data)
          .select()
          .single();

        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
        } else {
          console.log(`   ✅ Éxito! Registro insertado`);
          console.log('   📊 Columnas del registro insertado:');
          Object.keys(data).forEach(key => {
            console.log(`      - ${key}: ${typeof data[key]} = ${data[key]}`);
          });

          // Eliminar el registro de prueba
          await supabase
            .from('ai_usage_logs')
            .delete()
            .eq('id', data.id);
          
          console.log('   🗑️ Registro de prueba eliminado');
          break;
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }

    // Verificar si podemos obtener información de la tabla de otra manera
    console.log('\n🔍 Intentando obtener información de la tabla...');

    try {
      // Intentar contar registros
      const { count, error: countError } = await supabase
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log(`❌ Error contando registros: ${countError.message}`);
      } else {
        console.log(`✅ Total de registros: ${count}`);
      }
    } catch (err) {
      console.log(`❌ Error en conteo: ${err.message}`);
    }

    console.log('\n🎯 Análisis completado');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Basado en las columnas encontradas, adapta el código');
    console.log('2. Si faltan columnas importantes, agrégalas manualmente en Supabase');
    console.log('3. Crea la tabla user_interaction_configs manualmente');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar análisis
checkAiUsageLogsStructure();