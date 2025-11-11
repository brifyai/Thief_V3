const newsSearchService = require('../services/newsSearch.service');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

class NewsSearchController {
  /**
   * POST /api/news/search
   * Búsqueda avanzada de noticias
   */
  async searchNews(req, res, next) {
    try {
      const {
        query,
        page = 1,
        limit = 20,
        category,
        domain,
        author,
        dateFrom,
        dateTo,
        status = 'published',
        priority,
        hasHumanized,
        minWordCount,
        maxWordCount,
        tags,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = req.body;

      const user_id = req.user?.id || null;

      const searchOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        domain,
        author,
        dateFrom,
        dateTo,
        status,
        priority,
        hasHumanized,
        minWordCount,
        maxWordCount,
        tags,
        sortBy,
        sortOrder,
        user_id
      };

      const result = await newsSearchService.searchNews(query, searchOptions);

      res.json({
        success: true,
        data: result,
        message: 'Search completed successfully'
      });

    } catch (error) {
      logger.error('Error in searchNews controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/search/similar/:id
   * Encontrar noticias similares
   */
  async findSimilarNews(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query;
      const user_id = req.user?.id || null;

      const result = await newsSearchService.findSimilarNews(parseInt(id), {
        limit: parseInt(limit),
        user_id
      });

      res.json({
        success: true,
        data: result,
        message: 'Similar news found successfully'
      });

    } catch (error) {
      logger.error('Error in findSimilarNews controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/search/trending
   * Obtener noticias trending
   */
  async getTrendingNews(req, res, next) {
    try {
      const {
        timeRange = '24h',
        category,
        limit = 20
      } = req.query;

      const user_id = req.user?.id || null;

      const result = await newsSearchService.getTrendingNews({
        timeRange,
        category,
        limit: parseInt(limit),
        user_id
      });

      res.json({
        success: true,
        data: result,
        message: 'Trending news retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getTrendingNews controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/search/suggestions
   * Autocompletar para búsqueda
   */
  async getSearchSuggestions(req, res, next) {
    try {
      const { query, limit = 10 } = req.query;

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          data: [],
          message: 'Query too short for suggestions'
        });
      }

      const suggestions = await newsSearchService.getSearchSuggestions(query, {
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: suggestions,
        message: 'Suggestions retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getSearchSuggestions controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/news/search/advanced
   * Búsqueda avanzada con filtros complejos
   */
  async advancedSearch(req, res, next) {
    try {
      const {
        query,
        filters = {},
        page = 1,
        limit = 20,
        sortBy = 'published_at',
        sortOrder = 'desc'
      } = req.body;

      const user_id = req.user?.id || null;

      const result = await newsSearchService.advancedSearch(filters, {
        query,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
        user_id
      });

      res.json({
        success: true,
        data: result,
        message: 'Advanced search completed successfully'
      });

    } catch (error) {
      logger.error('Error in advancedSearch controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/search/filters
   * Obtener filtros disponibles para búsqueda
   */
  async getAvailableFilters(req, res, next) {
    try {
      const { supabase } = require('../config/database');

      // Obtener categorías disponibles
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, slug, color')
        .eq('is_active', true)
        .order('name');

      // Obtener dominios disponibles
      const { data: domains } = await supabase
        .from('news')
        .select('domain')
        .eq('status', 'published');

      const uniqueDomains = [...new Set(domains?.map(d => d.domain) || [])];

      // Obtener autores disponibles
      const { data: authors } = await supabase
        .from('news')
        .select('author')
        .not('author', 'is', null)
        .eq('status', 'published')
        .limit(100);

      const uniqueAuthors = [...new Set(authors?.map(a => a.author) || [])];

      // Obtener tags disponibles
      const { data: newsWithTags } = await supabase
        .from('news')
        .select('tags')
        .not('tags', 'is', null)
        .eq('status', 'published')
        .limit(100);

      const allTags = newsWithTags?.flatMap(n => n.tags) || [];
      const uniqueTags = [...new Set(allTags)].slice(0, 50);

      const filters = {
        categories: categories || [],
        domains: uniqueDomains,
        authors: uniqueAuthors,
        tags: uniqueTags,
        priorities: [
          { value: 1, label: 'Baja' },
          { value: 2, label: 'Media' },
          { value: 3, label: 'Alta' }
        ],
        statuses: [
          { value: 'published', label: 'Publicadas' },
          { value: 'pending', label: 'Pendientes' },
          { value: 'archived', label: 'Archivadas' }
        ],
        sortOptions: [
          { value: 'relevance', label: 'Relevancia' },
          { value: 'published_at', label: 'Fecha de publicación' },
          { value: 'scraped_at', label: 'Fecha de scraping' },
          { value: 'title', label: 'Título' },
          { value: 'word_count', label: 'Cantidad de palabras' },
          { value: 'selection_count', label: 'Veces seleccionada' }
        ],
        timeRanges: [
          { value: '1h', label: 'Última hora' },
          { value: '24h', label: 'Últimas 24 horas' },
          { value: '7d', label: 'Última semana' },
          { value: '30d', label: 'Último mes' }
        ]
      };

      res.json({
        success: true,
        data: filters,
        message: 'Available filters retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getAvailableFilters controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/news/search/save
   * Guardar búsqueda para uso futuro
   */
  async saveSearch(req, res, next) {
    try {
      const { name, query, filters } = req.body;
      const user_id = req.user?.id;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      if (!name || !query) {
        return next(new AppError('Name and query are required', 400));
      }

      const { supabase } = require('../config/database');

      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          user_id,
          name,
          query,
          filters,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data,
        message: 'Search saved successfully'
      });

    } catch (error) {
      logger.error('Error in saveSearch controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/search/saved
   * Obtener búsquedas guardadas del usuario
   */
  async getSavedSearches(req, res, next) {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      const { supabase } = require('../config/database');

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: data || [],
        message: 'Saved searches retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getSavedSearches controller:', error);
      next(error);
    }
  }

  /**
   * DELETE /api/news/search/saved/:id
   * Eliminar búsqueda guardada
   */
  async deleteSavedSearch(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.user?.id;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      const { supabase } = require('../config/database');

      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', parseInt(id))
        .eq('user_id', user_id);

      if (error) {
        if (error.code === 'PGRST116') {
          return next(new AppError('Saved search not found', 404));
        }
        throw error;
      }

      res.json({
        success: true,
        message: 'Saved search deleted successfully'
      });

    } catch (error) {
      logger.error('Error in deleteSavedSearch controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/news/search/history
   * Obtener historial de búsqueda del usuario
   */
  async getSearchHistory(req, res, next) {
    try {
      const user_id = req.user?.id;
      const { limit = 20 } = req.query;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      const { supabase } = require('../config/database');

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: data || [],
        message: 'Search history retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getSearchHistory controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/news/search/history
   * Registrar búsqueda en historial
   */
  async recordSearchHistory(req, res, next) {
    try {
      const { query, results_count, filters } = req.body;
      const user_id = req.user?.id;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      if (!query) {
        return next(new AppError('Query is required', 400));
      }

      const { supabase } = require('../config/database');

      const { data, error } = await supabase
        .from('search_history')
        .insert({
          user_id,
          query,
          results_count,
          filters,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data,
        message: 'Search recorded in history successfully'
      });

    } catch (error) {
      logger.error('Error in recordSearchHistory controller:', error);
      next(error);
    }
  }

  /**
   * DELETE /api/news/search/history
   * Limpiar historial de búsqueda del usuario
   */
  async clearSearchHistory(req, res, next) {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return next(new AppError('Authentication required', 401));
      }

      const { supabase } = require('../config/database');

      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user_id);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Search history cleared successfully'
      });

    } catch (error) {
      logger.error('Error in clearSearchHistory controller:', error);
      next(error);
    }
  }
}

module.exports = new NewsSearchController();