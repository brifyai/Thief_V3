// Cargar variables de entorno
require('dotenv').config({ path: './server/backend/.env' });

const { createClient } = require('@supabase/supabase-js');

async function setupInteractionsManual() {
  try {
    console.log('🔧 Configurando esquema de interacciones manualmente...\n');

    // Conectar a Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Crear tabla user_interaction_configs
    console.log('📝 Creando tabla user_interaction_configs...');
    
    try {
      const { error } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS user_interaction_configs (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              daily_limit INTEGER NOT NULL DEFAULT 10,
              interactions_used_today INTEGER NOT NULL DEFAULT 0,
              last_interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
              auto_renew BOOLEAN NOT NULL DEFAULT true,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(user_id)
          );
        `
      });
      
      if (error && !error.message.includes('already exists')) {
        console.log('⚠️ No se puede crear tabla via RPC, intentando método alternativo...');
      }
    } catch (err) {
      console.log('⚠️ Método RPC no disponible, las tablas deben crearse manualmente en el panel de Supabase');
    }

    // 2. Verificar si la tabla ai_usage_logs existe y tiene la estructura correcta
    console.log('\n🔍 Verificando estructura de ai_usage_logs...');
    
    try {
      const { data: sampleData, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .limit(1);

      if (error) {
        console.log('❌ Error en ai_usage_logs:', error.message);
        
        // Intentar crear la tabla con la estructura correcta
        console.log('📝 Intentando crear ai_usage_logs con estructura correcta...');
        
        try {
          await supabase.rpc('exec', {
            sql: `
              CREATE TABLE IF NOT EXISTS ai_usage_logs (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                  operation_type VARCHAR(50) NOT NULL,
                  tokens_used INTEGER NOT NULL DEFAULT 0,
                  cost_usd DECIMAL(10,6) DEFAULT 0,
                  input_text TEXT,
                  output_text TEXT,
                  model_used VARCHAR(100),
                  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                  metadata JSONB DEFAULT '{}'
              );
              
              CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
              CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
              CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_operation_type ON ai_usage_logs(operation_type);
            `
          });
        } catch (createErr) {
          console.log('⚠️ No se puede crear tabla via script');
        }
      } else {
        console.log('✅ Tabla ai_usage_logs verificada');
      }
    } catch (err) {
      console.log('❌ Error verificando ai_usage_logs:', err.message);
    }

    // 3. Configurar usuarios existentes manualmente
    console.log('\n👤 Configurando usuarios existentes...');
    
    try {
      // Obtener usuarios activos
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true);

      if (usersError) {
        console.log('❌ Error obteniendo usuarios:', usersError.message);
        return;
      }

      console.log(`📊 Encontrados ${users.length} usuarios activos`);

      // Para cada usuario, intentar crear configuración
      for (const user of users) {
        const dailyLimit = user.role === 'admin' ? 100 : user.role === 'premium' ? 50 : 10;
        
        try {
          const { error: insertError } = await supabase
            .from('user_interaction_configs')
            .upsert({
              user_id: user.id,
              daily_limit: dailyLimit,
              interactions_used_today: 0,
              last_interaction_date: new Date().toISOString().split('T')[0],
              auto_renew: true
            }, {
              onConflict: 'user_id'
            });

          if (insertError) {
            console.log(`⚠️ Usuario ${user.email}: ${insertError.message}`);
          } else {
            console.log(`✅ Usuario ${user.email}: ${dailyLimit} interacciones diarias configuradas`);
          }
        } catch (err) {
          console.log(`❌ Error configurando usuario ${user.email}: ${err.message}`);
        }
      }

    } catch (err) {
      console.log('❌ Error configurando usuarios:', err.message);
    }

    // 4. Crear un registro de prueba en ai_usage_logs
    console.log('\n🧪 Creando registro de prueba...');
    
    try {
      const { data: testUser, error: testUserError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (testUserError) {
        console.log('❌ No se encontró usuario admin para prueba');
      } else {
        const { error: logError } = await supabase
          .from('ai_usage_logs')
          .insert({
            user_id: testUser.id,
            operation_type: 'test',
            tokens_used: 100,
            cost_usd: 0.001,
            input_text: 'Texto de prueba',
            output_text: 'Respuesta de prueba',
            model_used: 'test-model',
            metadata: { test: true }
          });

        if (logError) {
          console.log(`❌ Error creando registro de prueba: ${logError.message}`);
        } else {
          console.log(`✅ Registro de prueba creado para ${testUser.email}`);
        }
      }
    } catch (err) {
      console.log('❌ Error en prueba:', err.message);
    }

    // 5. Verificar estado final
    console.log('\n📋 Verificación final...');
    
    try {
      // Verificar usuarios con configuración
      const { data: configs, error: configError } = await supabase
        .from('user_interaction_configs')
        .select(`
          *,
          users (name, email, role)
        `);

      if (configError) {
        console.log('❌ Error verificando configuraciones:', configError.message);
      } else {
        console.log(`✅ Configuraciones creadas: ${configs.length}`);
        configs.forEach(config => {
          console.log(`   👤 ${config.users.name}: ${config.interactions_used_today}/${config.daily_limit}`);
        });
      }

      // Verificar logs de AI
      const { data: logs, error: logsError } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (logsError) {
        console.log('❌ Error verificando logs:', logsError.message);
      } else {
        console.log(`✅ Logs de AI encontrados: ${logs.length}`);
        logs.forEach(log => {
          console.log(`   📝 ${log.operation_type}: ${log.tokens_used} tokens - ${new Date(log.created_at).toLocaleString()}`);
        });
      }

    } catch (err) {
      console.log('❌ Error en verificación final:', err.message);
    }

    console.log('\n🎉 Configuración manual completada');
    console.log('\n📋 Si las tablas no se crearon automáticamente:');
    console.log('1. Ve al panel de Supabase > SQL Editor');
    console.log('2. Ejecuta el contenido del archivo setup-interactions-schema.sql');
    console.log('3. Reinicia el servidor backend');
    console.log('4. Prueba las operaciones de AI');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar configuración
setupInteractionsManual();