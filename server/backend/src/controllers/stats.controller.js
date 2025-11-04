const prisma = require('../config/database');
const cacheService = require('../utils/cacheService');

// GET /api/stats - Actualizado para filtrar por usuario con caché
const getStats = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del middleware de autenticación
    
    // Usar caché para estadísticas (TTL: 10 minutos)
    const cacheKey = cacheService.keys.stats(userId);
    
    const stats = await cacheService.getCached(
      cacheKey,
      async () => {
        // 🔹 NUEVO: Contar URLs seleccionadas (UserUrlSelection) en vez de saved_urls
        const [totalUrls, totalScrapes, totalRewrites, tokensSum] = await Promise.all([
          prisma.userUrlSelection.count({
            where: { user_id: userId }
          }),
          prisma.scraping_results.count({
            where: { user_id: userId }
          }),
          prisma.ai_rewrites.count({
            where: { user_id: userId }
          }),
          prisma.ai_rewrites.aggregate({ 
            where: { user_id: userId },
            _sum: { tokens_used: true } 
          })
        ]);

        const totalTokens = tokensSum?._sum?.tokens_used || 0;

        return {
          totalUrls,        // Ahora cuenta URLs seleccionadas
          totalScrapes,
          totalRewrites,
          totalTokens
        };
      },
      600 // 10 minutos
    );

    return res.json(stats);
  } catch (error) {
    console.error('Error en GET /api/stats:', error);
    return res.status(500).json({ error: 'Error al obtener estadísticas', detalle: error.message });
  }
};

module.exports = {
  getStats,
};
