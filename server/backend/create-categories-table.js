const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function createCategoriesTable() {
  try {
    console.log('📋 Creando tabla: news_humanized_categories...');
    
    const { error: createError } = await supabase.rpc('execute_sql', {
      query: `
        CREATE TABLE news_humanized_categories (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          color TEXT DEFAULT '#3B82F6',
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_categories_name ON news_humanized_categories(name);
      `
    });
    
    if (createError) {
      console.error('❌ Error creando news_humanized_categories:', createError.message);
    } else {
      console.log('✅ Tabla news_humanized_categories creada');
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
      } else {
        console.log(`✅ Categoría ${category.name} insertada`);
      }
    }
    
    console.log('🎉 ¡Tabla de categorías creada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
};

createCategoriesTable();