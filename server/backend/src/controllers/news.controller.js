const newsService = require('../services/news.service');
const { loggers } = require('../utils/logger');
const AppError = require('../utils/AppError');

class NewsController {
  /**
   * GET /api/news
   * Obtener lista de noticias con paginación y filtros
   */
  async getNews(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        category,
        domain,
        search,
        sortBy = 'published_at',
        sortOrder = 'desc',
        is_selected
      } = req.query;

      const user_id = req.user?.id || null;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        category,
        domain,
        search,
        sortBy,
        sortOrder,
        is_selected: is_selected === 'true' ? true : is_selected === 'false' ? false : undefined,
        user_id
      };

      const result = await newsService.getNews(options);

      res.json({
        success: true,
        data: result,
        message: 'News fetched successfully'
      });

    } catch (error) {
      loggers.general.error('Error in getNews controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/:id
   * Obtener noticia por ID
   */
  async getNewsById(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.user?.id || null;

      const news = await newsService.getNewsById(id, user_id);

      res.json({
        success: true,
        data: news,
        message: 'News fetched successfully'
      });

    } catch (error) {
      loggers.general.error('Error in getNewsById controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/news/:id/select
   * Seleccionar o deseleccionar noticia
   */
  async toggleNewsSelection(req, res, next) {
    try {
      const { id } = req.params;
      const { selection_type = 'manual' } = req.body;
      const user_id = req.user?.id;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      const result = await newsService.toggleNewsSelection(id, user_id, selection_type);

      res.json({
        success: true,
        data: result,
        message: result.message
      });

    } catch (error) {
      loggers.general.error('Error in toggleNewsSelection controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/selected
   * Obtener noticias seleccionadas por el usuario
   */
  async getUserSelectedNews(req, res, next) {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      const {
        page = 1,
        limit = 10,
        sortBy = 'selected_at',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const result = await newsService.getUserSelectedNews(user_id, options);

      res.json({
        success: true,
        data: result,
        message: 'Selected news fetched successfully'
      });

    } catch (error) {
      loggers.general.error('Error in getUserSelectedNews controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/news/:id/humanize
   * Humanizar noticia
   */
  async humanizeNews(req, res, next) {
    try {
      const { id } = req.params;
      const { tone, style, complexity } = req.body;
      const user_id = req.user?.id;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      const options = {
        tone: tone || 'professional',
        style: style || 'detailed',
        complexity: complexity || 'intermediate'
      };

      const result = await newsService.humanizeNews(id, user_id, options);

      res.json({
        success: true,
        data: result,
        message: 'News humanized successfully'
      });

    } catch (error) {
      loggers.general.error('Error in humanizeNews controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/news/batch-select
   * Seleccionar múltiples noticias
   */
  async batchSelectNews(req, res, next) {
    try {
      const { news_ids, selection_type = 'manual', batch_id } = req.body;
      const user_id = req.user?.id;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      if (!Array.isArray(news_ids) || news_ids.length === 0) {
        return next(new AppError('News IDs array is required', 400));
      }

      const results = [];
      const errors = [];

      for (const newsId of news_ids) {
        try {
          const result = await newsService.toggleNewsSelection(newsId, user_id, selection_type);
          results.push({ news_id: newsId, ...result });
        } catch (error) {
          errors.push({ news_id: newsId, error: error.message });
        }
      }

      res.json({
        success: true,
        data: {
          processed: news_ids.length,
          successful: results.length,
          failed: errors.length,
          results,
          errors
        },
        message: `Batch selection completed: ${results.length} successful, ${errors.length} failed`
      });

    } catch (error) {
      loggers.general.error('Error in batchSelectNews controller:', error);
      next(error);
    }
  }

  /**
   * DELETE /api/news/selected
   * Deseleccionar todas las noticias del usuario
   */
  async clearAllSelections(req, res, next) {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      // En modo demo, solo simulamos la operación
      if (require('../config/database').isDemoMode) {
        return res.json({
          success: true,
          data: { cleared_count: 0 },
          message: 'All selections cleared (demo mode)'
        });
      }

      const { supabase } = require('../config/database');
      const { error } = await supabase
        .from('news_selections')
        .delete()
        .eq('user_id', user_id);

      if (error) {
        loggers.general.error('Error clearing selections:', error);
        return next(new AppError('Error clearing selections', 500));
      }

      // Limpiar también de Redis
      try {
        const redis = require('../utils/redisSingleton');
        const key = `user_selections:${user_id}`;
        await redis.del(key);
      } catch (redisError) {
        loggers.general.warn('Error clearing selections from Redis:', redisError);
      }

      res.json({
        success: true,
        data: { cleared_count: 0 }, // En una implementación real, devolveríamos el conteo
        message: 'All selections cleared successfully'
      });

    } catch (error) {
      loggers.general.error('Error in clearAllSelections controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/stats
   * Obtener estadísticas de noticias
   */
  async getNewsStats(req, res, next) {
    try {
      const user_id = req.user?.id || null;

      // En modo demo, devolver estadísticas simuladas
      if (require('../config/database').isDemoMode) {
        const demoStats = {
          total_news: 1250,
          published_news: 980,
          pending_news: 150,
          selected_by_user: user_id ? 12 : 0,
          categories: [
            { name: 'Economía', count: 320, color: '#4caf50' },
            { name: 'Política', count: 280, color: '#f44336' },
            { name: 'Tecnología', count: 200, color: '#9c27b0' },
            { name: 'Deportes', count: 180, color: '#2196f3' },
            { name: 'Internacional', count: 150, color: '#795548' },
            { name: 'Sociedad', count: 120, color: '#607d8b' }
          ],
          sources: [
            { domain: 'emol.com', count: 180 },
            { domain: 'latercera.com', count: 160 },
            { domain: 'biobiochile.cl', count: 140 },
            { domain: 'df.cl', count: 120 },
            { domain: 'cnnchile.com', count: 100 }
          ],
          recent_activity: {
            today: 15,
            this_week: 85,
            this_month: 320
          }
        };

        return res.json({
          success: true,
          data: demoStats,
          message: 'News stats fetched successfully (demo mode)'
        });
      }

      const { supabase } = require('../config/database');

      // Estadísticas generales
      const { count: totalNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true });

      const { count: publishedNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      const { count: pendingNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Noticias seleccionadas por el usuario
      let selectedByUser = 0;
      if (user_id) {
        const { count } = await supabase
          .from('news_selections')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user_id);
        selectedByUser = count || 0;
      }

      // Estadísticas por categorías
      const { data: categoryStats } = await supabase
        .from('categories')
        .select(`
          name,
          color,
          news_categories!inner(count)
        `);

      // Estadísticas por fuentes
      const { data: sourceStats } = await supabase
        .from('news_sources')
        .select(`
          domain,
          news!inner(count)
        `)
        .eq('is_active', true);

      // Actividad reciente
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { count: todayNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .gte('scraped_at', today.toISOString());

      const { count: weekNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .gte('scraped_at', weekAgo.toISOString());

      const { count: monthNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .gte('scraped_at', monthAgo.toISOString());

      const stats = {
        total_news: totalNews || 0,
        published_news: publishedNews || 0,
        pending_news: pendingNews || 0,
        selected_by_user: selectedByUser,
        categories: categoryStats?.map(cat => ({
          name: cat.name,
          count: cat.news_categories?.length || 0,
          color: cat.color
        })) || [],
        sources: sourceStats?.map(source => ({
          domain: source.domain,
          count: source.news?.length || 0
        })) || [],
        recent_activity: {
          today: todayNews || 0,
          this_week: weekNews || 0,
          this_month: monthNews || 0
        }
      };

      res.json({
        success: true,
        data: stats,
        message: 'News stats fetched successfully'
      });

    } catch (error) {
      loggers.general.error('Error in getNewsStats controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/export
   * Exportar noticias seleccionadas
   */
  async exportNews(req, res, next) {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      const {
        format = 'json',
        include_humanized = false,
        batch_id
      } = req.query;

      // Obtener noticias seleccionadas
      const selectedNews = await newsService.getUserSelectedNews(user_id, { limit: 1000 });

      if (!selectedNews.news || selectedNews.news.length === 0) {
        return next(new AppError('No selected news to export', 404));
      }

      // Preparar datos para exportación
      const exportData = selectedNews.news.map(news => {
        const exportItem = {
          id: news.id,
          title: news.title,
          content: news.content,
          url: news.url,
          source: news.source,
          domain: news.domain,
          author: news.author,
          published_at: news.published_at,
          category: news.category,
          tags: news.tags,
          summary: news.summary,
          selected_at: news.selected_at
        };

        if (include_humanized === 'true' && news.humanized_content) {
          exportItem.humanized_content = news.humanized_content;
          exportItem.humanization_tone = news.humanization_tone;
          exportItem.humanization_style = news.humanization_style;
          exportItem.humanization_complexity = news.humanization_complexity;
        }

        return exportItem;
      });

      // Generar archivo según formato
      let filename;
      let contentType;
      let content;

      switch (format.toLowerCase()) {
        case 'json':
          filename = `news_export_${new Date().toISOString().split('T')[0]}.json`;
          contentType = 'application/json';
          content = JSON.stringify(exportData, null, 2);
          break;

        case 'csv':
          filename = `news_export_${new Date().toISOString().split('T')[0]}.csv`;
          contentType = 'text/csv';
          content = this.convertToCSV(exportData);
          break;

        case 'markdown':
          filename = `news_export_${new Date().toISOString().split('T')[0]}.md`;
          contentType = 'text/markdown';
          content = this.convertToMarkdown(exportData);
          break;

        default:
          return next(new AppError('Unsupported export format', 400));
      }

      // Registrar exportación en la base de datos (sino es modo demo)
      if (!require('../config/database').isDemoMode) {
        try {
          const { supabase } = require('../config/database');
          await supabase
            .from('news_exports')
            .insert({
              user_id,
              format,
              filters: { include_humanized: include_humanized === 'true', batch_id },
              news_count: exportData.length,
              file_size: content.length,
              status: 'completed',
              completed_at: new Date().toISOString()
            });
        } catch (dbError) {
          loggers.general.warn('Error registering export:', dbError);
        }
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);

    } catch (error) {
      loggers.general.error('Error in exportNews controller:', error);
      next(error);
    }
  }

  /**
   * Convertir datos a CSV
   */
  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(item => {
      return headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Convertir datos a Markdown
   */
  convertToMarkdown(data) {
    if (!data || data.length === 0) return '# No news to export\n';

    let markdown = `# Exportación de Noticias\n\n`;
    markdown += `**Fecha:** ${new Date().toLocaleString()}\n`;
    markdown += `**Total:** ${data.length} noticias\n\n`;
    markdown += `---\n\n`;

    data.forEach((news, index) => {
      markdown += `## ${index + 1}. ${news.title}\n\n`;
      markdown += `**Fuente:** ${news.source} (${news.domain})\n`;
      markdown += `**Autor:** ${news.author || 'N/A'}\n`;
      markdown += `**Fecha:** ${new Date(news.published_at).toLocaleString()}\n`;
      markdown += `**URL:** ${news.url}\n`;
      markdown += `**Categoría:** ${news.category || 'N/A'}\n\n`;

      if (news.summary) {
        markdown += `### Resumen\n${news.summary}\n\n`;
      }

      markdown += `### Contenido Original\n${news.content}\n\n`;

      if (news.humanized_content) {
        markdown += `### Contenido Humanizado\n${news.humanized_content}\n\n`;
      }

      markdown += `---\n\n`;
    });

    return markdown;
  }
}

module.exports = new NewsController();