/**
 * Script para configurar el usuario de demo con interacciones
 * Asegura que exista el usuario demo y tenga configuración de interacciones
 */

const { supabase } = require('./server/backend/src/config/database');

async function setupDemoUserInteractions() {
  console.log('🔧 Configurando usuario de demo para interacciones...\n');

  try {
    // 1. Verificar si el usuario demo existe
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@example.com')
      .single();

    let demoUser;
    
    if (userError && userError.code === 'PGRST116') {
      // Usuario no existe, crearlo
      console.log('📝 Creando usuario demo...');
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: '00000000-0000-0000-0000-000000000001', // UUID fijo para demo
          name: 'Demo Admin',
          email: 'admin@example.com',
          role: 'admin',
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creando usuario demo:', createError);
        return;
      }
      
      demoUser = newUser;
      console.log('✅ Usuario demo creado:', demoUser.name);
    } else {
      demoUser = existingUser;
      console.log('✅ Usuario demo encontrado:', demoUser.name);
    }

    // 2. Verificar si tiene configuración de interacciones
    const { data: existingInteractions, error: interactionsError } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', demoUser.id)
      .single();

    if (interactionsError && interactionsError.code === 'PGRST116') {
      // No tiene configuración, crearla
      console.log('📊 Creando configuración de interacciones...');
      
      const { data: newInteractions, error: createInteractionsError } = await supabase
        .from('user_interactions')
        .insert({
          user_id: demoUser.id,
          daily_limit: 250,
          available_interactions: 250,
          consumed_today: 0,
          last_reset: new Date().toISOString()
        })
        .select()
        .single();

      if (createInteractionsError) {
        console.error('❌ Error creando configuración de interacciones:', createInteractionsError);
        return;
      }
      
      console.log('✅ Configuración de interacciones creada');
    } else {
      console.log('✅ Configuración de interacciones existente');
    }

    // 3. Verificar balance actual
    console.log('\n📊 Verificando balance actual...');
    try {
      const { data: balance } = await supabase.rpc('get_user_balance', {
        p_user_id: demoUser.id
      });

      if (balance && balance.length > 0) {
        const currentBalance = balance[0];
        console.log('📈 Balance actual:', {
          disponibles: currentBalance.available_interactions,
          usadas_hoy: currentBalance.consumed_today,
          limite_diario: currentBalance.daily_limit,
          ultimo_reset: currentBalance.last_reset
        });
      }
    } catch (balanceError) {
      console.warn('⚠️ Error obteniendo balance:', balanceError.message);
    }

    // 4. Probar deducción de interacción
    console.log('\n🧪 Probando deducción de interacción...');
    try {
      const { data: deductionResult } = await supabase.rpc('deduct_interaction', {
        p_user_id: demoUser.id,
        p_operation_type: 'test_interaction',
        p_metadata: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      });

      if (deductionResult && deductionResult.length > 0) {
        const result = deductionResult[0];
        console.log('✅ Dedución de interacción exitosa:', {
          success: result.success,
          balance_after: result.balance_after,
          message: result.message
        });
      }
    } catch (deductionError) {
      console.warn('⚠️ Error en deducción de prueba:', deductionError.message);
    }

    // 5. Verificar balance después de la prueba
    console.log('\n📊 Verificando balance después de prueba...');
    try {
      const { data: finalBalance } = await supabase.rpc('get_user_balance', {
        p_user_id: demoUser.id
      });

      if (finalBalance && finalBalance.length > 0) {
        const balance = finalBalance[0];
        console.log('📈 Balance final:', {
          disponibles: balance.available_interactions,
          usadas_hoy: balance.consumed_today,
          limite_diario: balance.daily_limit
        });
        
        const interactionsUsed = balance.consumed_today;
        if (interactionsUsed > 0) {
          console.log('✅ ¡SISTEMA DE INTERACCIONES FUNCIONANDO!');
          console.log(`   Se han usado ${interactionsUsed} interacciones correctamente`);
        } else {
          console.log('⚠️  Las interacciones no se están actualizando');
        }
      }
    } catch (finalBalanceError) {
      console.warn('⚠️ Error obteniendo balance final:', finalBalanceError.message);
    }

    console.log('\n🎉 Configuración completada');
    console.log('💡 Ahora puedes probar las interacciones en el dashboard:');
    console.log('   http://localhost:3000/dashboard/admin/users');

  } catch (error) {
    console.error('❌ Error en la configuración:', error);
  }
}

// Ejecutar configuración
setupDemoUserInteractions()
  .then(() => {
    console.log('\n🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });