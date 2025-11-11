const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Controlador para noticias humanizadas
 * Maneja la obtención y gestión de noticias que han sido humanizadas
 */
class HumanizedNewsController {
  
  /**
   * Obtener noticias humanizadas con paginación y filtros
   */
  async getHumanizedNews(req, res, next) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        source, 
        tone, 
        style, 
        status = 'active' 
      } = req.query;

      const offset = (page - 1) * limit;

      // Construir query base
      let query = supabase
        .from('news_humanized')
        .select('*', { count: 'exact' })
        .eq('status', status)
        .eq('is_ready_for_use', true)
        .order('humanized_at', { ascending: false });

      // Aplicar filtros
      if (search) {
        query = query.or(`title.ilike.%${search}%,humanized_content.ilike.%${search}%`);
      }

      if (source) {
        query = query.eq('source', source);
      }

      if (tone) {
        query = query.eq('tone', tone);
      }

      if (style) {
        query = query.eq('style', style);
      }

      // Aplicar paginación
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new AppError(`Error al obtener noticias humanizadas: ${error.message}`, 500);
      }

      // Calcular estadísticas
      const stats = await this.getHumanizedStats();

      res.json({
        success: true,
        data: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        stats
      });

    } catch (error) {
      logger.error('Error en getHumanizedNews:', error);
      next(error);
    }
  }

  /**
   * Obtener noticia humanizada por ID
   */
  async getHumanizedNewsById(req, res, next) {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('news_humanized')
        .select(`
          *,
          news_humanization_versions(*),
          news_humanized_category_relations(
            news_humanized_categories(*)
          )
        `)
        .eq('id', id)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Noticia humanizada no encontrada', 404);
        }
        throw new AppError(`Error al obtener noticia humanizada: ${error.message}`, 500);
      }

      // Incrementar contador de vistas
      await this.incrementViewCount(id);

      res.json({
        success: true,
        data
      });

    } catch (error) {
      logger.error('Error en getHumanizedNewsById:', error);
      next(error);
    }
  }

  /**
   * Obtener estadísticas de noticias humanizadas
   */
  async getHumanizedStats(req, res, next) {
    try {
      const stats = await this.getHumanizedStats();
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error en getHumanizedStats:', error);
      next(error);
    }
  }

  /**
   * Crear noticia humanizada (usado por el servicio de humanización)
   */
  async createHumanizedNews(req, res, next) {
    try {
      const humanizedNewsData = req.body;

      // Validar datos requeridos
      if (!humanizedNewsData.original_news_id || !humanizedNewsData.humanized_content) {
        throw new AppError('Datos incompletos para crear noticia humanizada', 400);
      }

      const { data, error } = await supabase
        .from('news_humanized')
        .insert([{
          ...humanizedNewsData,
          humanized_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw new AppError(`Error al crear noticia humanizada: ${error.message}`, 500);
      }

      // Crear versión inicial
      await this.createVersion(data.id, humanizedNewsData);

      logger.info(`Noticia humanizada creada: ID ${data.id}`);

      res.status(201).json({
        success: true,
        data
      });

    } catch (error) {
      logger.error('Error en createHumanizedNews:', error);
      next(error);
    }
  }

  /**
   * Actualizar noticia humanizada
   */
  async updateHumanizedNews(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Verificar que existe
      const { data: existing } = await supabase
        .from('news_humanized')
        .select('id')
        .eq('id', id)
        .eq('status', 'active')
        .single();

      if (!existing) {
        throw new AppError('Noticia humanizada no encontrada', 404);
      }

      const { data, error } = await supabase
        .from('news_humanized')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError(`Error al actualizar noticia humanizada: ${error.message}`, 500);
      }

      logger.info(`Noticia humanizada actualizada: ID ${id}`);

      res.json({
        success: true,
        data
      });

    } catch (error) {
      logger.error('Error en updateHumanizedNews:', error);
      next(error);
    }
  }

  /**
   * Eliminar noticia humanizada (soft delete)
   */
  async deleteHumanizedNews(req, res, next) {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('news_humanized')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError(`Error al eliminar noticia humanizada: ${error.message}`, 500);
      }

      logger.info(`Noticia humanizada eliminada: ID ${id}`);

      res.json({
        success: true,
        data: { message: 'Noticia humanizada eliminada exitosamente' }
      });

    } catch (error) {
      logger.error('Error en deleteHumanizedNews:', error);
      next(error);
    }
  }

  /**
   * Obtener categorías de noticias humanizadas
   */
  async getCategories(req, res, next) {
    try {
      const { data, error } = await supabase
        .from('news_humanized_categories')
        .select('*')
        .order('name');

      if (error) {
        throw new AppError(`Error al obtener categorías: ${error.message}`, 500);
      }

      res.json({
        success: true,
        data
      });

    } catch (error) {
      logger.error('Error en getCategories:', error);
      next(error);
    }
  }

  /**
   * Obtener estadísticas generales
   */
  async getHumanizedStats() {
    try {
      // Estadísticas básicas
      const { count: totalCount } = await supabase
        .from('news_humanized')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: readyCount } = await supabase
        .from('news_humanized')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('is_ready_for_use', true);

      // Por tono
      const { data: toneStats } = await supabase
        .from('news_humanized')
        .select('tone')
        .eq('status', 'active')
        .eq('is_ready_for_use', true);

      const toneCount = {};
      toneStats?.forEach(item => {
        toneCount[item.tone] = (toneCount[item.tone] || 0) + 1;
      });

      // Por estilo
      const { data: styleStats } = await supabase
        .from('news_humanized')
        .select('style')
        .eq('status', 'active')
        .eq('is_ready_for_use', true);

      const styleCount = {};
      styleStats?.forEach(item => {
        styleCount[item.style] = (styleCount[item.style] || 0) + 1;
      });

      // Fuentes más populares
      const { data: sourceStats } = await supabase
        .from('news_humanized')
        .select('source')
        .eq('status', 'active')
        .eq('is_ready_for_use', true)
        .order('humanized_at', { ascending: false })
        .limit(10);

      const uniqueSources = [...new Set(sourceStats?.map(item => item.source) || [])];

      return {
        total_humanized: totalCount || 0,
        ready_for_use: readyCount || 0,
        by_tone: toneCount,
        by_style: styleCount,
        top_sources: uniqueSources,
        recent_activity: {
          today: await this.getTodayCount(),
          this_week: await this.getWeekCount()
        }
      };

    } catch (error) {
      logger.error('Error en getHumanizedStats:', error);
      throw error;
    }
  }

  /**
   * Crear versión de humanización
   */
  async createVersion(humanizedNewsId, newsData) {
    try {
      // Obtener número de versión actual
      const { data: versions } = await supabase
        .from('news_humanization_versions')
        .select('version_number')
        .eq('humanized_news_id', humanizedNewsId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

      await supabase
        .from('news_humanization_versions')
        .insert([{
          humanized_news_id: humanizedNewsId,
          version_number: nextVersion,
          humanized_content: newsData.humanized_content,
          tone: newsData.tone,
          style: newsData.style,
          complexity: newsData.complexity,
          target_audience: newsData.target_audience || 'general',
          readability_score: newsData.humanized_readability_score,
          word_count: newsData.word_count_humanized,
          created_at: new Date().toISOString()
        }]);

    } catch (error) {
      logger.error('Error en createVersion:', error);
    }
  }

  /**
   * Incrementar contador de vistas
   */
  async incrementViewCount(humanizedNewsId) {
    try {
      await supabase
        .rpc('increment_humanized_news_view', { news_id: humanizedNewsId });
    } catch (error) {
      logger.error('Error incrementing view count:', error);
    }
  }

  /**
   * Contar noticias humanizadas hoy
   */
  async getTodayCount() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count } = await supabase
        .from('news_humanized')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('humanized_at', today.toISOString());

      return count || 0;
    } catch (error) {
      logger.error('Error en getTodayCount:', error);
      return 0;
    }
  }

  /**
   * Contar noticias humanizadas esta semana
   */
  async getWeekCount() {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count } = await supabase
        .from('news_humanized')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('humanized_at', weekAgo.toISOString());

      return count || 0;
    } catch (error) {
      logger.error('Error en getWeekCount:', error);
      return 0;
    }
  }
}

module.exports = new HumanizedNewsController();