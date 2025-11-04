const { createClient } = require('@supabase/supabase-js');

// Validar variables de entorno de Supabase
if (!process.env.SUPABASE_URL && process.env.DEMO_MODE !== 'true') {
  console.error('❌ FATAL: SUPABASE_URL no está configurado');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.warn('⚠️ Continuando en modo demo sin Supabase');
    process.env.DEMO_MODE = 'true';
  }
}

if (!process.env.SUPABASE_ANON_KEY && process.env.DEMO_MODE !== 'true') {
  console.error('❌ FATAL: SUPABASE_ANON_KEY no está configurado');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.warn('⚠️ Continuando en modo demo sin Supabase');
    process.env.DEMO_MODE = 'true';
  }
}

let supabase;

// Modo demo - no usar base de datos real
if (process.env.DEMO_MODE === 'true') {
  console.log('🎭 Modo demo activado - usando mock de Supabase');
  
  // Crear un mock de Supabase para modo demo
  supabase = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          limit: () => ({
            single: async () => ({ data: null, error: null })
          })
        }),
        limit: () => ({
          single: async () => ({ data: null, error: null })
        }),
        then: async (resolve) => resolve({ data: [], error: null })
      }),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null })
    }),
    rpc: async () => ({ data: null, error: null })
  };
} else {
  // Crear cliente de Supabase
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false
      }
    }
  );

  // Verificar conexión
  supabase.from('users').select('count').limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Error conectando a Supabase:', error.message);
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
      } else {
        console.log('✅ Conexión a Supabase establecida');
      }
    })
    .catch((error) => {
      console.error('❌ Error conectando a Supabase:', error);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    });
}

module.exports = { supabase };
