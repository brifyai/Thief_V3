// ========================================
// HIGHLIGHTS CONTROLLER
// Noticias destacadas para mostrar en frontend
// ========================================

const { supabase } = require('../config/database');
const cacheService = require('../utils/cacheService');

/**
 * Obtiene noticias destacadas para mostrar en el frontend
 * GET /api/highlights
 * 
 * Retorna 5 secciones:
 * 1. Últimas Noticias (últimas 24 horas)
 * 2. Más Leídas (por content_length y recientes)
 * 3. Por Categoría (las 3 categorías más populares)
 * 4. Trending (noticias con más menciones de entidades)
 * 5. Recomendadas (noticias con mejor calidad de contenido)
 */
async function getHighlights(req, res) {
  try {
    const userId = req.user.id;
    
    // Modo real con Supabase - obtener todas las noticias
    console.log('✅ Usando Supabase real para highlights');
    
    // Usar caché (5 minutos)
    const cacheKey = `highlights:${userId}`;
    const highlights = await cacheService.getCached(
      cacheKey,
      async () => {
        // 1. ÚLTIMAS NOTICIAS (últimas 24 horas)
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);

        const { data: latestNews } = await supabase
          .from('news')
          .select('*')
          .eq('success', true)
          .gte('scraped_at', last24Hours.toISOString())
          .order('scraped_at', { ascending: false })
          .limit(6);

        // 2. MÁS LEÍDAS (noticias largas y recientes = más completas)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const { data: mostRead } = await supabase
          .from('news')
          .select('*')
          .eq('success', true)
          .gte('content_length', 1000)
          .gte('scraped_at', weekAgo.toISOString())
          .order('content_length', { ascending: false })
          .order('scraped_at', { ascending: false })
          .limit(6);

        // 3. POR CATEGORÍA (top 3 categorías con más noticias)
        const { data: allNews } = await supabase
          .from('news')
          .select('category')
          .eq('success', true)
          .not('category', 'is', null);

        // Agrupar por categoría manualmente
        const categoryCount = {};
        allNews?.forEach(news => {
          if (news.category) {
            categoryCount[news.category] = (categoryCount[news.category] || 0) + 1;
          }
        });

        const topCategories = Object.entries(categoryCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([category]) => category);

        const byCategory = await Promise.all(
          topCategories.map(async (category) => {
            const { data: news } = await supabase
              .from('news')
              .select('*')
              .eq('success', true)
              .eq('category', category)
              .order('scraped_at', { ascending: false })
              .limit(4);

            return {
              category,
              count: categoryCount[category],
              news: news || []
            };
          })
        );

        // 4. TRENDING (noticias recientes con títulos más largos = más específicas)
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const { data: trending } = await supabase
          .from('news')
          .select('*')
          .eq('success', true)
          .gte('scraped_at', twoDaysAgo.toISOString())
          .neq('title', 'Sin título')
          .order('scraped_at', { ascending: false })
          .limit(100);

        // Filtrar las que tienen títulos más informativos (más de 30 caracteres)
        const trendingFiltered = (trending || [])
          .filter(n => n.title && n.title.length > 30)
          .slice(0, 6)
          .map(n => ({
            id: n.id,
            title: n.title,
            summary: n.summary,
            category: n.category,
            domain: n.domain,
            scraped_at: n.scraped_at
          }));

        // 5. RECOMENDADAS (noticias con resumen generado = mejor calidad)
        const { data: recommended } = await supabase
          .from('news')
          .select('*')
          .eq('success', true)
          .not('summary', 'is', null)
          .gte('scraped_at', weekAgo.toISOString())
          .order('scraped_at', { ascending: false })
          .limit(6);

        return {
          latestNews: latestNews || [],
          mostRead: mostRead || [],
          byCategory,
          trending: trendingFiltered,
          recommended: recommended || []
        };
      },
      300 // 5 minutos
    );

    // Formatear respuesta
    const sections = [];

    // Sección 1: Últimas Noticias
    if (highlights.latestNews.length > 0) {
      sections.push({
        id: 'latest',
        title: '🔥 Últimas Noticias',
        subtitle: 'Publicadas en las últimas 24 horas',
        icon: '🔥',
        color: '#dc2626',
        news: highlights.latestNews
      });
    }

    // Sección 2: Más Leídas
    if (highlights.mostRead.length > 0) {
      sections.push({
        id: 'most-read',
        title: '📰 Más Completas',
        subtitle: 'Artículos con mayor contenido',
        icon: '📰',
        color: '#2563eb',
        news: highlights.mostRead
      });
    }

    // Sección 3: Por Categoría
    if (highlights.byCategory.length > 0) {
      highlights.byCategory.forEach(cat => {
        if (cat.news.length > 0) {
          sections.push({
            id: `category-${cat.category}`,
            title: `📂 ${cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}`,
            subtitle: `${cat.count} noticias disponibles`,
            icon: getCategoryIcon(cat.category),
            color: getCategoryColor(cat.category),
            news: cat.news
          });
        }
      });
    }

    // Sección 4: Trending
    if (highlights.trending.length > 0) {
      sections.push({
        id: 'trending',
        title: '📈 Tendencias',
        subtitle: 'Lo más relevante de las últimas 48 horas',
        icon: '📈',
        color: '#059669',
        news: highlights.trending
      });
    }

    // Sección 5: Recomendadas
    if (highlights.recommended.length > 0) {
      sections.push({
        id: 'recommended',
        title: '⭐ Recomendadas',
        subtitle: 'Artículos destacados por su calidad',
        icon: '⭐',
        color: '#d97706',
        news: highlights.recommended
      });
    }

    res.json({
      success: true,
      data: {
        hasContent: sections.length > 0,
        totalSections: sections.length,
        sections,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error obteniendo highlights:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
}

/**
 * Obtiene estadísticas rápidas para el dashboard
 * GET /api/highlights/stats
 */
async function getQuickStats(req, res) {
  try {
    const userId = req.user.id;
    console.log('🔍 DEBUG getQuickStats - DEMO_MODE:', process.env.DEMO_MODE);

    // Modo demo - retornar datos simulados
    if (process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === true) {
      console.log('🎭 Modo demo detectado en getQuickStats');
      const demoStats = {
        total: Math.floor(Math.random() * 200) + 100,
        today: Math.floor(Math.random() * 20) + 5,
        thisWeek: Math.floor(Math.random() * 100) + 50,
        categories: Math.floor(Math.random() * 8) + 5
      };

      return res.json({
        success: true,
        data: demoStats
      });
    }

    // Modo real con Supabase
    console.log('✅ Usando Supabase real para estadísticas');
    
    // Usar caché (1 minuto)
    const cacheKey = `quick_stats:${userId}`;
    const stats = await cacheService.getCached(
      cacheKey,
      async () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Obtener todos los datos
        const { data: allNews } = await supabase
          .from('news')
          .select('*')
          .eq('success', true);

        // Filtrar y contar manualmente
        const total = allNews?.length || 0;
        const todayCount = allNews?.filter(n => new Date(n.scraped_at) >= today).length || 0;
        const weekCount = allNews?.filter(n => new Date(n.scraped_at) >= thisWeek).length || 0;
        
        // Contar categorías únicas
        const uniqueCategories = new Set(allNews?.filter(n => n.category).map(n => n.category) || []);

        return {
          total,
          today: todayCount,
          thisWeek: weekCount,
          categories: uniqueCategories.size
        };
      },
      60 // 1 minuto
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas rápidas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
}

// Helper: Obtener icono por categoría
function getCategoryIcon(category) {
  const icons = {
    'política': '🏛️',
    'economía': '💰',
    'deportes': '⚽',
    'tecnología': '💻',
    'salud': '🏥',
    'educación': '📚',
    'entretenimiento': '🎬',
    'seguridad': '🚨',
    'medio ambiente': '🌱',
    'internacional': '🌍',
    'sociedad': '👥',
    'general': '📰'
  };
  return icons[category.toLowerCase()] || '📰';
}

// Helper: Obtener color por categoría
function getCategoryColor(category) {
  const colors = {
    'política': '#dc2626',
    'economía': '#059669',
    'deportes': '#2563eb',
    'tecnología': '#7c3aed',
    'salud': '#db2777',
    'educación': '#0891b2',
    'entretenimiento': '#ea580c',
    'seguridad': '#dc2626',
    'medio ambiente': '#16a34a',
    'internacional': '#4f46e5',
    'sociedad': '#0284c7',
    'general': '#6b7280'
  };
  return colors[category.toLowerCase()] || '#6b7280';
}

module.exports = {
  getHighlights,
  getQuickStats
};
