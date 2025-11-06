const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkNews() {
  try {
    console.log('🔍 Verificando tabla news...');
    const { data, error } = await supabase
      .from('news')
      .select('id, title, source, category')
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Noticias encontradas:', data.length);
      data.forEach((news, i) => {
        console.log(`   ${i+1}. ${news.title} (${news.source})`);
      });
    }
  } catch (err) {
    console.error('❌ Error general:', err.message);
  }
}

checkNews();