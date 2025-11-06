const newsScrapingService = require('../services/newsScraping.service');
const { supabase, isDemoMode } = require('../config/database');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

class NewsScrapingController {
  /**
   * POST /api/news/scrape/url
   * Scrapear una noticia desde una URL específica
   */
  async scrapeNewsFromUrl(req, res, next) {
    try {
      const { url, sourceConfig } = req.body;

      if (!url) {
        return next(new AppError('URL is required', 400));
      }

      const newsData = await newsScrapingService.scrapeNewsFromUrl(url, sourceConfig);

      res.json({
        success: true,
        data: newsData,
        message: 'News scraped successfully'
      });

    } catch (error) {
      logger.error('Error in scrapeNewsFromUrl controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/news/scrape/source
   * Scrapear noticias de una fuente configurada
   */
  async scrapeNewsFromSource(req, res, next) {
    try {
      const { sourceId, limit = 50 } = req.body;

      if (!sourceId) {
        return next(new AppError('Source ID is required', 400));
      }

      // Obtener configuración de la fuente
      const { data: source, error } = await supabase
        .from('news_sources')
        .select('*')
        .eq('id', sourceId)
        .eq('is_active', true)
        .single();

      if (error || !source) {
        return next(new AppError('Source not found or inactive', 404));
      }

      const newsList = await newsScrapingService.scrapeNewsFromSource(source, limit);

      res.json({
        success: true,
        data: {
          source: source.name,
          newsCount: newsList.length,
          news: newsList
        },
        message: `Scraped ${newsList.length} news from ${source.name}`
      });

    } catch (error) {
      logger.error('Error in scrapeNewsFromSource controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/news/scrape/all
   * Scrapear noticias de todas las fuentes activas
   */
  async scrapeAllSources(req, res, next) {
    try {
      const { limit = 50 } = req.body;

      // Obtener todas las fuentes activas
      const { data: sources, error } = await supabase
        .from('news_sources')
        .select('*')
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      const results = [];
      let totalNews = 0;

      for (const source of sources) {
        try {
          logger.info(`Scraping source: ${source.name}`);
          const newsList = await newsScrapingService.scrapeNewsFromSource(source, limit);
          
          results.push({
            sourceId: source.id,
            sourceName: source.name,
            success: true,
            newsCount: newsList.length,
            error: null
          });
          
          totalNews += newsList.length;

          // Delay entre fuentes
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          logger.error(`Error scraping source ${source.name}:`, error);
          
          results.push({
            sourceId: source.id,
            sourceName: source.name,
            success: false,
            newsCount: 0,
            error: error.message
          });

          // Actualizar contador de fallos
          await supabase
            .from('news_sources')
            .update({ failure_count: source.failure_count + 1 })
            .eq('id', source.id);
        }
      }

      res.json({
        success: true,
        data: {
          totalSources: sources.length,
          successfulSources: results.filter(r => r.success).length,
          failedSources: results.filter(r => !r.success).length,
          totalNews,
          results
        },
        message: `Scraped ${totalNews} news from ${sources.length} sources`
      });

    } catch (error) {
      logger.error('Error in scrapeAllSources controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/scrape/sources
   * Obtener lista de fuentes configuradas
   */
  async getScrapingSources(req, res, next) {
    try {
      const { data: sources, error } = await supabase
        .from('news_sources')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      // Obtener estadísticas de cada fuente
      const sourcesWithStats = await Promise.all(
        sources.map(async (source) => {
          const { count } = await supabase
            .from('news')
            .select('*', { count: 'exact', head: true })
            .eq('domain', source.domain);

          return {
            ...source,
            newsCount: count || 0
          };
        })
      );

      res.json({
        success: true,
        data: sourcesWithStats,
        message: 'Sources retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getScrapingSources controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/news/scrape/sources
   * Agregar nueva fuente de scraping
   */
  async addScrapingSource(req, res, next) {
    try {
      const {
        name,
        url,
        type = 'scraping',
        config = {},
        scraping_interval = 3600
      } = req.body;

      if (!name || !url) {
        return next(new AppError('Name and URL are required', 400));
      }

      const domain = new URL(url).hostname;

      const sourceData = {
        name,
        url,
        domain,
        type,
        config,
        scraping_interval,
        is_active: true,
        success_count: 0,
        failure_count: 0,
        total_articles: 0,
        created_by: req.user?.id || null
      };

      const { data, error } = await supabase
        .from('news_sources')
        .insert(sourceData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data,
        message: 'Source added successfully'
      });

    } catch (error) {
      logger.error('Error in addScrapingSource controller:', error);
      next(error);
    }
  }

  /**
   * PUT /api/news/scrape/sources/:id
   * Actualizar fuente de scraping
   */
  async updateScrapingSource(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const { data, error } = await supabase
        .from('news_sources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return next(new AppError('Source not found', 404));
        }
        throw error;
      }

      res.json({
        success: true,
        data,
        message: 'Source updated successfully'
      });

    } catch (error) {
      logger.error('Error in updateScrapingSource controller:', error);
      next(error);
    }
  }

  /**
   * DELETE /api/news/scrape/sources/:id
   * Eliminar fuente de scraping
   */
  async deleteScrapingSource(req, res, next) {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('news_sources')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return next(new AppError('Source not found', 404));
        }
        throw error;
      }

      res.json({
        success: true,
        message: 'Source deleted successfully'
      });

    } catch (error) {
      logger.error('Error in deleteScrapingSource controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/news/scrape/test
   * Probar configuración de scraping
   */
  async testScrapingConfig(req, res, next) {
    try {
      const { url, config } = req.body;

      if (!url) {
        return next(new AppError('URL is required', 400));
      }

      // Scrapear una sola noticia para probar
      const newsData = await newsScrapingService.scrapeNewsFromUrl(url, config);

      res.json({
        success: true,
        data: {
          title: newsData.title,
          contentLength: newsData.content.length,
          author: newsData.author,
          category: newsData.category,
          tags: newsData.tags,
          wordCount: newsData.word_count,
          readingTime: newsData.reading_time
        },
        message: 'Scraping config test successful'
      });

    } catch (error) {
      logger.error('Error in testScrapingConfig controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/scrape/stats
   * Obtener estadísticas de scraping
   */
  async getScrapingStats(req, res, next) {
    try {
      // Estadísticas generales
      const { count: totalSources } = await supabase
        .from('news_sources')
        .select('*', { count: 'exact', head: true });

      const { count: activeSources } = await supabase
        .from('news_sources')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: totalNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true });

      // Noticias scrapeadas en las últimas 24h
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { count: recentNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .gte('scraped_at', yesterday.toISOString());

      // Fuentes más exitosas
      const { data: topSources } = await supabase
        .from('news_sources')
        .select('*')
        .eq('is_active', true)
        .order('success_count', { ascending: false })
        .limit(5);

      // Últimos scrapings
      const { data: recentScrapings } = await supabase
        .from('news_sources')
        .select('name, last_scraped, success_count, failure_count')
        .eq('is_active', true)
        .not('last_scraped', 'is', null)
        .order('last_scraped', { ascending: false })
        .limit(10);

      const stats = {
        totalSources: totalSources || 0,
        activeSources: activeSources || 0,
        totalNews: totalNews || 0,
        recentNews: recentNews || 0,
        topSources: topSources || [],
        recentScrapings: recentScrapings || []
      };

      res.json({
        success: true,
        data: stats,
        message: 'Scraping stats retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getScrapingStats controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/news/scrape/process-queue
   * Procesar cola de scraping (para procesamiento asíncrono)
   */
  async processScrapingQueue(req, res, next) {
    try {
      const { limit = 10 } = req.body;

      // Obtener noticias pendientes de procesamiento
      const { data: pendingNews, error } = await supabase
        .from('news')
        .select('*')
        .eq('status', 'pending')
        .limit(limit);

      if (error) {
        throw error;
      }

      const processed = [];
      const errors = [];

      for (const news of pendingNews) {
        try {
          // Aquí se podría agregar procesamiento adicional
          // como análisis de sentimiento, extracción de entidades, etc.
          
          await supabase
            .from('news')
            .update({ status: 'published' })
            .eq('id', news.id);

          processed.push(news.id);

        } catch (error) {
          logger.error(`Error processing news ${news.id}:`, error);
          errors.push({ id: news.id, error: error.message });
        }
      }

      res.json({
        success: true,
        data: {
          processed: processed.length,
          errors: errors.length,
          processedIds: processed,
          errors
        },
        message: `Processed ${processed.length} news from queue`
      });

    } catch (error) {
      logger.error('Error in processScrapingQueue controller:', error);
      next(error);
    }
  }
}

module.exports = new NewsScrapingController();