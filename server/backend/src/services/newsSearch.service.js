const { supabase, isDemoMode } = require('../config/database');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

class NewsSearchService {
  constructor() {
    this.defaultLimit = 20;
    this.maxLimit = 100;
  }

  /**
   * Búsqueda avanzada de noticias
   */
  async searchNews(query, options = {}) {
    try {
      const {
        page = 1,
        limit = this.defaultLimit,
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
        sortOrder = 'desc',
        user_id
      } = options;

      const offset = (page - 1) * limit;
      const actualLimit = Math.min(limit, this.maxLimit);

      if (isDemoMode) {
        return this.getDemoSearchResults(query, options);
      }

      // Construir consulta de búsqueda
      let dbQuery = supabase
        .from('news')
        .select(`
          *,
          categories:news_categories(
            category:categories(id, name, slug, color)
          ),
          humanizations:news_humanizations(
            id,
            tone,
            style,
            complexity,
            created_at,
            feedback_score
          )
        `, { count: 'exact' });

      // Búsqueda de texto completo
      if (query) {
        // Búsqueda en múltiples campos
        const searchConditions = [
          `title.ilike.%${query}%`,
          `content.ilike.%${query}%`,
          `summary.ilike.%${query}%`,
          `tags.cs.{${query}}`
        ];
        
        dbQuery = dbQuery.or(searchConditions.join(','));
      }

      // Aplicar filtros
      if (status) {
        dbQuery = dbQuery.eq('status', status);
      }

      if (category) {
        dbQuery = dbQuery.contains('categories.category.slug', [category]);
      }

      if (domain) {
        dbQuery = dbQuery.eq('domain', domain);
      }

      if (author) {
        dbQuery = dbQuery.ilike('author', `%${author}%`);
      }

      if (priority) {
        dbQuery = dbQuery.eq('priority', priority);
      }

      if (hasHumanized !== undefined) {
        if (hasHumanized) {
          dbQuery = dbQuery.not('humanized_content', 'is', null);
        } else {
          dbQuery = dbQuery.is('humanized_content', null);
        }
      }

      if (minWordCount) {
        dbQuery = dbQuery.gte('word_count', minWordCount);
      }

      if (maxWordCount) {
        dbQuery = dbQuery.lte('word_count', maxWordCount);
      }

      if (tags && tags.length > 0) {
        dbQuery = dbQuery.contains('tags', tags);
      }

      // Filtros de fecha
      if (dateFrom) {
        dbQuery = dbQuery.gte('published_at', dateFrom);
      }

      if (dateTo) {
        dbQuery = dbQuery.lte('published_at', dateTo);
      }

      // Ordenamiento
      if (sortBy === 'relevance' && query) {
        // Para búsqueda por relevancia, ordenamos por coincidencias
        dbQuery = dbQuery.order('published_at', { ascending: false });
      } else {
        dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      // Paginación
      dbQuery = dbQuery.range(offset, offset + actualLimit - 1);

      const { data: news, error, count } = await dbQuery;

      if (error) {
        logger.error('Error in search query:', error);
        throw new AppError('Error searching news', 500);
      }

      // Calcular relevancia si hay búsqueda
      let newsWithRelevance = news;
      if (query) {
        newsWithRelevance = news.map(article => ({
          ...article,
          relevance_score: this.calculateRelevance(article, query)
        }));

        // Ordenar por relevancia si es el criterio principal
        if (sortBy === 'relevance') {
          newsWithRelevance.sort((a, b) => 
            sortOrder === 'desc' 
              ? b.relevance_score - a.relevance_score
              : a.relevance_score - b.relevance_score
          );
        }
      }

      // Obtener selecciones del usuario si se proporciona user_id
      if (user_id) {
        const newsSelectionRedis = require('./newsSelectionRedis.service');
        newsWithRelevance = await Promise.all(
          newsWithRelevance.map(async (article) => {
            const isSelected = await newsSelectionRedis.isNewsSelected(user_id, article.id);
            return {
              ...article,
              is_selected_by_user: isSelected
            };
          })
        );
      }

      return {
        news: newsWithRelevance,
        pagination: {
          page,
          limit: actualLimit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / actualLimit),
          hasNext: offset + actualLimit < (count || 0),
          hasPrev: page > 1
        },
        search_metadata: {
          query,
          total_results: count || 0,
          search_time: Date.now(),
          filters_applied: {
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
            tags
          }
        }
      };

    } catch (error) {
      logger.error('Error in searchNews:', error);
      throw error;
    }
  }

