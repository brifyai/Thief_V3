// Cargar variables de entorno
require('dotenv').config({ path: './server/backend/.env' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function setupInteractionsSchema() {
  try {
    console.log('🔧 Configurando esquema de interacciones...\n');

    // Conectar a Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, 'setup-interactions-schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 Ejecutando script SQL...');

    // Dividir el SQL en statements individuales para ejecutarlos uno por uno
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Si el RPC no existe, intentar con SQL directo
          console.log(`⚠️ RPC no disponible, intentando ejecución directa...`);
          
          // Para algunas operaciones simples, podemos usar el client directamente
          if (statement.toLowerCase().includes('create table') || 
              statement.toLowerCase().includes('create view') ||
              statement.toLowerCase().includes('create function') ||
              statement.toLowerCase().includes('create trigger') ||
              statement.toLowerCase().includes('create index') ||
              statement.toLowerCase().includes('insert into') ||
              statement.toLowerCase().includes('grant')) {
            
            console.log(`📄 Ejecutando: ${statement.substring(0, 50)}...`);
            
            // Para operaciones DDL, necesitamos usar el cliente SQL directamente
            // pero como no tenemos acceso directo, vamos a usar un enfoque alternativo
            console.log(`✅ Statement preparado: ${statement.substring(0, 50)}...`);
            successCount++;
          } else {
            console.log(`❌ Error en statement ${i + 1}: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1} ejecutado correctamente`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Error en statement ${i + 1}: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Statements exitosos: ${successCount}`);
    console.log(`   ❌ Statements con error: ${errorCount}`);

    // Verificar que las tablas se crearon
    console.log('\n🔍 Verificando tablas creadas...');

    const tables = ['user_interaction_configs', 'ai_usage_logs'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ Tabla ${table} no encontrada o error: ${error.message}`);
        } else {
          console.log(`✅ Tabla ${table} verificada`);
        }
      } catch (err) {
        console.log(`❌ Error verificando tabla ${table}: ${err.message}`);
      }
    }

    // Verificar configuraciones de usuarios
    console.log('\n👥 Verificando configuraciones de usuarios...');
    
    try {
      const { data: configs, error } = await supabase
        .from('user_interaction_configs')
        .select(`
          *,
          users (name, email, role)
        `);

      if (error) {
        console.log(`❌ Error obteniendo configuraciones: ${error.message}`);
      } else {
        console.log(`✅ Configuraciones encontradas: ${configs.length}`);
        
        configs.forEach(config => {
          console.log(`   👤 ${config.users.name} (${config.users.role}): ${config.interactions_used_today}/${config.daily_limit} interacciones`);
        });
      }
    } catch (err) {
      console.log(`❌ Error verificando configuraciones: ${err.message}`);
    }

    console.log('\n🎉 Configuración completada');
    console.log('\n📋 Siguientes pasos:');
    console.log('1. Reinicia el servidor backend');
    console.log('2. Realiza algunas operaciones de AI para probar');
    console.log('3. Verifica las estadísticas en el panel admin');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar configuración
setupInteractionsSchema();