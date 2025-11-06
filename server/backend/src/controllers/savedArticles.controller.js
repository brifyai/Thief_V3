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
    const { data: article } = await supabase
      .from('news')
      .select('*')
      .eq('id', parseInt(scraping_result_id))
      .single();

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Artículo no encontrado'
      });
    }

    // Verificar si ya está guardado
    const { data: existing } = await supabase
      .from('saved_articles')
      .select('*')
      .eq('user_id', userId)
      .eq('scraping_result_id', parseInt(scraping_result_id))
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Este artículo ya está guardado'
      });
    }

    // 🔹 NUEVO: Copiar contenido para preservación
    const originalUrl = article.url;

    // Guardar artículo CON contenido copiado
    const { data: savedArticle } = await supabase
      .from('saved_articles')
      .insert({
        user_id: userId,
        scraping_result_id: parseInt(scraping_result_id),
        notes: notes || null,
        tags: tags || [],
        // 🔹 Copiar contenido
        saved_title: article.title,
        saved_content: article.content,
        saved_summary: article.summary,
        saved_domain: article.domain,
        saved_category: article.category,
        saved_url: originalUrl
      })
      .select()
      .single();

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

    // Modo demo - retornar datos simulados
    if (process.env.DEMO_MODE === 'true') {
      const demoArticles = [
        {
          id: 1,
          user_id: userId,
          scraping_result_id: 1,
          notes: 'Artículo interesante sobre tecnología',
          tags: ['tecnología', 'IA'],
          is_read: false,
          created_at: new Date(),
          updated_at: new Date(),
          title: 'Nuevos avances en Inteligencia Artificial',
          summary: 'Los últimos desarrollos en IA están revolucionando la industria tecnológica...',
          content: 'Contenido completo del artículo sobre IA...',
          domain: 'tech-news.example',
          category: 'tecnología',
          url: 'https://tech-news.example/articulo-ia',
          scraped_at: new Date(),
          original_deleted: false
        },
        {
          id: 2,
          user_id: userId,
          scraping_result_id: 2,
          notes: 'Noticia importante sobre economía',
          tags: ['economía', 'mercados'],
          is_read: true,
          created_at: new Date(),
          updated_at: new Date(),
          title: 'Los mercados financieros ante la incertidumbre',
          summary: 'Los expertos analizan el comportamiento de los mercados ante la situación económica global...',
          content: 'Contenido completo del artículo sobre economía...',
          domain: 'financial-news.example',
          category: 'economía',
          url: 'https://financial-news.example/noticia-mercados',
          scraped_at: new Date(),
          original_deleted: false
        }
      ];

      return res.json({
        success: true,
        data: demoArticles,
        pagination: {
          currentPage: parseInt(page),
          totalPages: 1,
          totalCount: demoArticles.length,
          limit: parseInt(limit)
        }
      });
    }

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

    // Modo real con Supabase - obtener artículos guardados
    console.log('✅ Usando Supabase real para artículos guardados');
    
    // Construir consulta base
    let query = supabase
      .from('saved_articles')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .range(skip, skip + limitNum - 1)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (where.is_read !== undefined) {
      query = query.eq('is_read', where.is_read);
    }
    if (where.tags) {
      query = query.contains('tags', [where.tags]);
    }

    const { data: savedArticles, count: totalCount } = await query;

    // 🔹 NUEVO: Usar contenido copiado si el original fue eliminado
    const formattedArticles = (savedArticles || []).map(article => ({
      id: article.id,
      user_id: article.user_id,
      scraping_result_id: article.scraping_result_id,
      notes: article.notes,
      tags: article.tags,
      is_read: article.is_read,
      created_at: article.created_at,
      updated_at: article.updated_at,
      // Usar contenido copiado
      title: article.saved_title || 'Sin título',
      summary: article.saved_summary,
      content: article.saved_content,
      domain: article.saved_domain,
      category: article.saved_category,
      url: article.saved_url,
      scraped_at: article.created_at,
      // Indicar si el original fue eliminado
      original_deleted: false
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
    const { data: savedArticle } = await supabase
      .from('saved_articles')
      .select('*')
      .eq('id', parseInt(id))
      .eq('user_id', userId)
      .single();

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

    const { data: updated } = await supabase
      .from('saved_articles')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

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
    const { data: savedArticle } = await supabase
      .from('saved_articles')
      .select('*')
      .eq('id', parseInt(id))
      .eq('user_id', userId)
      .single();

    if (!savedArticle) {
      return res.status(404).json({
        success: false,
        error: 'Artículo guardado no encontrado'
      });
    }

    // Eliminar
    await supabase
      .from('saved_articles')
      .delete()
      .eq('id', parseInt(id));

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

    // Modo real con Supabase
    console.log('✅ Usando Supabase real para estadísticas de artículos guardados');
    
    const { data: allArticles } = await supabase
      .from('saved_articles')
      .select('*')
      .eq('user_id', userId);

    const total = allArticles?.length || 0;
    const unread = allArticles?.filter(a => a.is_read === false).length || 0;

    // Extraer tags únicos
    const tagsSet = new Set();
    allArticles?.forEach(item => {
      item.tags?.forEach(tag => tagsSet.add(tag));
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
