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
    
    // Obtener dominios seleccionados por el usuario
    const userSelections = await prisma.userUrlSelection.findMany({
      where: { user_id: userId },
      include: {
        public_url: {
          select: {
            domain: true,
            is_active: true
          }
        }
      }
    });

    const selectedDomains = userSelections
      .filter(s => s.public_url.is_active)
      .map(s => s.public_url.domain);

    // Si no tiene dominios seleccionados, retornar vacío
    if (selectedDomains.length === 0) {
      return res.json({
        success: true,
        data: {
          hasContent: false,
          message: 'No tienes fuentes de noticias seleccionadas',
          sections: []
        }
      });
    }

    // Filtro base: solo noticias de dominios seleccionados
    const baseFilter = {
      success: true,
      domain: { in: selectedDomains }
    };

    // Usar caché (5 minutos)
    const cacheKey = `highlights:${userId}`;
    const highlights = await cacheService.getCached(
      cacheKey,
      async () => {
        // 1. ÚLTIMAS NOTICIAS (últimas 24 horas)
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);

        const latestNews = await prisma.scraping_results.findMany({
          where: {
            ...baseFilter,
            scraped_at: { gte: last24Hours }
          },
          orderBy: { scraped_at: 'desc' },
          take: 6,
          select: {
            id: true,
            title: true,
            summary: true,
            category: true,
            domain: true,
            scraped_at: true,
            content_length: true
          }
        });

        // 2. MÁS LEÍDAS (noticias largas y recientes = más completas)
        const mostRead = await prisma.scraping_results.findMany({
          where: {
            ...baseFilter,
            content_length: { gte: 1000 }, // Al menos 1000 caracteres
            scraped_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Última semana
          },
          orderBy: [
            { content_length: 'desc' },
            { scraped_at: 'desc' }
          ],
          take: 6,
          select: {
            id: true,
            title: true,
            summary: true,
            category: true,
            domain: true,
            scraped_at: true,
            content_length: true
          }
        });

        // 3. POR CATEGORÍA (top 3 categorías con más noticias)
        const categoryStats = await prisma.scraping_results.groupBy({
          by: ['category'],
          where: {
            ...baseFilter,
            category: { not: null }
          },
          _count: { category: true },
          orderBy: { _count: { category: 'desc' } },
          take: 3
        });

        const byCategory = await Promise.all(
          categoryStats.map(async (stat) => {
            const news = await prisma.scraping_results.findMany({
              where: {
                ...baseFilter,
                category: stat.category
              },
              orderBy: { scraped_at: 'desc' },
              take: 4,
              select: {
                id: true,
                title: true,
                summary: true,
                category: true,
                domain: true,
                scraped_at: true
              }
            });

            return {
              category: stat.category,
              count: stat._count.category,
              news
            };
          })
        );

        // 4. TRENDING (noticias recientes con títulos más largos = más específicas)
        const trending = await prisma.scraping_results.findMany({
          where: {
            ...baseFilter,
            scraped_at: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // Últimas 48 horas
            title: { not: 'Sin título' }
          },
          orderBy: { scraped_at: 'desc' },
          take: 100 // Obtener más para filtrar
        });

        // Filtrar las que tienen títulos más informativos (más de 30 caracteres)
        const trendingFiltered = trending
          .filter(n => n.title.length > 30)
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
        const recommended = await prisma.scraping_results.findMany({
          where: {
            ...baseFilter,
            summary: { not: null },
            scraped_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Última semana
          },
          orderBy: { scraped_at: 'desc' },
          take: 6,
          select: {
            id: true,
            title: true,
            summary: true,
            category: true,
            domain: true,
            scraped_at: true
          }
        });

        return {
          latestNews,
          mostRead,
          byCategory,
          trending: trendingFiltered,
          recommended
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

    // Obtener dominios seleccionados
    const userSelections = await prisma.userUrlSelection.findMany({
      where: { user_id: userId },
      include: {
        public_url: {
          select: { domain: true, is_active: true }
        }
      }
    });

    const selectedDomains = userSelections
      .filter(s => s.public_url.is_active)
      .map(s => s.public_url.domain);

    if (selectedDomains.length === 0) {
      return res.json({
        success: true,
        data: {
          total: 0,
          today: 0,
          thisWeek: 0,
          categories: 0
        }
      });
    }

    const baseFilter = {
      success: true,
      domain: { in: selectedDomains }
    };

    // Usar caché (1 minuto)
    const cacheKey = `quick_stats:${userId}`;
    const stats = await cacheService.getCached(
      cacheKey,
      async () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [total, todayCount, weekCount, categories] = await Promise.all([
          prisma.scraping_results.count({ where: baseFilter }),
          prisma.scraping_results.count({
            where: {
              ...baseFilter,
              scraped_at: { gte: today }
            }
          }),
          prisma.scraping_results.count({
            where: {
              ...baseFilter,
              scraped_at: { gte: thisWeek }
            }
          }),
          prisma.scraping_results.findMany({
            where: {
              ...baseFilter,
              category: { not: null }
            },
            select: { category: true },
            distinct: ['category']
          })
        ]);

        return {
          total,
          today: todayCount,
          thisWeek: weekCount,
          categories: categories.length
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
