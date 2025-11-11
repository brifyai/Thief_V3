const { supabase, isDemoMode } = require('../config/database');
const { loggers } = require('../utils/logger');
const AppError = require('../utils/AppError');

class NewsService {
  constructor() {
    this.defaultLimit = 10;
    this.maxLimit = 100;
  }

  /**
   * Obtener lista de noticias con paginación y filtros
   */
  async getNews(options = {}) {
    const {
      page = 1,
      limit = this.defaultLimit,
      status = 'published',
      category,
      domain,
      search,
      sortBy = 'published_at',
      sortOrder = 'desc',
      is_selected,
      user_id
    } = options;

    const offset = (page - 1) * limit;
    const actualLimit = Math.min(limit, this.maxLimit);

    try {
      if (isDemoMode) {
        return this.getDemoNews(options);
      }

      // Modo real con Supabase - obtener noticias
      console.log('✅ Usando Supabase real para noticias');
      console.log('🔍 Parámetros:', { page, limit, status, category, domain, search, sortBy, sortOrder });
      
      let query = supabase
        .from('news')
        .select('*', { count: 'exact' });

      // Aplicar filtros - corregidos para el esquema real
      if (status && status === 'published') {
        console.log('📋 Aplicando filtro status = published');
        query = query.eq('status', 'published');
      }

      if (is_selected !== undefined) {
        console.log('📋 Filtro is_selected:', is_selected);
        // Para Supabase, usamos un campo diferente o lo manejamos de otra forma
      }

      if (category) {
        console.log('📋 Aplicando filtro category =', category);
        query = query.eq('category', category);
      }

      if (domain) {
        console.log('📋 Aplicando filtro domain =', domain);
        query = query.eq('domain', domain);
      }

      if (search) {
        console.log('📋 Aplicando búsqueda:', search);
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,summary.ilike.%${search}%`);
      }

      // Ordenamiento - usar published_at como fallback si sortBy no existe
      const validSortField = ['published_at', 'created_at', 'title'].includes(sortBy) ? sortBy : 'published_at';
      console.log('📋 Ordenando por:', validSortField, sortOrder);
      query = query.order(validSortField, { ascending: sortOrder === 'asc' });

      // Paginación - usar range de Supabase
      console.log('📋 Paginación: range', offset, 'a', offset + actualLimit - 1);
      query = query.range(offset, offset + actualLimit - 1);

      console.log('🔍 Ejecutando consulta...');
      const { data: news, error, count } = await query;

      if (error) {
        console.error('❌ Error en consulta Supabase:', error);
        loggers.general.error('Error fetching news:', error);
        throw new Error('Error fetching news: ' + error.message);
      }

      console.log('✅ Consulta exitosa:', {
        noticiasEncontradas: news?.length || 0,
        total: count,
        primeraNoticia: news?.[0]?.title || 'N/A'
      });

      // Obtener selecciones del usuario si se proporciona user_id
      let userSelections = [];
      if (user_id) {
        const { data: selections } = await supabase
          .from('news_selections')
          .select('news_id')
          .eq('user_id', user_id);

        userSelections = selections?.map(s => s.news_id) || [];
      }

      // Marcar noticias seleccionadas por el usuario
      const newsWithSelections = news.map(article => ({
        ...article,
        is_selected_by_user: userSelections.includes(article.id)
      }));

      return {
        news: newsWithSelections,
        pagination: {
          page,
          limit: actualLimit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / actualLimit),
          hasNext: offset + actualLimit < (count || 0),
          hasPrev: page > 1
        }
      };

    } catch (error) {
      loggers.general.error('Error in getNews:', error);
      throw error;
    }
  }

  /**
   * Obtener noticia por ID
   */
  async getNewsById(id, user_id = null) {
    try {
      if (isDemoMode) {
        const demoNews = this.getDemoNewsById(id);
        if (!demoNews) {
          throw new AppError('News not found', 404);
        }
        return demoNews;
      }

      const { data: news, error } = await supabase
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
        `)
        .eq('id', id)
        .single();

      if (error) {
        loggers.general.error('Error fetching news by ID:', error);
        throw new AppError('News not found', 404);
      }

      // Verificar si el usuario ha seleccionado esta noticia
      if (user_id) {
        const { data: selection } = await supabase
          .from('news_selections')
          .select('*')
          .eq('news_id', id)
          .eq('user_id', user_id)
          .single();

        news.is_selected_by_user = !!selection;
        news.selection_info = selection;
      }

      return news;

    } catch (error) {
      loggers.general.error('Error in getNewsById:', error);
      throw error;
    }
  }

