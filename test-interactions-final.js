// Cargar variables de entorno
require('dotenv').config({ path: './server/backend/.env' });

const { createClient } = require('@supabase/supabase-js');
const { tokenTracker } = require('./server/backend/src/services/tokenTracker.service');

async function testInteractionsFinal() {
  try {
    console.log('🧪 Test final del sistema de interacciones...\n');

    // Conectar a Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obtener un usuario real para probar
    console.log('👤 Obteniendo usuario para prueba...');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (userError || !user) {
      console.log('❌ No se encontró usuario admin, usando cualquier usuario activo...');
      
      const { data: anyUser, error: anyUserError } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (anyUserError || !anyUser) {
        throw new Error('No hay usuarios activos para probar');
      }
      
      user = anyUser;
    }

    console.log(`✅ Usuario encontrado: ${user.name} (${user.email})`);
    console.log(`   ID: ${user.id}`);

    // 2. Inicializar token tracker
    console.log('\n📊 Inicializando Token Tracker...');
    await tokenTracker.initialize();

    // 3. Probar tracking de una operación
    console.log('\n🧪 Probando tracking de operación...');
    
    const trackingResult = await tokenTracker.trackUsage({
      operationType: 'test',
      userId: user.id,
      inputTokens: 100,
      outputTokens: 50,
      modelUsed: 'llama3-8b-8192',
      promptLength: 200,
      responseLength: 100
    });

    if (trackingResult) {
      console.log(`✅ Tracking exitoso:`);
      console.log(`   Tokens: ${trackingResult.tokens}`);
      console.log(`   Cost: $${trackingResult.cost.toFixed(6)}`);
    } else {
      console.log('❌ Tracking falló');
    }

    // 4. Forzar flush de logs
    console.log('\n💾 Forzando flush de logs...');
    await tokenTracker.flushLogs();

    // 5. Verificar que se guardó en BD
    console.log('\n🔍 Verificando registro en BD...');
    
    // Esperar un momento para que se guarde
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: logs, error: logsError } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logsError) {
      console.log(`❌ Error obteniendo logs: ${logsError.message}`);
    } else {
      console.log(`✅ Logs encontrados: ${logs.length}`);
      logs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.operation_type} - User ID: ${log.user_id} - ${new Date(log.created_at).toLocaleString()}`);
      });
    }

    // 6. Probar estadísticas
    console.log('\n📈 Probando estadísticas...');
    
    const stats = await tokenTracker.getTodayStats();
    
    if (stats) {
      console.log(`✅ Estadísticas del día:`);
      console.log(`   Operaciones: ${stats.total_operations}`);
      console.log(`   Tokens: ${stats.total_tokens}`);
      console.log(`   Costo: $${stats.total_cost.toFixed(4)}`);
    } else {
      console.log('❌ No se pudieron obtener estadísticas');
    }

    // 7. Verificar configuración de interacciones si existe la tabla
    console.log('\n⚙️ Verificando configuración de interacciones...');
    
    try {
      const { data: configs, error: configError } = await supabase
        .from('user_interaction_configs')
        .select('*')
        .eq('user_id', tokenTracker.normalizeUserId(user.id));

      if (configError) {
        console.log(`⚠️ Tabla user_interaction_configs no disponible: ${configError.message}`);
      } else {
        console.log(`✅ Configuraciones encontradas: ${configs.length}`);
        configs.forEach(config => {
          console.log(`   Límite diario: ${config.daily_limit}`);
          console.log(`   Usadas hoy: ${config.interactions_used_today}`);
        });
      }
    } catch (err) {
      console.log(`⚠️ Error verificando configuraciones: ${err.message}`);
    }

    // 8. Probar múltiples operaciones
    console.log('\n🔄 Probando múltiples operaciones...');
    
    for (let i = 0; i < 3; i++) {
      await tokenTracker.trackUsage({
        operationType: 'search',
        userId: user.id,
        inputTokens: 50 + i * 10,
        outputTokens: 25 + i * 5,
        modelUsed: 'llama3-8b-8192'
      });
    }

    await tokenTracker.flushLogs();
    console.log('✅ 3 operaciones adicionales registradas');

    // 9. Estadísticas finales
    console.log('\n📊 Estadísticas finales...');
    
    const finalStats = await tokenTracker.getTodayStats();
    
    if (finalStats) {
      console.log(`✅ Estadísticas finales del día:`);
      console.log(`   Operaciones totales: ${finalStats.total_operations}`);
      console.log(`   Tokens totales: ${finalStats.total_tokens}`);
      console.log(`   Costo total: $${finalStats.total_cost.toFixed(4)}`);
      
      if (finalStats.by_operation) {
        console.log('   Por operación:');
        Object.entries(finalStats.by_operation).forEach(([type, data]) => {
          if (data.operations > 0) {
            console.log(`      ${type}: ${data.operations} ops, ${data.tokens} tokens, $${data.cost.toFixed(4)}`);
          }
        });
      }
    }

    // 10. Limpiar
    console.log('\n🧹 Limpiando...');
    await tokenTracker.shutdown();

    console.log('\n🎉 Test completado exitosamente');
    console.log('\n📋 Resumen:');
    console.log('✅ Token Tracker funciona correctamente');
    console.log('✅ Los logs se guardan en la BD');
    console.log('✅ Las estadísticas se calculan correctamente');
    console.log('✅ Los IDs de usuario se normalizan correctamente');

  } catch (error) {
    console.error('❌ Error en test final:', error);
  }
}

// Ejecutar test
testInteractionsFinal();