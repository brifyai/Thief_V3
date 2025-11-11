const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Crear las tablas principales de una en una
const createTables = async () => {
  try {
    console.log('📋 Creando tabla: news_humanized...');
    
    const { error: error1 } = await supabase
      .from('news_humanized')
      .select('id')
      .limit(1);
    
    if (error1 && error1.message.includes('relation "news_humanized" does not exist')) {
      // La tabla no existe, crearla con SQL directo
      const { error: createError } = await supabase.rpc('execute_sql', {
        query: `
          CREATE TABLE news_humanized (
            id SERIAL PRIMARY KEY,
            original_news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            humanized_content TEXT NOT NULL,
            url TEXT NOT NULL,
            source TEXT NOT NULL,
            domain TEXT NOT NULL,
            author TEXT,
            published_at TIMESTAMP,
            scraped_at TIMESTAMP,
            humanized_at TIMESTAMP DEFAULT NOW(),
            tone TEXT DEFAULT 'professional',
            style TEXT DEFAULT 'detailed', 
            complexity TEXT DEFAULT 'intermediate',
            target_audience TEXT DEFAULT 'general',
            preserve_facts BOOLEAN DEFAULT true,
            max_length INTEGER DEFAULT 500,
            original_readability_score REAL,
            humanized_readability_score REAL,
            readability_improvement REAL,
            word_count_original INTEGER,
            word_count_humanized INTEGER,
            content_similarity REAL,
            ai_model_used TEXT DEFAULT 'GLM-4.6',
            humanization_cost DECIMAL(10, 6),
            tokens_used INTEGER,
            status TEXT DEFAULT 'active',
            is_ready_for_use BOOLEAN DEFAULT true,
            review_status TEXT DEFAULT 'approved',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            created_by TEXT,
            CONSTRAINT unique_humanization UNIQUE(original_news_id, tone, style, complexity)
          );
          
          CREATE INDEX idx_humanized_original_news_id ON news_humanized(original_news_id);
          CREATE INDEX idx_humanized_status ON news_humanized(status);
          CREATE INDEX idx_humanized_ready_for_use ON news_humanized(is_ready_for_use);
          CREATE INDEX idx_humanized_created_at ON news_humanized(created_at);
        `
      });
      
      if (createError) {
        console.error('❌ Error creando news_humanized:', createError.message);
      } else {
        console.log('✅ Tabla news_humanized creada');
      }
    } else {
      console.log('✅ Tabla news_humanized ya existe');
    }
    
    console.log('📋 Creando tabla: news_humanization_versions...');
    
    const { error: error2 } = await supabase
      .from('news_humanization_versions')
      .select('id')
      .limit(1);
    
    if (error2 && error2.message.includes('relation "news_humanization_versions" does not exist')) {
      const { error: createError } = await supabase.rpc('execute_sql', {
        query: `
          CREATE TABLE news_humanization_versions (
            id SERIAL PRIMARY KEY,
            humanized_news_id INTEGER REFERENCES news_humanized(id) ON DELETE CASCADE,
            version_number INTEGER NOT NULL,
            humanized_content TEXT NOT NULL,
            tone TEXT NOT NULL,
            style TEXT NOT NULL,
            complexity TEXT NOT NULL,
            target_audience TEXT DEFAULT 'general',
            readability_score REAL,
            word_count INTEGER,
            change_percentage REAL,
            created_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT unique_version UNIQUE(humanized_news_id, version_number)
          );
          
          CREATE INDEX idx_versions_humanized_news_id ON news_humanization_versions(humanized_news_id);
        `
      });
      
      if (createError) {
        console.error('❌ Error creando news_humanization_versions:', createError.message);
      } else {
        console.log('✅ Tabla news_humanization_versions creada');
      }
    } else {
      console.log('✅ Tabla news_humanization_versions ya existe');
    }
    
    console.log('📋 Creando tabla: user_selected_humanized_news...');
    
    const { error: error3 } = await supabase
      .from('user_selected_humanized_news')
      .select('id')
      .limit(1);
    
    if (error3 && error3.message.includes('relation "user_selected_humanized_news" does not exist')) {
      const { error: createError } = await supabase.rpc('execute_sql', {
        query: `
          CREATE TABLE user_selected_humanized_news (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            humanized_news_id INTEGER REFERENCES news_humanized(id) ON DELETE CASCADE,
            selection_type TEXT DEFAULT 'manual',
            selected_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, humanized_news_id)
          );
          
          CREATE INDEX idx_selected_user_id ON user_selected_humanized_news(user_id);
        `
      });
      
      if (createError) {
        console.error('❌ Error creando user_selected_humanized_news:', createError.message);
      } else {
        console.log('✅ Tabla user_selected_humanized_news creada');
      }
    } else {
      console.log('✅ Tabla user_selected_humanized_news ya existe');
    }
    
    console.log('📋 Insertando categorías por defecto...');
    
    // Insertar categorías por defecto
    const categories = [
      { name: 'Tecnología', description: 'Noticias sobre tecnología e innovación', color: '#3B82F6' },
      { name: 'Economía', description: 'Noticias económicas y financieras', color: '#10B981' },
      { name: 'Política', description: 'Noticias políticas y gubernamentales', color: '#F59E0B' },
      { name: 'Deportes', description: 'Noticias deportivas', color: '#EF4444' },
      { name: 'Cultura', description: 'Noticias culturales y entretenimiento', color: '#8B5CF6' },
      { name: 'Internacional', description: 'Noticias internacionales', color: '#06B6D4' },
      { name: 'Ciencia', description: 'Noticias científicas', color: '#84CC16' },
      { name: 'Sociedad', description: 'Noticias sociales y comunitarias', color: '#F97316' }
    ];
    
    for (const category of categories) {
      const { error: insertError } = await supabase
        .from('news_humanized_categories')
        .upsert(category, { onConflict: 'name' });
        
      if (insertError && !insertError.message.includes('duplicate key')) {
        console.error(`❌ Error insertando categoría ${category.name}:`, insertError.message);
      }
    }
    
    console.log('✅ Categorías insertadas');
    console.log('🎉 ¡Base de datos de noticias humanizadas configurada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
};

createTables();