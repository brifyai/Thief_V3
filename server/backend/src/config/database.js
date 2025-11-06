const { createClient } = require('@supabase/supabase-js');

// Determinar si estamos en modo demo
const isDemoMode = process.env.DEMO_MODE === 'true';

// Validar variables de entorno de Supabase solo si no estamos en modo demo
if (!isDemoMode) {
  if (!process.env.SUPABASE_URL) {
    console.error('❌ FATAL: SUPABASE_URL no está configurado');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️ SUPABASE_URL no configurado - pero respetando DEMO_MODE=false');
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ FATAL: SUPABASE_SERVICE_ROLE_KEY no está configurado');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY no configurado - pero respetando DEMO_MODE=false');
    }
  }
}

let supabase;

// Modo demo - no usar base de datos real
if (isDemoMode) {
  console.log('🎭 Modo demo activado - usando mock de Supabase');
  
  // Crear un mock de Supabase para modo demo con métodos completos
  const createMockQuery = () => ({
    eq: () => createMockQuery(),
    gte: () => createMockQuery(),
    lte: () => createMockQuery(),
    gt: () => createMockQuery(),
    lt: () => createMockQuery(),
    in: () => createMockQuery(),
    not: () => createMockQuery(),
    is: () => createMockQuery(),
    like: () => createMockQuery(),
    ilike: () => createMockQuery(),
    order: () => createMockQuery(),
    limit: () => createMockQuery(),
    single: async () => ({ data: null, error: null }),
    then: async (resolve) => resolve({ data: [], error: null }),
    select: (columns) => createMockQuery()
  });
  
  supabase = {
    from: (table) => ({
      select: (columns) => createMockQuery(),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null }),
      eq: () => createMockQuery(),
      gte: () => createMockQuery(),
      lte: () => createMockQuery(),
      gt: () => createMockQuery(),
      lt: () => createMockQuery(),
      in: () => createMockQuery(),
      not: () => createMockQuery(),
      is: () => createMockQuery(),
      like: () => createMockQuery(),
      ilike: () => createMockQuery(),
      order: () => createMockQuery(),
      limit: () => createMockQuery(),
      single: async () => ({ data: null, error: null })
    }),
    rpc: async () => ({ data: null, error: null })
  };
} else {
  // Crear cliente de Supabase con SERVICE_ROLE_KEY para acceso completo
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
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

module.exports = { supabase, isDemoMode };
