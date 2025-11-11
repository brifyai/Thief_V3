const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkNewsSchema() {
  try {
    console.log('🔍 Verificando esquema de la tabla news...');
    
    // Obtener una muestra de datos para ver la estructura
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (data.length === 0) {
      console.log('⚠️  No hay datos en la tabla news');
      return;
    }
    
    const sample = data[0];
    console.log('📋 Estructura de la tabla news:');
    console.log('Campos encontrados:');
    
    Object.keys(sample).forEach(key => {
      const value = sample[key];
      const type = typeof value;
      const preview = value !== null && value !== undefined 
        ? (type === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value)
        : 'NULL';
      
      console.log(`  - ${key}: ${type} = "${preview}"`);
    });
    
    // Verificar específicamente el campo status
    console.log(`\n🏷️  Campo status: ${sample.hasOwnProperty('status') ? 'EXISTS' : 'NOT FOUND'}`);
    if (sample.hasOwnProperty('status')) {
      console.log(`   Valor: "${sample.status}"`);
    }
    
    // Verificar otros campos importantes
    const importantFields = ['published_at', 'created_at', 'category', 'title', 'content'];
    console.log('\n📊 Campos importantes:');
    importantFields.forEach(field => {
      const exists = sample.hasOwnProperty(field);
      const value = exists ? sample[field] : 'N/A';
      console.log(`  - ${field}: ${exists ? '✅' : '❌'} = ${value !== null ? value : 'NULL'}`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkNewsSchema();