const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkNewsStatus() {
  try {
    console.log('🔍 Verificando noticias en Supabase...');
    
    const { data, error } = await supabase
      .from('news')
      .select('*');
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`📊 Total noticias encontradas: ${data.length}`);
    
    if (data.length === 0) {
      console.log('⚠️  No hay noticias en la base de datos');
      return;
    }
    
    data.forEach((news, i) => {
      console.log(`\n${i+1}. 📰 ID: ${news.id}`);
      console.log(`   Título: ${news.title?.substring(0, 60)}...`);
      console.log(`   Estado: "${news.status}"`);
      console.log(`   Categoría: ${news.category || 'N/A'}`);
      console.log(`   Creada: ${news.created_at}`);
    });
    
    // Verificar estados únicos
    const estadosUnicos = [...new Set(data.map(n => n.status))];
    console.log(`\n🏷️  Estados encontrados: ${estadosUnicos.join(', ')}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkNewsStatus();