const { supabase } = require('../config/database');

/**
 * POST /api/my-urls/select
 * Usuario selecciona una URL pública para seguir
 */
const selectUrl = async (req, res) => {
  try {
    const { public_url_id } = req.body;
    const userId = req.user.id;

    if (!public_url_id) {
      return res.status(400).json({ 
        error: 'public_url_id es requerido' 
      });
    }

    // Verificar que la URL pública existe y está activa
    const publicUrl = await prisma.publicUrl.findUnique({
      where: { id: parseInt(public_url_id) }
    });

    if (!publicUrl) {
      return res.status(404).json({ 
        error: 'URL pública no encontrada' 
      });
    }

    if (!publicUrl.is_active) {
      return res.status(400).json({ 
        error: 'Esta URL no está activa' 
      });
    }

    // Crear o actualizar selección (upsert)
    const selection = await prisma.userUrlSelection.upsert({
      where: {
        user_id_public_url_id: {
          user_id: userId,
          public_url_id: parseInt(public_url_id)
        }
      },
      update: {},
      create: {
        user_id: userId,
        public_url_id: parseInt(public_url_id)
      },
      include: {
        public_url: {
          select: {
            id: true,
            url: true,
            name: true,
            domain: true,
            region: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'URL seleccionada exitosamente',
      data: selection
    });

  } catch (error) {
    console.error('Error en selectUrl:', error);
    res.status(500).json({ 
      error: 'Error al seleccionar URL',
      details: error.message 
    });
  }
};

/**
 * DELETE /api/my-urls/select/:id
 * Usuario deselecciona una URL
 */
const unselectUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que la selección existe y pertenece al usuario
    const selection = await prisma.userUrlSelection.findFirst({
      where: {
        id: parseInt(id),
        user_id: userId
      }
    });

    if (!selection) {
      return res.status(404).json({ 
        error: 'Selección no encontrada' 
      });
    }

    // Eliminar selección
    await prisma.userUrlSelection.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'URL deseleccionada exitosamente'
    });

  } catch (error) {
    console.error('Error en unselectUrl:', error);
    res.status(500).json({ 
      error: 'Error al deseleccionar URL',
      details: error.message 
    });
  }
};

/**
 * GET /api/my-urls
 * Obtener URLs seleccionadas por el usuario
 */
const getMyUrls = async (req, res) => {
  try {
    const userId = req.user.id;

    const selections = await prisma.userUrlSelection.findMany({
      where: { user_id: userId },
      include: {
        public_url: {
          select: {
            id: true,
            url: true,
            name: true,
            domain: true,
            region: true,
            is_active: true,
            created_at: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      success: true,
      data: selections,
      total: selections.length
    });

  } catch (error) {
    console.error('Error en getMyUrls:', error);
    res.status(500).json({ 
      error: 'Error al obtener URLs seleccionadas',
      details: error.message 
    });
  }
};

/**
 * GET /api/my-urls/domains
 * Obtener solo los dominios seleccionados (para filtrar búsquedas)
 */
const getMyDomains = async (req, res) => {
  try {
    const userId = req.user.id;

    const selections = await prisma.userUrlSelection.findMany({
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

    // Filtrar solo URLs activas y extraer dominios únicos
    const domains = [...new Set(
      selections
        .filter(s => s.public_url.is_active)
        .map(s => s.public_url.domain)
    )];

    res.json({
      success: true,
      data: domains,
      total: domains.length
    });

  } catch (error) {
    console.error('Error en getMyDomains:', error);
    res.status(500).json({ 
      error: 'Error al obtener dominios',
      details: error.message 
    });
  }
};

module.exports = {
  selectUrl,
  unselectUrl,
  getMyUrls,
  getMyDomains
};
