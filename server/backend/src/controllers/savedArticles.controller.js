const { supabase } = require('../config/database');

/**
 * Controlador para gestionar noticias guardadas/favoritas
 */

/**
 * Guardar una noticia como favorita
 * POST /api/saved-articles
 */
const saveArticle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { scraping_result_id, notes, tags } = req.body;

    if (!scraping_result_id) {
      return res.status(400).json({
        success: false,
        error: 'scraping_result_id es requerido'
      });
    }

    // Verificar que el artículo existe
    const article = await prisma.scraping_results.findUnique({
      where: { id: parseInt(scraping_result_id) },
      include: {
        saved_urls: {
          select: { url: true }
        },
        public_url: {
          select: { url: true }
        }
      }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Artículo no encontrado'
      });
    }

    // Verificar si ya está guardado
    const existing = await prisma.savedArticle.findFirst({
      where: {
        user_id: userId,
        scraping_result_id: parseInt(scraping_result_id)
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Este artículo ya está guardado'
      });
    }

    // 🔹 NUEVO: Copiar contenido para preservación
    const originalUrl = article.saved_urls?.url || article.public_url?.url || null;

    // Guardar artículo CON contenido copiado
    const savedArticle = await prisma.savedArticle.create({
      data: {
        user_id: userId,
        scraping_result_id: parseInt(scraping_result_id),
        notes: notes || null,
        tags: tags || [],
        // 🔹 Copiar contenido
        saved_title: article.title,
        saved_content: article.cleaned_content || article.content,
        saved_summary: article.summary,
        saved_domain: article.domain,
        saved_category: article.category,
        saved_url: originalUrl
      },
      include: {
        scraping_result: {
          select: {
            id: true,
            title: true,
            summary: true,
            domain: true,
            category: true,
            scraped_at: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: savedArticle
    });

  } catch (error) {
    console.error('Error guardando artículo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

/**
 * Obtener todas las noticias guardadas del usuario
 * GET /api/saved-articles
 */
const getSavedArticles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { is_read, tag, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const where = {
      user_id: userId
    };

    if (is_read !== undefined) {
      where.is_read = is_read === 'true';
    }

    if (tag) {
      where.tags = {
        has: tag
      };
    }

    // Obtener artículos guardados
    const [savedArticles, totalCount] = await Promise.all([
      prisma.savedArticle.findMany({
        where,
        include: {
          scraping_result: {
            select: {
              id: true,
              title: true,
              summary: true,
              cleaned_content: true,
              domain: true,
              category: true,
              region: true,
              scraped_at: true,
              public_url: {
                select: {
                  name: true,
                  url: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.savedArticle.count({ where })
    ]);

    // 🔹 NUEVO: Usar contenido copiado si el original fue eliminado
    const formattedArticles = savedArticles.map(article => ({
      id: article.id,
      user_id: article.user_id,
      scraping_result_id: article.scraping_result_id,
      notes: article.notes,
      tags: article.tags,
      is_read: article.is_read,
      created_at: article.created_at,
      updated_at: article.updated_at,
      // Usar contenido copiado si el original fue eliminado
      title: article.scraping_result?.title || article.saved_title || 'Sin título',
      summary: article.scraping_result?.summary || article.saved_summary,
      content: article.scraping_result?.cleaned_content || article.saved_content,
      domain: article.scraping_result?.domain || article.saved_domain,
      category: article.scraping_result?.category || article.saved_category,
      url: article.scraping_result?.public_url?.url || article.saved_url,
      scraped_at: article.scraping_result?.scraped_at || article.created_at,
      // Indicar si el original fue eliminado
      original_deleted: !article.scraping_result
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: formattedArticles,  // 🔹 Usar artículos formateados
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('Error obteniendo artículos guardados:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

/**
 * Actualizar una noticia guardada (notas, tags, marcar como leída)
 * PUT /api/saved-articles/:id
 */
const updateSavedArticle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { notes, tags, is_read } = req.body;

    // Verificar que el artículo guardado pertenece al usuario
    const savedArticle = await prisma.savedArticle.findFirst({
      where: {
        id: parseInt(id),
        user_id: userId
      }
    });

    if (!savedArticle) {
      return res.status(404).json({
        success: false,
        error: 'Artículo guardado no encontrado'
      });
    }

    // Actualizar
    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;
    if (is_read !== undefined) updateData.is_read = is_read;

    const updated = await prisma.savedArticle.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        scraping_result: {
          select: {
            id: true,
            title: true,
            summary: true,
            domain: true,
            category: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updated
    });

  } catch (error) {
    console.error('Error actualizando artículo guardado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

/**
 * Eliminar una noticia guardada
 * DELETE /api/saved-articles/:id
 */
const deleteSavedArticle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verificar que el artículo guardado pertenece al usuario
    const savedArticle = await prisma.savedArticle.findFirst({
      where: {
        id: parseInt(id),
        user_id: userId
      }
    });

    if (!savedArticle) {
      return res.status(404).json({
        success: false,
        error: 'Artículo guardado no encontrado'
      });
    }

    // Eliminar
    await prisma.savedArticle.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Artículo eliminado de guardados'
    });

  } catch (error) {
    console.error('Error eliminando artículo guardado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

/**
 * Obtener estadísticas de artículos guardados
 * GET /api/saved-articles/stats
 */
const getSavedArticlesStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [total, unread, allTags] = await Promise.all([
      prisma.savedArticle.count({
        where: { user_id: userId }
      }),
      prisma.savedArticle.count({
        where: { user_id: userId, is_read: false }
      }),
      prisma.savedArticle.findMany({
        where: { user_id: userId },
        select: { tags: true }
      })
    ]);

    // Extraer tags únicos
    const tagsSet = new Set();
    allTags.forEach(item => {
      item.tags.forEach(tag => tagsSet.add(tag));
    });

    res.json({
      success: true,
      data: {
        total,
        unread,
        read: total - unread,
        tags: Array.from(tagsSet)
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

module.exports = {
  saveArticle,
  getSavedArticles,
  updateSavedArticle,
  deleteSavedArticle,
  getSavedArticlesStats
};
