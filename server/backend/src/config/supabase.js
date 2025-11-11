const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const demoMode = process.env.DEMO_MODE === 'true';

// Verificar si estamos en modo demo o si faltan credenciales
if (demoMode || !supabaseUrl || !supabaseKey) {
  console.warn('🎭 Modo demo activado - usando mock de Supabase');
  
  // Crear un mock de Supabase para modo demo
  const mockSupabase = {
    from: (table) => ({
      select: function() {
        return {
          eq: () => ({
            order: () => ({
              limit: () => ({
                data: [],
                error: null
              })
            }),
            single: () => ({ data: null, error: null })
          }),
          single: () => ({ data: null, error: null }),
          data: [],
          error: null
        };
      },
      insert: function(data) {
        return {
          select: () => ({
            single: () => ({
              data: { id: `demo-${Date.now()}`, ...data },
              error: null
            })
          })
        };
      },
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null })
    }),
    auth: {
      getUser: () => ({ data: { user: null }, error: null }),
      signInWithPassword: () => ({ data: { user: null, session: null }, error: null }),
      signOut: () => ({ error: null })
    }
  };
  
  module.exports = mockSupabase;
} else {
  console.log('✅ Usando Supabase real');
  
  // Crear cliente de Supabase con la service role key para operaciones de backend
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  module.exports = supabase;
}