  /**
   * Seleccionar/deseleccionar noticia
   */
  async toggleNewsSelection(newsId, userId, selectionType = 'manual') {
    try {
      if (isDemoMode) {
        return this.toggleDemoNewsSelection(newsId, userId);
      }

      // Verificar si la noticia existe
      const { data: news, error: newsError } = await supabase
        .from('news')
        .select('id')
        .eq('id', newsId)
        .single();

      if (newsError || !news) {
        throw new AppError('News not found', 404);
      }

      // Verificar si ya está seleccionada
      const { data: existingSelection, error: selectionError } = await supabase
        .from('news_selections')
        .select('*')
        .eq('news_id', newsId)
        .eq('user_id', userId)
        .single();

      if (existingSelection) {
        // Deseleccionar
        const { error: deleteError } = await supabase
          .from('news_selections')
          .delete()
          .eq('news_id', newsId)
          .eq('user_id', userId);

        if (deleteError) {
          throw new AppError('Error deselecting news', 500);
        }

        // Actualizar contador de selecciones en la noticia
        await this.updateNewsSelectionCount(newsId);

        // No usamos Redis, todo se maneja directamente en Supabase

        return { selected: false, message: 'News deselected successfully' };

      } else {
        // Seleccionar
        const { error: insertError } = await supabase
          .from('news_selections')
          .insert({
            news_id: newsId,
            user_id: userId,
            selection_type: selectionType
          });

        if (insertError) {
          throw new AppError('Error selecting news', 500);
        }

        // Actualizar contador de selecciones en la noticia
        await this.updateNewsSelectionCount(newsId);

        // No usamos Redis, todo se maneja directamente en Supabase

        return { selected: true, message: 'News selected successfully' };
      }

    } catch (error) {
      loggers.general.error('Error in toggleNewsSelection:', error);
      throw error;
    }
  }

