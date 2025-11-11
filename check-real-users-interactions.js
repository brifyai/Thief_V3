// Cargar variables de entorno desde el directorio correcto
require('dotenv').config({ path: './server/backend/.env' });

const { supabase } = require('./server/backend/src/config/database');

async function checkRealUsersInteractions() {
  try {
    console.log('🔍 Verificando usuarios reales y sus interacciones...\n');

    // 1. Obtener todos los usuarios activos
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError);
      return;
    }

    console.log(`📊 Total de usuarios activos: ${users.length}\n`);

    if (users.length === 0) {
      console.log('⚠️ No hay usuarios activos en la base de datos');
      return;
    }

    // 2. Para cada usuario, verificar sus interacciones
    for (const user of users) {
      console.log(`\n👤 Usuario: ${user.name || user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Rol: ${user.role}`);

      // Verificar si tiene configuración de interacciones
      const { data: config, error: configError } = await supabase
        .from('user_interaction_configs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (configError || !config) {
        console.log(`   ⚠️ No tiene configuración de interacciones`);
        
        // Crear configuración por defecto
        const defaultConfig = {
          user_id: user.id,
          daily_limit: user.role === 'premium' ? 100 : 10,
          interactions_used_today: 0,
          last_interaction_date: new Date().toISOString().split('T')[0],
          auto_renew: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('user_interaction_configs')
          .insert(defaultConfig);

        if (insertError) {
          console.log(`   ❌ Error creando configuración: ${insertError.message}`);
        } else {
          console.log(`   ✅ Configuración creada: ${defaultConfig.daily_limit} interacciones diarias`);
        }
      } else {
        console.log(`   ✅ Configuración existente:`);
        console.log(`      Límite diario: ${config.daily_limit}`);
        console.log(`      Usadas hoy: ${config.interactions_used_today}`);
        console.log(`      Última fecha: ${config.last_interaction_date}`);
      }

      // Verificar historial de interacciones recientes
      const { data: history, error: historyError } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (historyError) {
        console.log(`   ❌ Error obteniendo historial: ${historyError.message}`);
      } else {
        console.log(`   📈 Historial reciente (últimas 24h): ${history.length} operaciones`);
        
        // Calcular tokens usados en las últimas 24h
        const totalTokens = history.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
        console.log(`   💰 Tokens usados (24h): ${totalTokens.toLocaleString()}`);
      }
    }

    // 3. Verificar estadísticas globales
    console.log('\n\n📊 Estadísticas globales del sistema:');
    
    const { data: globalStats, error: globalError } = await supabase
      .from('ai_usage_logs')
      .select('user_id, tokens_used, operation_type')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!globalError && globalStats) {
      const uniqueUsers = new Set(globalStats.map(log => log.user_id)).size;
      const totalTokens = globalStats.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
      const operationsByType = globalStats.reduce((acc, log) => {
        acc[log.operation_type] = (acc[log.operation_type] || 0) + 1;
        return acc;
      }, {});

      console.log(`   Usuarios activos (24h): ${uniqueUsers}`);
      console.log(`   Total tokens (24h): ${totalTokens.toLocaleString()}`);
      console.log(`   Operaciones por tipo:`);
      
      Object.entries(operationsByType).forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`);
      });
    }

    // 4. Verificar si hay estadísticas en Redis
    try {
      const redis = require('redis');
      const redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await redisClient.connect();
      
      console.log('\n\n🔴 Estadísticas en Redis:');
      
      // Obtener todas las claves de estadísticas
      const keys = await redisClient.keys('stats:*');
      
      for (const key of keys) {
        const value = await redisClient.get(key);
        console.log(`   ${key}: ${value}`);
      }

      await redisClient.disconnect();
    } catch (redisError) {
      console.log('\n⚠️ No se pudo conectar a Redis (puede estar apagado)');
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar verificación
checkRealUsersInteractions();