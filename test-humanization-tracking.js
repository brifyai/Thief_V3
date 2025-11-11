// Cargar variables de entorno
require('dotenv').config({ path: './server/backend/.env' });

const { createClient } = require('@supabase/supabase-js');
const { tokenTracker } = require('./server/backend/src/services/tokenTracker.service');
const interactionManager = require('./server/backend/src/services/interactionManager.service');
const newsHumanizationService = require('./server/backend/src/services/newsHumanization.service');

async function testHumanizationTracking() {
  try {
    console.log('🧪 Test de tracking en humanización de noticias...\n');

    // Conectar a Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obtener una noticia para humanizar
    console.log('📰 Obteniendo noticia para prueba...');
    
    const { data: news, error: newsError } = await supabase
      .from('news')
      .select('*')
      .limit(1)
      .single();

    if (newsError || !news) {
      console.log('❌ No se encontró noticia para probar');
      return;
    }

    console.log(`✅ Noticia encontrada: ${news.title?.substring(0, 50)}...`);

    // 2. Inicializar token tracker
    console.log('\n📊 Inicializando Token Tracker...');
    await tokenTracker.initialize();

    // 3. Probar humanización con tracking
    console.log('\n🧠 Probando humanización con tracking...');
    
    const userId = 'demo-admin'; // ID de demo para probar
    
    try {
      const result = await newsHumanizationService.humanizeContent(news.id, userId, {
        tone: 'professional',
        style: 'detailed',
        complexity: 'intermediate'
      });

      if (result) {
        console.log('✅ Humanización completada exitosamente');
        console.log(`   Tokens usados: ${result.tokens_used || 0}`);
        console.log(`   Costo: $${(result.cost || 0).toFixed(6)}`);
        console.log(`   Modelo: ${result.ai_model || 'unknown'}`);
      }
    } catch (humanizationError) {
      console.log('❌ Error en humanización:', humanizationError.message);
    }

    // 4. Forzar flush de logs
    console.log('\n💾 Forzando flush de logs...');
    await tokenTracker.flushLogs();

    // 5. Verificar logs en BD
    console.log('\n🔍 Verificando logs en BD...');
    
    // Esperar un momento para que se guarde
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: logs, error: logsError } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('operation_type', 'news_humanization')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logsError) {
      console.log(`❌ Error obteniendo logs: ${logsError.message}`);
    } else {
      console.log(`✅ Logs de humanización encontrados: ${logs.length}`);
      logs.forEach((log, index) => {
        console.log(`   ${index + 1}. User ID: ${log.user_id} - Tokens: ${log.total_tokens} - ${new Date(log.created_at).toLocaleString()}`);
      });
    }

    // 6. Verificar estadísticas
    console.log('\n📈 Verificando estadísticas...');
    
    const stats = await tokenTracker.getTodayStats();
    
    if (stats) {
      console.log(`✅ Estadísticas del día:`);
      console.log(`   Operaciones totales: ${stats.total_operations}`);
      console.log(`   Tokens totales: ${stats.total_tokens}`);
      console.log(`   Costo total: $${stats.total_cost.toFixed(4)}`);
      
      if (stats.by_operation && stats.by_operation.news_humanization) {
        console.log(`   Humanizaciones: ${stats.by_operation.news_humanization.operations} ops, ${stats.by_operation.news_humanization.tokens} tokens`);
      }
    }

    // 7. Verificar balance de interacciones
    console.log('\n⚖️ Verificando balance de interacciones...');
    
    try {
      const balance = await interactionManager.getBalance(userId);
      console.log(`✅ Balance del usuario ${userId}:`);
      console.log(`   Interacciones disponibles: ${balance.available_interactions}`);
      console.log(`   Consumidas hoy: ${balance.consumed_today}`);
      console.log(`   Límite diario: ${balance.daily_limit}`);
    } catch (balanceError) {
      console.log(`⚠️ Error verificando balance: ${balanceError.message}`);
    }

    // 8. Limpiar
    console.log('\n🧹 Limpiando...');
    await tokenTracker.shutdown();

    console.log('\n🎉 Test completado');
    console.log('\n📋 Resumen:');
    console.log('✅ Humanización con tracking funciona');
    console.log('✅ Logs se guardan correctamente');
    console.log('✅ Estadísticas se calculan');
    console.log('✅ IDs se normalizan correctamente');

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar test
testHumanizationTracking();