  /**
   * Obtener noticias seleccionadas por usuario
   */
  async getUserSelectedNews(userId, options = {}) {
    const {
      page = 1,
      limit = this.defaultLimit,
      sortBy = 'selected_at',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    const actualLimit = Math.min(limit, this.maxLimit);

    try {
      if (isDemoMode) {
        return this.getDemoUserSelectedNews(userId, options);
      }

      const { data: selections, error, count } = await supabase
        .from('news_selections')
        .select(`
          *,
          news:news(
            *,
            categories:news_categories(
              category:categories(id, name, slug, color)
            )
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + actualLimit - 1);

      if (error) {
        loggers.general.error('Error fetching user selected news:', error);
        throw new AppError('Error fetching selected news', 500);
      }

      return {
        news: selections.map(s => ({ ...s.news, selected_at: s.selected_at })),
        pagination: {
          page,
          limit: actualLimit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / actualLimit),
          hasNext: offset + actualLimit < (count || 0),
          hasPrev: page > 1
        }
      };

    } catch (error) {
      loggers.general.error('Error in getUserSelectedNews:', error);
      throw error;
    }
  }

  /**
   * Humanizar noticia
   */
  async humanizeNews(newsId, userId, options = {}) {
    const {
      tone = 'professional',
      style = 'detailed',
      complexity = 'intermediate'
    } = options;

    try {
      if (isDemoMode) {
        return this.humanizeDemoNews(newsId, userId, options);
      }

      // Obtener noticia original
      const news = await this.getNewsById(newsId);
      if (!news) {
        throw new AppError('News not found', 404);
      }

      // Llamar al servicio especializado de humanización
      const humanizationService = require('./newsHumanization.service');
      const humanizationResult = await humanizationService.humanizeContent(newsId, userId, {
        tone,
        style,
        complexity,
        preserveFacts: true,
        targetAudience: 'general'
      });

      return {
        humanization: humanizationResult,
        original_news: news,
        ai_usage: {
          tokens_used: humanizationResult.tokens_used,
          cost: humanizationResult.cost,
          processing_time: humanizationResult.processing_time
        }
      };

    } catch (error) {
      loggers.general.error('Error in humanizeNews:', error);
      throw error;
    }
  }


  async updateNewsSelectionCount(newsId) {
    try {
      const { count, error } = await supabase
        .from('news_selections')
        .select('*', { count: 'exact', head: true })
        .eq('news_id', newsId);

      if (!error) {
        const is_selected = count > 0;
        await supabase
          .from('news')
          .update({ 
            is_selected,
            selection_date: is_selected ? new Date().toISOString() : null,
            selected_by: is_selected ? [`user_${Date.now()}`] : []
          })
          .eq('id', newsId);
      }
    } catch (error) {
      loggers.general.warn('Error updating news selection count:', error);
    }
  }

  /**
   * Métodos de demo mode
   */
  getDemoNews(options = {}) {
    const { page = 1, limit = this.defaultLimit } = options;
    const offset = (page - 1) * limit;

    const demoNews = [
      {
        id: 1,
        title: "Gobierno anuncia nuevas medidas económicas para enfrentar la inflación",
        content: "El presidente de la nación anunció hoy un conjunto de medidas económicas destinadas a combatir los efectos de la inflación en la población. Las medidas incluyen controles de precios y subsidios para sectores vulnerables...",
        url: "https://ejemplo.com/noticia-1",
        source: "El Diario",
        domain: "eldiario.cl",
        author: "Juan Pérez",
        published_at: "2024-01-15T10:30:00Z",
        scraped_at: "2024-01-15T11:00:00Z",
        category: "economía",
        tags: ["economía", "gobierno", "inflación"],
        image_url: "https://ejemplo.com/imagen-1.jpg",
        summary: "El gobierno anuncia medidas para controlar la inflación",
        word_count: 450,
        reading_time: 2,
        language: "es",
        status: "published",
        priority: 2,
        is_selected: false,
        created_at: "2024-01-15T11:00:00Z",
        updated_at: "2024-01-15T11:00:00Z",
        categories: [{ category: { id: 2, name: "Economía", slug: "economia", color: "#4caf50" } }],
        selection_count: 0,
        is_selected_by_user: false
      },
      {
        id: 2,
        title: "Descubren nueva especie en la Amazonía",
        content: "Científicos han descubierto una nueva especie de primate en la región amazónica que podría cambiar los conocimientos actuales sobre la evolución de los monos sudamericanos...",
        url: "https://ejemplo.com/noticia-2",
        source: "Nature Magazine",
        domain: "nature.com",
        author: "Dr. María González",
        published_at: "2024-01-14T15:45:00Z",
        scraped_at: "2024-01-14T16:00:00Z",
        category: "ciencia",
        tags: ["ciencia", "naturaleza", "descubrimiento"],
        image_url: "https://ejemplo.com/imagen-2.jpg",
        summary: "Nueva especie de primate descubierta en la Amazonía",
        word_count: 680,
        reading_time: 3,
        language: "es",
        status: "published",
        priority: 1,
        is_selected: false,
        created_at: "2024-01-14T16:00:00Z",
        updated_at: "2024-01-14T16:00:00Z",
        categories: [{ category: { id: 8, name: "Ciencia", slug: "ciencia", color: "#3f51b5" } }],
        selection_count: 0,
        is_selected_by_user: false
      }
      // ... más noticias de demo
    ];

    const paginatedNews = demoNews.slice(offset, offset + limit);

    return {
      news: paginatedNews,
      pagination: {
        page,
        limit,
        total: demoNews.length,
        totalPages: Math.ceil(demoNews.length / limit),
        hasNext: offset + limit < demoNews.length,
        hasPrev: page > 1
      }
    };
  }

  getDemoNewsById(id) {
    const demoNews = this.getDemoNews();
    return demoNews.news.find(n => n.id === parseInt(id));
  }

  async toggleDemoNewsSelection(newsId, userId) {
    // Simular toggle en modo demo
    return { 
      selected: true, 
      message: 'News selected successfully (demo mode)' 
    };
  }

  async getDemoUserSelectedNews(userId, options = {}) {
    // Simular noticias seleccionadas en modo demo
    return {
      news: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    };
  }

  async humanizeDemoNews(newsId, userId, options) {
    const news = this.getDemoNewsById(newsId);
    if (!news) {
      throw new AppError('News not found', 404);
    }

    return {
      humanization: {
        id: `demo_${Date.now()}`,
        news_id: newsId,
        user_id: userId,
        original_content: news.content,
        humanized_content: `Contenido humanizado de demostración con tono ${options.tone} y estilo ${options.style}...`,
        tone: options.tone,
        style: options.style,
        complexity: options.complexity,
        tokens_used: 150,
        cost: 0.002,
        processing_time: 2.5,
        ai_model: 'demo-ai',
        created_at: new Date().toISOString()
      },
      original_news: news,
      ai_usage: {
        tokens_used: 150,
        cost: 0.002,
        processing_time: 2.5
      }
    };
  }
}

module.exports = new NewsService();