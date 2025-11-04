const { supabase } = require('../config/database');

// GET /api/urls - Filtrar por usuario autenticado
const getUrls = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del middleware de autenticación
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '50', 10);
    const skip = (page - 1) * pageSize;

    const [total, urls] = await Promise.all([
      prisma.saved_urls.count({ where: { user_id: userId } }),
      prisma.saved_urls.findMany({
        where: { user_id: userId },
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: { _count: { select: { scraping_results: true, ai_rewrites: true } } }
      })
    ]);

    const mapped = urls.map(u => ({
      id: u.id,
      url: u.url,
      title: u.title || null,
      description: u.description || null,
      domain: u.domain,
      nombre: u.nombre || null,
      region: u.region || null,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      _count: {
        scrapingResults: u._count.scraping_results,
        aiRewrites: u._count.ai_rewrites
      }
    }));

    return res.json({
      urls: mapped,
      pagination: { total, page, pageSize }
    });
  } catch (error) {
    console.error('Error en GET /api/urls:', error);
    return res.status(500).json({ error: 'Error al obtener URLs', detalle: error.message });
  }
};

// POST /api/urls - Incluir user_id al crear URLs
const createUrl = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del middleware de autenticación
    const { url, nombre, region } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'URL es requerida' });
    }

    // Extraer dominio
    let domain;
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
    } catch (error) {
      return res.status(400).json({ error: 'URL inválida' });
    }

    // Ya no verificamos si existe - permitimos URLs duplicadas
    // Esto permite scrapear la misma URL múltiples veces para obtener diferentes noticias

    const now = new Date();
    const created = await prisma.saved_urls.create({
      data: {
        user_id: userId, // Asociar con el usuario autenticado
        url,
        domain,
        nombre: nombre || null,
        region: region || null,
        created_at: now,
        updated_at: now
      }
    });

    return res.status(201).json({
      message: 'URL guardada correctamente',
      url: {
        id: created.id,
        url: created.url,
        title: created.title || null,
        description: created.description || null,
        domain: created.domain,
        nombre: created.nombre || null,
        region: created.region || null,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
        _count: { scrapingResults: 0, aiRewrites: 0 }
      }
    });
  } catch (error) {
    console.error('Error en POST /api/urls:', error);
    return res.status(500).json({ error: 'Error al guardar la URL', detalle: error.message });
  }
};

// DELETE /api/urls/:id - Solo permitir eliminar URLs del usuario autenticado
const deleteUrl = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del middleware de autenticación
    const { id } = req.params;
    const urlId = parseInt(id);

    if (isNaN(urlId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar que existe y pertenece al usuario
    const existing = await prisma.saved_urls.findFirst({
      where: { 
        id: urlId,
        user_id: userId 
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'URL no encontrada o no tienes permisos para eliminarla' });
    }

    // Eliminar (esto también eliminará los registros relacionados por CASCADE)
    await prisma.saved_urls.delete({
      where: { id: urlId }
    });

    return res.json({ message: 'URL eliminada correctamente' });
  } catch (error) {
    console.error('Error en DELETE /api/urls/:id:', error);
    return res.status(500).json({ error: 'Error al eliminar la URL', detalle: error.message });
  }
};

module.exports = {
  getUrls,
  createUrl,
  deleteUrl,
};
