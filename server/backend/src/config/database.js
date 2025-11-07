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
  
  // Almacenamiento en memoria para modo demo
  const demoUsers = {};
  let userIdCounter = 1;
  
  // Crear un mock de Supabase para modo demo con métodos completos
  const createMockQuery = (table, context = {}) => ({
    eq: (column, value) => {
      return createMockQuery(table, { ...context, filters: { ...context.filters, [column]: value } });
    },
    gte: (column, value) => createMockQuery(table, { ...context, filters: { ...context.filters, [column]: { gte: value } } }),
    lte: (column, value) => createMockQuery(table, { ...context, filters: { ...context.filters, [column]: { lte: value } } }),
    gt: (column, value) => createMockQuery(table, { ...context, filters: { ...context.filters, [column]: { gt: value } } }),
    lt: (column, value) => createMockQuery(table, { ...context, filters: { ...context.filters, [column]: { lt: value } } }),
    in: (column, values) => createMockQuery(table, { ...context, filters: { ...context.filters, [column]: { in: values } } }),
    not: (column, value) => createMockQuery(table, { ...context, filters: { ...context.filters, [column]: { not: value } } }),
    is: (column, value) => createMockQuery(table, { ...context, filters: { ...context.filters, [column]: { is: value } } }),
    like: (column, value) => createMockQuery(table, { ...context, filters: { ...context.filters, [column]: { like: value } } }),
    ilike: (column, value) => createMockQuery(table, { ...context, filters: { ...context.filters, [column]: { ilike: value } } }),
    order: (column, options) => createMockQuery(table, { ...context, order: { column, ...options } }),
    limit: (count) => createMockQuery(table, { ...context, limit: count }),
    single: async () => {
      if (table === 'users' && context.filters?.email) {
        const user = demoUsers[context.filters.email];
        return { data: user || null, error: user ? null : { message: 'No rows found' } };
      }
      return { data: null, error: null };
    },
    then: async (resolve) => resolve({ data: [], error: null }),
    select: (columns) => createMockQuery(table, { ...context, columns })
  });
  
  supabase = {
    from: (table) => {
      let pendingInsert = null;
      
      return {
        select: (columns) => createMockQuery(table, { columns }),
        insert: (records) => {
          pendingInsert = records;
          return {
            select: async () => {
              if (table === 'users' && pendingInsert && pendingInsert.length > 0) {
                const record = pendingInsert[0];
                // Verificar si el usuario ya existe
                if (demoUsers[record.email]) {
                  return {
                    data: null,
                    error: {
                      code: '23505',
                      message: 'duplicate key value violates unique constraint "users_email_key"',
                      details: 'Key (email)=(' + record.email + ') already exists.',
                      hint: 'Ensure the email is unique.'
                    }
                  };
                }
                // Crear nuevo usuario
                const newUser = {
                  id: userIdCounter++,
                  email: record.email,
                  password: record.password,
                  name: record.name || null,
                  role: record.role || 'user',
                  is_active: record.is_active !== false,
                  created_at: record.created_at || new Date().toISOString(),
                  updated_at: record.updated_at || new Date().toISOString(),
                  last_login: null
                };
                demoUsers[record.email] = newUser;
                console.log('✅ [DEMO] Usuario creado:', { id: newUser.id, email: newUser.email });
                return { data: [newUser], error: null };
              }
              return { data: null, error: null };
            }
          };
        },
        update: async (data) => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
        eq: (column, value) => createMockQuery(table, { filters: { [column]: value } }),
        gte: (column, value) => createMockQuery(table, { filters: { [column]: { gte: value } } }),
        lte: (column, value) => createMockQuery(table, { filters: { [column]: { lte: value } } }),
        gt: (column, value) => createMockQuery(table, { filters: { [column]: { gt: value } } }),
        lt: (column, value) => createMockQuery(table, { filters: { [column]: { lt: value } } }),
        in: (column, values) => createMockQuery(table, { filters: { [column]: { in: values } } }),
        not: (column, value) => createMockQuery(table, { filters: { [column]: { not: value } } }),
        is: (column, value) => createMockQuery(table, { filters: { [column]: { is: value } } }),
        like: (column, value) => createMockQuery(table, { filters: { [column]: { like: value } } }),
        ilike: (column, value) => createMockQuery(table, { filters: { [column]: { ilike: value } } }),
        order: (column, options) => createMockQuery(table, { order: { column, ...options } }),
        limit: (count) => createMockQuery(table, { limit: count }),
        single: async () => ({ data: null, error: null })
      };
    },
    rpc: async () => ({ data: null, error: null }),
    auth: {
      admin: {
        createUser: async (userData) => {
          // Mock: generar UUID simulado
          const mockUUID = 'mock-' + Math.random().toString(36).substr(2, 9);
          return {
            data: {
              user: {
                id: mockUUID,
                email: userData.email,
                user_metadata: userData.user_metadata || {}
              }
            },
            error: null
          };
        }
      }
    }
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
