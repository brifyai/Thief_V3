const prisma = require('../config/database');
const entityMonitorService = require('../services/entityMonitorV2.service');  // ✅ USANDO V2
const entityStatsService = require('../services/entityStats.service');
const entityAlertsService = require('../services/entityAlerts.service');

/**
 * 🎯 CONTROLADOR DE ENTIDADES
 * Maneja CRUD y operaciones de entidades
 */

// Crear entidad
exports.createEntity = async (req, res) => {
  try {
    const {
      name,
      aliases,
      type,
      description,
      case_sensitive,
      exact_match,
      alert_enabled,
      alert_threshold,
      // 🆕 Campos V2
      analysis_context,
      positive_phrases,
      negative_phrases
    } = req.body;
    const userId = req.user.id;
    
    // Validar nombre
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El nombre debe tener al menos 2 caracteres'
      });
    }
    
    // 🆕 Validar contexto de análisis
    const validContexts = ['politica_chile', 'personalizado'];
    if (analysis_context && !validContexts.includes(analysis_context)) {
      return res.status(400).json({
        success: false,
        message: 'Contexto de análisis inválido. Opciones: politica_chile, personalizado'
      });
    }
    
    // Crear entidad con campos V2
    const entity = await prisma.entity.create({
      data: {
        user_id: userId,
        name: name.trim(),
        aliases: aliases || [],
        type: type || 'PERSON',
        description,
        case_sensitive: case_sensitive || false,
        exact_match: exact_match || false,
        alert_enabled: alert_enabled !== false,
        alert_threshold: alert_threshold || 0.2,
        // 🆕 Campos V2 con valores por defecto
        analysis_context: analysis_context || 'politica_chile',
        positive_phrases: positive_phrases || [],
        negative_phrases: negative_phrases || []
      }
    });
    
    console.log(`✅ Entidad creada: ${entity.name} (${entity.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Entidad creada exitosamente',
      data: entity
    });
    
  } catch (error) {
    console.error('❌ Error creando entidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear entidad'
    });
  }
};

// Listar entidades del usuario
exports.getEntities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { is_active, type } = req.query;
    
    const where = { user_id: userId };
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (type) where.type = type;
    
    const entities = await prisma.entity.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            mentions: true,
            alerts: { where: { is_read: false } }
          }
        }
      }
    });
    
    res.json({
      success: true,
      data: entities
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo entidades:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener entidades'
    });
  }
};

// Obtener entidad por ID
exports.getEntityById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const entity = await prisma.entity.findFirst({
      where: {
        id,
        user_id: userId
      },
      include: {
        _count: {
          select: {
            mentions: true,
            snapshots: true,
            alerts: true
          }
        }
      }
    });
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entidad no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: entity
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo entidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener entidad'
    });
  }
};

// Actualizar entidad
exports.updateEntity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      name,
      aliases,
      description,
      case_sensitive,
      exact_match,
      alert_enabled,
      alert_threshold,
      // 🆕 Campos V2
      analysis_context,
      positive_phrases,
      negative_phrases
    } = req.body;
    
    // Verificar ownership
    const existing = await prisma.entity.findFirst({
      where: { id, user_id: userId }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Entidad no encontrada'
      });
    }
    
    // 🆕 Validar contexto de análisis si se proporciona
    if (analysis_context) {
      const validContexts = ['politica_chile', 'personalizado'];
      if (!validContexts.includes(analysis_context)) {
        return res.status(400).json({
          success: false,
          message: 'Contexto de análisis inválido. Opciones: politica_chile, personalizado'
        });
      }
    }
    
    const entity = await prisma.entity.update({
      where: { id },
      data: {
        name: name || existing.name,
        aliases: aliases !== undefined ? aliases : existing.aliases,
        description: description !== undefined ? description : existing.description,
        case_sensitive: case_sensitive !== undefined ? case_sensitive : existing.case_sensitive,
        exact_match: exact_match !== undefined ? exact_match : existing.exact_match,
        alert_enabled: alert_enabled !== undefined ? alert_enabled : existing.alert_enabled,
        alert_threshold: alert_threshold !== undefined ? alert_threshold : existing.alert_threshold,
        // 🆕 Campos V2
        analysis_context: analysis_context !== undefined ? analysis_context : existing.analysis_context,
        positive_phrases: positive_phrases !== undefined ? positive_phrases : existing.positive_phrases,
        negative_phrases: negative_phrases !== undefined ? negative_phrases : existing.negative_phrases
      }
    });
    
    res.json({
      success: true,
      message: 'Entidad actualizada exitosamente',
      data: entity
    });
    
  } catch (error) {
    console.error('❌ Error actualizando entidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar entidad'
    });
  }
};

// Eliminar entidad
exports.deleteEntity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar ownership
    const existing = await prisma.entity.findFirst({
      where: { id, user_id: userId }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Entidad no encontrada'
      });
    }
    
    await prisma.entity.delete({
      where: { id }
    });
    
    console.log(`🗑️  Entidad eliminada: ${existing.name}`);
    
    res.json({
      success: true,
      message: 'Entidad eliminada exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error eliminando entidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar entidad'
    });
  }
};

// Activar/Desactivar entidad
exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const existing = await prisma.entity.findFirst({
      where: { id, user_id: userId }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Entidad no encontrada'
      });
    }
    
    const entity = await prisma.entity.update({
      where: { id },
      data: { is_active: !existing.is_active }
    });
    
    res.json({
      success: true,
      message: `Entidad ${entity.is_active ? 'activada' : 'desactivada'}`,
      data: entity
    });
    
  } catch (error) {
    console.error('❌ Error cambiando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado'
    });
  }
};

// Obtener estadísticas de entidad
exports.getEntityStats = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const entity = await prisma.entity.findFirst({
      where: { id, user_id: userId }
    });
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entidad no encontrada'
      });
    }
    
    const stats = await entityStatsService.getEntityStats(id);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

// Obtener menciones de entidad
exports.getEntityMentions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { sentiment, page = 1, limit = 20 } = req.query;
    
    const entity = await prisma.entity.findFirst({
      where: { id, user_id: userId }
    });
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entidad no encontrada'
      });
    }
    
    const result = await entityStatsService.getMentions(
      id,
      { sentiment },
      { page: parseInt(page), limit: parseInt(limit) }
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo menciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener menciones'
    });
  }
};

// Obtener timeline de entidad
exports.getEntityTimeline = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { days = 30 } = req.query;
    
    const entity = await prisma.entity.findFirst({
      where: { id, user_id: userId }
    });
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entidad no encontrada'
      });
    }
    
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));
    
    const timeline = await entityStatsService.getEntityTimeline(id, dateFrom, dateTo);
    
    res.json({
      success: true,
      data: timeline
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener timeline'
    });
  }
};

// Obtener alertas de entidad
exports.getEntityAlerts = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const entity = await prisma.entity.findFirst({
      where: { id, user_id: userId }
    });
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entidad no encontrada'
      });
    }
    
    const alerts = await prisma.entityAlert.findMany({
      where: { entity_id: id },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    
    res.json({
      success: true,
      data: alerts
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo alertas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener alertas'
    });
  }
};

// Analizar entidad ahora (forzar análisis)
exports.analyzeNow = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { days = 30, limit = 100 } = req.query; // Parámetros configurables
    
    const entity = await prisma.entity.findFirst({
      where: { id, user_id: userId }
    });
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entidad no encontrada'
      });
    }
    
    // 🔹 MEJORA 1: Obtener dominios seleccionados por el usuario
    const userSelections = await prisma.userUrlSelection.findMany({
      where: { user_id: userId },
      include: { public_url: true }
    });
    
    const selectedDomains = userSelections.map(s => s.public_url.domain);
    
    // Si no tiene fuentes seleccionadas, retornar error amigable
    if (selectedDomains.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes seleccionar al menos una fuente de noticias en "Mis Fuentes"'
      });
    }
    
    console.log(`🔍 Analizando con ${selectedDomains.length} dominios seleccionados`);
    
    // 🔹 MEJORA 2 y 3: Filtrar por usuario, dominios y límite temporal
    const recentNews = await prisma.scraping_results.findMany({
      where: {
        AND: [
          // Solo noticias del usuario o públicas
          {
            OR: [
              { user_id: userId },      // Noticias privadas del usuario
              { user_id: null }          // Noticias públicas
            ]
          },
          // Solo de dominios seleccionados
          {
            domain: { in: selectedDomains }
          },
          // Solo últimos X días
          {
            scraped_at: {
              gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
            }
          },
          // Solo exitosas
          {
            success: true
          }
        ]
      },
      orderBy: { scraped_at: 'desc' },
      take: parseInt(limit) // 🔹 MEJORA 4: Límite configurable
    });
    
    console.log(`📊 Encontradas ${recentNews.length} noticias para analizar`);
    
    if (recentNews.length === 0) {
      return res.json({
        success: true,
        message: 'No hay noticias recientes para analizar',
        data: {
          processed: 0,
          mentions_found: 0,
          errors: 0,
          duration_ms: 0
        }
      });
    }
    
    const stats = await entityMonitorService.processBatch(recentNews);
    
    res.json({
      success: true,
      message: 'Análisis completado',
      data: {
        ...stats,
        filters: {
          days: parseInt(days),
          limit: parseInt(limit),
          domains: selectedDomains.length,
          articles_analyzed: recentNews.length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error analizando entidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al analizar entidad'
    });
  }
};