  /**
   * Búsqueda por similitud (contenido similar)
   */
  async findSimilarNews(newsId, options = {}) {
    try {
      const { limit = 10, user_id } = options;

      if (isDemoMode) {
        return this.getDemoSimilarNews(newsId, limit);
      }

      // Obtener noticia original
      const { data: originalNews, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', newsId)
        .single();

      if (error || !originalNews) {
        throw new AppError('News not found', 404);
      }

      // Extraer palabras clave del título y contenido
      const keywords = this.extractKeywords(originalNews.title + ' ' + originalNews.summary);
      
      // Buscar noticias con palabras clave similares
      let dbQuery = supabase
        .from('news')
        .select('*')
        .neq('id', newsId) // Excluir la noticia original
        .eq('status', 'published');

      // Construir búsqueda por palabras clave
      if (keywords.length > 0) {
        const keywordConditions = keywords.slice(0, 5).map(keyword => 
          `title.ilike.%${keyword}%`
        );
        dbQuery = dbQuery.or(keywordConditions.join(','));
      }

      // Ordenar por similitud (simplificado)
      dbQuery = dbQuery.order('published_at', { ascending: false })
        .limit(limit);

      const { data: similarNews, error: searchError } = await dbQuery;

      if (searchError) {
        throw searchError;
      }

      // Calcular similitud
      const newsWithSimilarity = similarNews.map(news => ({
        ...news,
        similarity_score: this.calculateSimilarity(originalNews, news)
      })).sort((a, b) => b.similarity_score - a.similarity_score);

      // Verificar selecciones del usuario
      if (user_id) {
        const newsSelectionRedis = require('./newsSelectionRedis.service');
        for (const news of newsWithSimilarity) {
          news.is_selected_by_user = await newsSelectionRedis.isNewsSelected(user_id, news.id);
        }
      }

      return {
        original_news: originalNews,
        similar_news: newsWithSimilarity,
        total_found: newsWithSimilarity.length
      };

    } catch (error) {
      logger.error('Error in findSimilarNews:', error);
      throw error;
    }
  }

  /**
   * Búsqueda por tendencias
   */
  async getTrendingNews(options = {}) {
    try {
      const { 
        timeRange = '24h', // 1h, 24h, 7d, 30d
        category,
        limit = 20,
        user_id 
      } = options;

      if (isDemoMode) {
        return this.getDemoTrendingNews(timeRange, category, limit);
      }

      // Calcular rango de fechas
      const now = new Date();
      let dateFrom;
      
      switch (timeRange) {
        case '1h':
          dateFrom = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      let dbQuery = supabase
        .from('news')
        .select(`
          *,
          categories:news_categories(
            category:categories(id, name, slug, color)
          ),
          selection_count:news_selections(count)
        `)
        .eq('status', 'published')
        .gte('published_at', dateFrom.toISOString())
        .order('selection_count', { ascending: false })
        .limit(limit);

      if (category) {
        dbQuery = dbQuery.contains('categories.category.slug', [category]);
      }

      const { data: trendingNews, error } = await dbQuery;

      if (error) {
        throw error;
      }

      // Calcular score de trending
      const newsWithTrendingScore = trendingNews.map(news => ({
        ...news,
        trending_score: this.calculateTrendingScore(news, dateFrom)
      })).sort((a, b) => b.trending_score - a.trending_score);

      // Verificar selecciones del usuario
      if (user_id) {
        const newsSelectionRedis = require('./newsSelectionRedis.service');
        for (const news of newsWithTrendingScore) {
          news.is_selected_by_user = await newsSelectionRedis.isNewsSelected(user_id, news.id);
        }
      }

      return {
        trending_news: newsWithTrendingScore,
        time_range: timeRange,
        date_from: dateFrom.toISOString(),
        date_to: now.toISOString(),
        total_found: newsWithTrendingScore.length
      };

    } catch (error) {
      logger.error('Error in getTrendingNews:', error);
      throw error;
    }
  }

  /**
   * Autocompletar para búsqueda
   */
  async getSearchSuggestions(query, options = {}) {
    try {
      const { limit = 10 } = options;

      if (isDemoMode || !query || query.length < 2) {
        return [];
      }

      // Buscar títulos similares
      const { data: suggestions, error } = await supabase
        .from('news')
        .select('title, category')
        .eq('status', 'published')
        .ilike('title', `%${query}%`)
        .limit(limit);

      if (error) {
        throw error;
      }

      // Extraer sugerencias únicas
      const uniqueSuggestions = [...new Set(
        suggestions.map(s => s.title.substring(0, 100))
      )];

      return uniqueSuggestions.slice(0, limit);

    } catch (error) {
      logger.error('Error in getSearchSuggestions:', error);
      return [];
    }
  }

  /**
   * Búsqueda avanzada por filtros combinados
   */
  async advancedSearch(filters, options = {}) {
    try {
      const {
        query,
        filters: searchFilters = {},
        page = 1,
        limit = this.defaultLimit,
        sortBy = 'published_at',
        sortOrder = 'desc',
        user_id
      } = options;

      // Combinar búsqueda de texto con filtros
      const searchOptions = {
        ...searchFilters,
        query,
        page,
        limit,
        sortBy,
        sortOrder,
        user_id
      };

      return await this.searchNews(query, searchOptions);

    } catch (error) {
      logger.error('Error in advancedSearch:', error);
      throw error;
    }
  }

  /**
   * Calcular score de relevancia
   */
  calculateRelevance(news, query) {
    let score = 0;
    const queryLower = query.toLowerCase();
    const titleLower = news.title.toLowerCase();
    const contentLower = news.content.toLowerCase();
    const summaryLower = (news.summary || '').toLowerCase();

    // Coincidencia exacta en título (máximo peso)
    if (titleLower.includes(queryLower)) {
      score += 100;
    }

    // Coincidencias parciales en título
    const queryWords = queryLower.split(' ');
    queryWords.forEach(word => {
      if (titleLower.includes(word)) {
        score += 50;
      }
      if (contentLower.includes(word)) {
        score += 20;
      }
      if (summaryLower.includes(word)) {
        score += 30;
      }
    });

    // Bonus por palabras clave en tags
    if (news.tags) {
      news.tags.forEach(tag => {
        if (tag.toLowerCase().includes(queryLower)) {
          score += 25;
        }
      });
    }

    // Bonus por recencia (noticias más recientes tienen más relevancia)
    const daysSincePublished = (Date.now() - new Date(news.published_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePublished < 1) {
      score += 10;
    } else if (daysSincePublished < 7) {
      score += 5;
    }

    return score;
  }

  /**
   * Calcular similitud entre noticias
   */
  calculateSimilarity(news1, news2) {
    let similarity = 0;

    // Similitud de categoría
    if (news1.category === news2.category) {
      similarity += 30;
    }

    // Similitud de dominio
    if (news1.domain === news2.domain) {
      similarity += 20;
    }

    // Similitud de palabras clave en títulos
    const keywords1 = this.extractKeywords(news1.title);
    const keywords2 = this.extractKeywords(news2.title);
    const commonKeywords = keywords1.filter(k => keywords2.includes(k));
    similarity += commonKeywords.length * 10;

    // Similitud de tags
    if (news1.tags && news2.tags) {
      const commonTags = news1.tags.filter(tag => news2.tags.includes(tag));
      similarity += commonTags.length * 5;
    }

    return Math.min(similarity, 100);
  }

  /**
   * Calcular score de trending
   */
  calculateTrendingScore(news, dateFrom) {
    let score = 0;

    // Base por selecciones
    score += (news.selection_count || 0) * 10;

    // Bonus por recencia
    const hoursSincePublished = (Date.now() - new Date(news.published_at).getTime()) / (1000 * 60 * 60);
    if (hoursSincePublished < 6) {
      score += 50;
    } else if (hoursSincePublished < 24) {
      score += 25;
    }

    // Bonus por prioridad
    score += (news.priority || 1) * 5;

    // Bonus por longitud del contenido (noticias más largas pueden ser más importantes)
    if (news.word_count > 500) {
      score += 10;
    }

    return score;
  }

  /**
   * Extraer palabras clave
   */
  extractKeywords(text) {
    // Implementación simplificada de extracción de palabras clave
    const stopWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'como', 'las', 'del', 'los', 'una', 'mi', 'me', 'si', 'ya', 'más', 'él', 'al', 'pero', 'ser', 'está', 'son', 'están', 'fue', 'fueron', 'será', 'serán'];
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 10);
  }

  /**
   * Métodos de demo
   */
  getDemoSearchResults(query, options) {
    const demoNews = [
      {
        id: 1,
        title: `Resultado de búsqueda para "${query}" - Economía`,
        content: `Contenido relacionado con ${query} en el área económica. Este es un resultado de demostración que muestra cómo funcionaría la búsqueda avanzada.`,
        url: "https://ejemplo.com/noticia-1",
        source: "El Diario",
        domain: "eldiario.cl",
        author: "Juan Pérez",
        published_at: "2024-01-15T10:30:00Z",
        scraped_at: "2024-01-15T11:00:00Z",
        category: "economía",
        tags: ["economía", "búsqueda", query],
        summary: `Resumen relacionado con ${query}`,
        word_count: 450,
        reading_time: 2,
        language: "es",
        status: "published",
        priority: 2,
        relevance_score: 95,
        is_selected_by_user: false
      },
      {
        id: 2,
        title: `Otro resultado sobre "${query}" - Tecnología`,
        content: `Contenido tecnológico relacionado con ${query}. Este es otro resultado de demostración para mostrar la variedad de resultados.`,
        url: "https://ejemplo.com/noticia-2",
        source: "Tech News",
        domain: "technews.cl",
        author: "María González",
        published_at: "2024-01-14T15:45:00Z",
        scraped_at: "2024-01-14T16:00:00Z",
        category: "tecnología",
        tags: ["tecnología", "innovación", query],
        summary: `Resumen tecnológico sobre ${query}`,
        word_count: 680,
        reading_time: 3,
        language: "es",
        status: "published",
        priority: 1,
        relevance_score: 87,
        is_selected_by_user: false
      }
    ];

    return {
      news: demoNews,
      pagination: {
        page: options.page || 1,
        limit: options.limit || this.defaultLimit,
        total: demoNews.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      },
      search_metadata: {
        query,
        total_results: demoNews.length,
        search_time: Date.now(),
        filters_applied: options
      }
    };
  }

  getDemoSimilarNews(newsId, limit = 10) {
    return {
      original_news: {
        id: newsId,
        title: "Noticia original para similitud",
        category: "economía"
      },
      similar_news: [
        {
          id: newsId + 1,
          title: "Noticia similar 1",
          similarity_score: 85,
          category: "economía"
        },
        {
          id: newsId + 2,
          title: "Noticia similar 2",
          similarity_score: 72,
          category: "economía"
        }
      ],
      total_found: 2
    };
  }

  getDemoTrendingNews(timeRange, category, limit) {
    return {
      trending_news: [
        {
          id: 1,
          title: "Noticia trending 1",
          trending_score: 95,
          category: category || "política",
          selection_count: 25
        },
        {
          id: 2,
          title: "Noticia trending 2",
          trending_score: 88,
          category: category || "economía",
          selection_count: 18
        }
      ],
      time_range: timeRange,
      total_found: 2
    };
  }
}

module.exports = new NewsSearchService();