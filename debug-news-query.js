const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugNewsQuery() {
  try {
    console.log('🔍 Depurando consulta de noticias...');
    console.log('📋 Variables de entorno:');
    console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)}...`);
    console.log(`   DEMO_MODE: ${process.env.DEMO_MODE}`);
    
    // Misma consulta que hace el servicio
    console.log('\n📋 Ejecutando consulta exacta del servicio...');
    
    const page = 1;
    const limit = 10;
    const status = 'published';
    const sortBy = 'published_at';
    const sortOrder = 'desc';
    
    const offset = (page - 1) * limit;
    const actualLimit = Math.min(limit, 100);
    
    console.log(`🔍 Parámetros: { page: ${page}, limit: ${limit}, status: '${status}', sortBy: '${sortBy}', sortOrder: '${sortOrder}' }`);
    console.log(`📋 Offset: ${offset}, Limit: ${actualLimit}`);
    
    let query = supabase
      .from('news')
      .select('*', { count: 'exact' });

    // Aplicar filtros - exactamente como en el servicio
    if (status && status === 'published') {
      console.log('📋 Aplicando filtro status = published');
      query = query.eq('status', 'published');
    }

    // Ordenamiento
    const validSortField = ['published_at', 'created_at', 'title'].includes(sortBy) ? sortBy : 'published_at';
    console.log('📋 Ordenando por:', validSortField, sortOrder);
    query = query.order(validSortField, { ascending: sortOrder === 'asc' });

    // Paginación
    console.log('📋 Paginación: range', offset, 'a', offset + actualLimit - 1);
    query = query.range(offset, offset + actualLimit - 1);

    console.log('🔍 Ejecutando consulta...');
    const { data: news, error, count } = await query;

    if (error) {
      console.error('❌ Error en consulta Supabase:', error);
      console.error('   Detalles:', error.details);
      console.error('   Hint:', error.hint);
      console.error('   Code:', error.code);
      return;
    }

    console.log('✅ Consulta exitosa:', {
      noticiasEncontradas: news?.length || 0,
      total: count,
      primeraNoticia: news?.[0]?.title || 'N/A'
    });

    // Mostrar primeras noticias
    if (news && news.length > 0) {
      console.log('\n📰 Noticias encontradas:');
      news.forEach((article, i) => {
        console.log(`\n${i+1}. ID: ${article.id}`);
        console.log(`   Título: ${article.title}`);
        console.log(`   Estado: "${article.status}"`);
        console.log(`   Publicada: ${article.published_at}`);
        console.log(`   Categoría: ${article.category}`);
      });
    } else {
      console.log('\n⚠️  No se encontraron noticias');
      
      // Intentar sin filtro de status
      console.log('\n🔍 Intentando sin filtro de status...');
      const { data: allNews, error: allError } = await supabase
        .from('news')
        .select('*', { count: 'exact' })
        .range(0, 9);
      
      if (allError) {
        console.error('❌ Error sin filtro:', allError);
      } else {
        console.log(`✅ Sin filtro: ${allNews?.length || 0} noticias`);
        if (allNews && allNews.length > 0) {
          console.log('   Estados encontrados:', [...new Set(allNews.map(n => n.status))].join(', '));
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('   Stack:', err.stack);
  }
}

debugNewsQuery();