const prisma = require('../config/database');
const { intelligentSearch, generateContentPreview } = require('../services/aiSearch.service');
const autoScraperService = require('../services/autoScraper.service');
const sentimentAnalyzer = require('../services/sentimentAnalyzer.service');
const cacheService = require('../utils/cacheService');

/**
 * Controlador de Búsqueda Avanzada
 * Maneja las consultas con filtros múltiples y búsqueda de texto libre
 */
class SearchController {
  
  /**
   * Búsqueda avanzada con filtros múltiples
   * GET /api/search
   * Query params: category, region, domain, q (texto libre), page, limit
   */
  async advancedSearch(req, res) {
    try {
      const userId = req.user.id; // Obtenido del middleware de autenticación
      const {
        category,
        region,
        domain,
        q, // búsqueda de texto libre
        page = 1,
        limit = 20,
        sortBy = 'scraped_at',
        sortOrder = 'desc'
      } = req.query;

      // Validar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Máximo 100 resultados por página
      const skip = (pageNum - 1) * limitNum;

      // 🔹 Obtener dominios seleccionados por el usuario
      const userSelections = await prisma.userUrlSelection.findMany({
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

      const selectedDomains = userSelections
        .filter(s => s.public_url.is_active)
        .map(s => s.public_url.domain);

      // Si no tiene URLs seleccionadas, retornar vacío
      if (selectedDomains.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            currentPage: pageNum,
            totalPages: 0,
            totalCount: 0,
            limit: limitNum
          },
          message: 'No tienes fuentes seleccionadas. Ve a Mis Fuentes para seleccionar.'
        });
      }

      // Construir filtros dinámicamente (SIN user_id, CON dominios)
      const where = {
        success: true, // Solo resultados exitosos
        domain: { in: selectedDomains }, // 🔹 Filtrar por dominios seleccionados
        AND: []
      };

      // Filtro por categoría
      if (category && category.trim() !== '') {
        where.AND.push({
          category: {
            equals: category.trim(),
            mode: 'insensitive'
          }
        });
      }

      // Filtro por región
      if (region && region.trim() !== '') {
        where.AND.push({
          region: {
            equals: region.trim(),
            mode: 'insensitive'
          }
        });
      }

      // Filtro por dominio
      if (domain && domain.trim() !== '') {
        where.AND.push({
          domain: {
            contains: domain.trim(),
            mode: 'insensitive'
          }
        });
      }

      // Búsqueda de texto libre en contenido y título
      if (q && q.trim() !== '') {
        const searchTerm = q.trim();
        where.AND.push({
          OR: [
            {
              content: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              cleaned_content: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              saved_urls: {
                title: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              }
            },
            {
              saved_urls: {
                description: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              }
            }
          ]
        });
      }

      // Si no hay filtros AND, eliminar el array vacío
      if (where.AND.length === 0) {
        delete where.AND;
      }

      // Validar campo de ordenamiento
      const validSortFields = ['scraped_at', 'created_at', 'category', 'region', 'domain'];
      const orderBy = validSortFields.includes(sortBy) ? sortBy : 'scraped_at';
      const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

      // Generar key de caché
      const cacheKey = cacheService.keys.search(userId, {
        category,
        region,
        domain,
        q,
        page: pageNum,
        limit: limitNum,
        sortBy: orderBy,
        sortOrder: order
      });

      // Ejecutar búsqueda con caché (TTL: 5 minutos)
      const cachedData = await cacheService.getCached(
        cacheKey,
        async () => {
          const [results, totalCount] = await Promise.all([
            prisma.scraping_results.findMany({
          where,
          include: {
            saved_urls: {
              select: {
                id: true,
                url: true,
                title: true,
                description: true,
                domain: true,
                nombre: true,
                region: true,
                created_at: true
              }
            }
          },
          orderBy: {
            [orderBy]: order
          },
              skip,
              take: limitNum
            }),
            prisma.scraping_results.count({ where })
          ]);
          
          return { results, totalCount };
        },
        300 // 5 minutos
      );

      const { results, totalCount } = cachedData;

      // Formatear resultados
      const formattedResults = results.map(result => ({
        id: result.id,
        content: result.cleaned_content || result.content,
        contentPreview: this.generateContentPreview(result.cleaned_content || result.content, q),
        category: result.category,
        region: result.region,
        domain: result.domain,
        scrapedAt: result.scraped_at,
        createdAt: result.created_at,
        url: {
          id: result.saved_urls.id,
          url: result.saved_urls.url,
          title: result.saved_urls.title,
          description: result.saved_urls.description,
          domain: result.saved_urls.domain,
          nombre: result.saved_urls.nombre,
          region: result.saved_urls.region,
          createdAt: result.saved_urls.created_at
        }
      }));

      // Calcular metadatos de paginación
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.json({
        success: true,
        data: formattedResults,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          category: category || null,
          region: region || null,
          domain: domain || null,
          searchTerm: q || null
        }
      });

    } catch (error) {
      console.error('Error en búsqueda avanzada:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Obtiene opciones disponibles para filtros
   * GET /api/search/filters
   */
  async getFilterOptions(req, res) {
    try {
      const userId = req.user.id; // Obtenido del middleware de autenticación
      
      // Obtener dominios seleccionados
      const userSelections = await prisma.userUrlSelection.findMany({
        where: { user_id: userId },
        include: {
          public_url: {
            select: { domain: true, is_active: true }
          }
        }
      });

      const selectedDomains = userSelections
        .filter(s => s.public_url.is_active)
        .map(s => s.public_url.domain);

      if (selectedDomains.length === 0) {
        return res.json({
          success: true,
          data: {
            categories: [],
            regions: [],
            domains: []
          }
        });
      }
      
      // Usar caché para opciones de filtros (TTL: 10 minutos)
      const cacheKey = `filters:${userId}`;
      
      const filterOptions = await cacheService.getCached(
        cacheKey,
        async () => {
          const [categories, regions, domains] = await Promise.all([
        prisma.scraping_results.findMany({
          where: { 
            success: true,
            domain: { in: selectedDomains }, // Filtrar por dominios
            category: { not: null }
          },
          select: { category: true },
          distinct: ['category']
        }),
        prisma.scraping_results.findMany({
          where: { 
            success: true,
            domain: { in: selectedDomains }, // Filtrar por dominios
            region: { not: null }
          },
          select: { region: true },
          distinct: ['region']
        }),
        prisma.scraping_results.findMany({
          where: { 
            success: true,
            domain: { in: selectedDomains } // Filtrar por dominios
          },
            select: { domain: true },
            distinct: ['domain']
          })
        ]);
        
        return {
          categories: categories.map(c => c.category).filter(Boolean).sort(),
          regions: regions.map(r => r.region).filter(Boolean).sort(),
          domains: domains.map(d => d.domain).filter(Boolean).sort()
        };
      },
      600 // 10 minutos
    );

      res.json({
        success: true,
        data: filterOptions
      });

    } catch (error) {
      console.error('Error obteniendo opciones de filtros:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Obtiene estadísticas de búsqueda
   * GET /api/search/stats
   */
  async getSearchStats(req, res) {
    try {
      const userId = req.user.id; // Obtenido del middleware de autenticación
      
      // 🔹 Obtener dominios seleccionados
      const userSelections = await prisma.userUrlSelection.findMany({
        where: { user_id: userId },
        include: {
          public_url: {
            select: { domain: true, is_active: true }
          }
        }
      });

      const selectedDomains = userSelections
        .filter(s => s.public_url.is_active)
        .map(s => s.public_url.domain);

      if (selectedDomains.length === 0) {
        return res.json({
          success: true,
          data: {
            totalResults: 0,
            categoriesCount: 0,
            regionsCount: 0,
            topCategories: [],
            topRegions: []
          }
        });
      }
      
      const stats = await prisma.scraping_results.aggregate({
        where: { 
          success: true,
          domain: { in: selectedDomains } // 🔹 Filtrar por dominios
        },
        _count: {
          id: true
        }
      });

      const categoryStats = await prisma.scraping_results.groupBy({
        by: ['category'],
        where: { 
          success: true,
          domain: { in: selectedDomains }, // 🔹 Filtrar por dominios
          category: { not: null }
        },
        _count: {
          category: true
        },
        orderBy: {
          _count: {
            category: 'desc'
          }
        }
      });

      const regionStats = await prisma.scraping_results.groupBy({
        by: ['region'],
        where: { 
          success: true,
          domain: { in: selectedDomains }, // 🔹 Filtrar por dominios
          region: { not: null }
        },
        _count: {
          region: true
        },
        orderBy: {
          _count: {
            region: 'desc'
          }
        }
      });

      res.json({
        success: true,
        data: {
          totalResults: stats._count.id,
          categoriesCount: categoryStats.length,
          regionsCount: regionStats.length,
          topCategories: categoryStats.slice(0, 10).map(c => ({
            category: c.category,
            count: c._count.category
          })),
          topRegions: regionStats.slice(0, 10).map(r => ({
            region: r.region,
            count: r._count.region
          }))
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Ejecuta scraping automático manualmente (para testing)
   * POST /api/search/run-auto-scraping
   */
  async runAutoScraping(req, res) {
    try {
      const userId = req.user.id; // Obtenido del middleware de autenticación
      const status = autoScraperService.getStatus();
      
      if (status.isRunning) {
        return res.status(409).json({
          success: false,
          error: 'El scraping automático ya está en ejecución',
          status
        });
      }

      // Ejecutar en background solo para las URLs del usuario autenticado
      autoScraperService.runDailyScraping(userId)
        .then(result => {
          console.log('Scraping automático completado:', result);
        })
        .catch(error => {
          console.error('Error en scraping automático:', error);
        });

      res.json({
        success: true,
        message: 'Scraping automático iniciado para tus URLs',
        status: autoScraperService.getStatus()
      });

    } catch (error) {
      console.error('Error iniciando scraping automático:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Obtiene el estado del scraping automático
   * GET /api/search/auto-scraping-status
   */
  async getAutoScrapingStatus(req, res) {
    try {
      const status = autoScraperService.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error obteniendo estado del scraping automático:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Obtiene el contenido completo de un resultado específico
   * GET /api/search/content/:id
   */
  async getContentById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // Obtenido del middleware de autenticación
      
      // Usar caché para resultado individual (TTL: 15 minutos)
      const cacheKey = cacheService.keys.result(id);
      
      // 🔹 Obtener dominios seleccionados para verificar acceso
      const userSelections = await prisma.userUrlSelection.findMany({
        where: { user_id: userId },
        include: {
          public_url: {
            select: { domain: true, is_active: true }
          }
        }
      });

      const selectedDomains = userSelections
        .filter(s => s.public_url.is_active)
        .map(s => s.public_url.domain);

      const result = await cacheService.getCached(
        cacheKey,
        async () => {
          return await prisma.scraping_results.findFirst({
            where: { 
              id: parseInt(id),
              success: true,
              domain: { in: selectedDomains } // 🔹 Verificar que sea de sus dominios
            },
            include: {
              saved_urls: {
                select: {
                  id: true,
                  url: true,
                  title: true,
                  description: true,
                  domain: true,
                  nombre: true,
                  region: true,
                  created_at: true
                }
              },
              public_url: {
                select: {
                  id: true,
                  name: true,
                  url: true,
                  domain: true
                }
              }
            }
          });
        },
        900 // 15 minutos
      );

      // Verificar que el resultado exista y sea de un dominio seleccionado
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Contenido no encontrado o no tienes acceso a esta fuente'
        });
      }

      res.json({
        success: true,
        data: {
          id: result.id,
          title: result.title,
          summary: result.summary,
          content: result.cleaned_content || result.content,
          category: result.category,
          region: result.region,
          domain: result.domain,
          scrapedAt: result.scraped_at,
          createdAt: result.created_at,
          success: result.success,
          url: result.saved_urls ? {
            id: result.saved_urls.id,
            url: result.saved_urls.url,
            title: result.saved_urls.title,
            description: result.saved_urls.description,
            domain: result.saved_urls.domain,
            nombre: result.saved_urls.nombre,
            region: result.saved_urls.region,
            createdAt: result.saved_urls.created_at
          } : result.public_url ? {
            id: result.public_url.id,
            url: result.public_url.url,
            title: result.public_url.name,
            description: null,
            domain: result.public_url.domain,
            nombre: result.public_url.name,
            region: null,
            createdAt: null
          } : null
        }
      });

    } catch (error) {
      console.error('Error al obtener contenido por ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Genera un preview del contenido resaltando términos de búsqueda
   * @param {string} content - Contenido completo
   * @param {string} searchTerm - Término de búsqueda
   * @returns {string} Preview del contenido
   */
  generateContentPreview(content, searchTerm) {
    if (!content) return '';
    
    const maxLength = 300;
    
    if (!searchTerm) {
      return content.length > maxLength 
        ? content.substring(0, maxLength) + '...'
        : content;
    }

    // Buscar la primera ocurrencia del término
    const lowerContent = content.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();
    const index = lowerContent.indexOf(lowerTerm);
    
    if (index === -1) {
      return content.length > maxLength 
        ? content.substring(0, maxLength) + '...'
        : content;
    }

    // Extraer contexto alrededor del término
    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + searchTerm.length + 200);
    
    let preview = content.substring(start, end);
    if (start > 0) preview = '...' + preview;
    if (end < content.length) preview = preview + '...';
    
    return preview;
  }
}

// Caché de interpretaciones de IA (1 hora)
const aiSearchCache = new Map();
const AI_CACHE_TTL = 60 * 60 * 1000; // 1 hora

// Función helper para parsear contenido scrapeado
function parseScrapedContent(content) {
  if (!content) return {};
  
  try {
    if (typeof content === 'string') {
      // Verificar si el contenido parece ser JSON antes de parsear
      const contentStr = content.toString().trim();
      if (contentStr.startsWith('{') || contentStr.startsWith('[')) {
        return JSON.parse(contentStr);
      } else {
        // Si no empieza con { o [, no es JSON válido
        console.warn('⚠️ Contenido en parseScrapedContent no parece ser JSON:', contentStr.substring(0, 100));
        return {
          titulo: 'Sin título',
          contenido: contentStr,
          error: 'Contenido no estaba en formato JSON'
        };
      }
    }
    return content;
  } catch (e) {
    console.warn('⚠️ Error en parseScrapedContent:', e.message);
    return {
      titulo: 'Sin título',
      contenido: typeof content === 'string' ? content : String(content),
      error: 'Error al parsear contenido'
    };
  }
}

// Búsqueda inteligente con IA
const aiSearch = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.body;
    
    // Validación mejorada de query
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'La consulta no puede estar vacía'
      });
    }
    
    const cleanQuery = query.trim();
    
    // Validar longitud máxima
    if (cleanQuery.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'La consulta es demasiado larga (máximo 200 caracteres)'
      });
    }
    
    // Sanitizar query: remover caracteres especiales problemáticos
    const sanitizedQuery = cleanQuery
      .replace(/[¿?¡!]/g, '') // Remover signos de interrogación/exclamación
      .trim();

    console.log(`🔍 Iniciando búsqueda inteligente: "${cleanQuery}"`);
    const startTime = Date.now();

    // Verificar caché de IA
    const cacheKey = `ai_search_${cleanQuery.toLowerCase()}`;
    let aiResult;
    
    const cachedResult = aiSearchCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < AI_CACHE_TTL) {
      console.log('✅ Usando interpretación de IA desde caché');
      aiResult = cachedResult.data;
    } else {
      // Procesar la consulta con IA (usar query sanitizada)
      aiResult = await intelligentSearch(sanitizedQuery || cleanQuery);
      
      // Guardar en caché
      aiSearchCache.set(cacheKey, {
        data: aiResult,
        timestamp: Date.now()
      });
      
      // Limpiar caché antiguo (máximo 100 entradas)
      if (aiSearchCache.size > 100) {
        const firstKey = aiSearchCache.keys().next().value;
        aiSearchCache.delete(firstKey);
      }
    }
    
    console.log('🤖 Resultado de IA:', aiResult);

    // 🔹 NUEVO: Obtener dominios seleccionados por el usuario
    const userSelections = await prisma.userUrlSelection.findMany({
      where: { user_id: req.user.id },
      include: {
        public_url: {
          select: {
            domain: true,
            is_active: true
          }
        }
      }
    });

    // Extraer dominios activos
    const selectedDomains = userSelections
      .filter(s => s.public_url.is_active)
      .map(s => s.public_url.domain);

    console.log(`🎯 Dominios seleccionados por usuario: ${selectedDomains.length}`, selectedDomains);

    // Construir filtros basados en la respuesta de la IA
    const filters = {};
    
    // ✅ FIX: Asegurar que category sea un string único (no array)
    if (aiResult.category) {
      filters.category = Array.isArray(aiResult.category) 
        ? aiResult.category[0] // Tomar el primero si es array
        : aiResult.category;
    }
    
    // ✅ FIX: Asegurar que region sea un string único (no array)
    if (aiResult.region) {
      filters.region = Array.isArray(aiResult.region)
        ? aiResult.region[0]
        : aiResult.region;
    }
    
    // ✅ FIX: Asegurar que domain sea un string único (no array)
    if (aiResult.domain) {
      filters.domain = Array.isArray(aiResult.domain)
        ? aiResult.domain[0]
        : aiResult.domain;
    }

    // Construir condiciones de búsqueda
    const whereConditions = {
      AND: [
        { success: true }, // Solo resultados exitosos
        ...(filters.category ? [{ category: filters.category }] : []),
        ...(filters.region ? [{ region: filters.region }] : []),
        ...(filters.domain ? [{ domain: filters.domain }] : []),
        // 🔹 NUEVO: Filtrar solo por dominios seleccionados
        ...(selectedDomains.length > 0 ? [{ domain: { in: selectedDomains } }] : [])
      ]
    };

    // BÚSQUEDA SEMÁNTICA AMPLIA: Usar TODOS los términos generados por la IA
    if (aiResult.searchTerms && aiResult.searchTerms.length > 0) {
      // ✅ MEJORADO: Usar más términos (hasta 10 términos de búsqueda + 8 conceptos)
      const searchTerms = aiResult.searchTerms.slice(0, 10);
      const semanticTerms = (aiResult.semanticConcepts || []).slice(0, 8);
      const allSearchTerms = [...searchTerms, ...semanticTerms];
      
      console.log(`🎯 Buscando con ${allSearchTerms.length} términos:`, allSearchTerms);
      
      // OPTIMIZADO: Buscar solo en campos indexados
      const semanticConditions = allSearchTerms.flatMap(term => [
        // Buscar en contenido limpio
        { cleaned_content: { contains: term, mode: 'insensitive' } },
        // Buscar en título del resultado
        { title: { contains: term, mode: 'insensitive' } },
        // Buscar en resumen
        { summary: { contains: term, mode: 'insensitive' } }
      ]);
      
      // ✅ MEJORADO: Al menos UNO de los términos debe aparecer
      whereConditions.AND.push({
        OR: semanticConditions
      });
    } else {
      // ✅ FALLBACK: Si la IA no genera términos, usar la query original
      const originalTerms = cleanQuery.split(' ').filter(t => t.length > 2);
      if (originalTerms.length > 0) {
        console.log(`⚠️ Usando términos originales como fallback:`, originalTerms);
        whereConditions.AND.push({
          OR: originalTerms.flatMap(term => [
            { cleaned_content: { contains: term, mode: 'insensitive' } },
            { title: { contains: term, mode: 'insensitive' } },
            { summary: { contains: term, mode: 'insensitive' } }
          ])
        });
      }
    }

    // BÚSQUEDA SEMÁNTICA: Traer más resultados para calcular relevancia
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // ✅ MEJORADO: Aumentar a 50 resultados para mejor cobertura
    const maxResults = 50;
    
    const [allResults, totalCount] = await Promise.all([
      prisma.scraping_results.findMany({
        where: whereConditions,
        orderBy: { scraped_at: 'desc' },
        take: maxResults,
        select: {
          id: true,
          title: true,
          summary: true,
          content: true,
          cleaned_content: true,
          category: true,
          region: true,
          domain: true,
          scraped_at: true,
          content_length: true,
          saved_urls: {
            select: {
              title: true,
              description: true,
              url: true
            }
          },
          public_url: {
            select: {
              name: true,
              url: true
            }
          }
        }
      }),
      prisma.scraping_results.count({
        where: whereConditions
      })
    ]);

    // CALCULAR SCORE DE RELEVANCIA para cada resultado (OPTIMIZADO)
    const resultsWithScore = allResults.map(result => {
      let score = 0;
      
      // Parsear contenido UNA SOLA VEZ
      const parsedContent = parseScrapedContent(result.content);
      
      // Preparar textos (lowercase una sola vez)
      const titleText = (parsedContent.titulo || result.saved_urls?.title || '').toLowerCase();
      const descText = (result.saved_urls?.description || '').toLowerCase();
      // OPTIMIZADO: Solo primeros 2000 caracteres del contenido
      const contentText = (result.cleaned_content || parsedContent.contenido || '').toLowerCase().substring(0, 2000);
      
      // Usar los mismos términos limitados
      const searchTerms = aiResult.searchTerms.slice(0, 5);
      const semanticTerms = (aiResult.semanticConcepts || []).slice(0, 2);
      const allTerms = [...searchTerms, ...semanticTerms];
      
      // Pre-compilar regex fuera del loop
      const termRegexes = allTerms.map(term => ({
        term: term.toLowerCase(),
        regex: new RegExp(term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      }));
      
      termRegexes.forEach(({ term, regex }) => {
        // Título: 10 puntos por aparición
        if (titleText.includes(term)) {
          score += 10;
        }
        
        // Descripción: 5 puntos
        if (descText.includes(term)) {
          score += 5;
        }
        
        // Contenido: 2 puntos por aparición (máximo 10 matches por término)
        const contentMatches = (contentText.match(regex) || []).length;
        score += Math.min(contentMatches, 10) * 2;
      });
      
      // Bonus por categoría correcta
      if (filters.category && result.category === filters.category) {
        score += 15;
      }
      
      // Bonus por región correcta
      if (filters.region && result.region === filters.region) {
        score += 10;
      }
      
      return {
        ...result,
        relevanceScore: score
      };
    });
    
    // ORDENAR POR RELEVANCIA (score descendente)
    resultsWithScore.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // FILTRAR: Solo mostrar noticias con score > 5 (al menos algo de relevancia)
    const relevantResults = resultsWithScore.filter(r => r.relevanceScore > 5);
    
    // PAGINAR los resultados relevantes
    const results = relevantResults.slice(skip, skip + limitNum);

    // ANÁLISIS DE SENTIMIENTO Y AGRUPACIÓN POR TEMAS
    console.log(' Analizando sentimiento y agrupando por temas...');
    const analysisResult = await sentimentAnalyzer.analyzeBatch(
      results.map(r => ({
        id: r.id,
        title: r.title || r.saved_urls?.title || r.public_url?.name || 'Sin título',
        content: r.cleaned_content || r.content || '',
        category: r.category,
        domain: r.domain
      })),
      {
        includeSentiment: true,
        includeClustering: results.length >= 3, // Solo agrupar si hay 3+ resultados
        maxConcurrent: 2
      }
    );

    const sentimentStats = sentimentAnalyzer.getSentimentStats(analysisResult.articles);
    console.log(` Sentimiento: ${sentimentStats.positive} positivos, ${sentimentStats.negative} negativos, ${sentimentStats.neutral} neutrales`);
    console.log(` Temas identificados: ${analysisResult.clusters.length}`);

    // Generar previews con términos destacados y score de relevancia
    const resultsWithPreviews = results.map((result, index) => {
      const analysis = analysisResult.articles[index] || {};
      // Parsear contenido UNA SOLA VEZ (ya parseado arriba, pero por si acaso)
      const parsedContent = parseScrapedContent(result.content);
      
      // Usar cleaned_content para preview (más rápido)
      const contentForPreview = result.cleaned_content || parsedContent.contenido || result.content;
      
      // PRIORIDAD para título: result.title > saved_urls.title > public_url.name > parsedContent.titulo > 'Sin título'
      const titulo = result.title || result.saved_urls?.title || result.public_url?.name || parsedContent.titulo || 'Sin título';
      
      // PRIORIDAD para URL: saved_urls.url > public_url.url > 'URL no disponible'
      const url = result.saved_urls?.url || result.public_url?.url || 'URL no disponible';
      
      return {
        ...result,
        titulo: titulo,
        url: url,
        preview: generateContentPreview(contentForPreview, aiResult.searchTerms),
        relevanceScore: result.relevanceScore,
        relevancePercentage: Math.min(100, Math.round((result.relevanceScore / 50) * 100)), // Normalizar a 100%
        // 🆕 Agregar análisis de sentimiento
        sentiment: analysis.sentiment || 'neutral',
        sentimentScore: analysis.sentimentScore || 0.5,
        sentimentKeywords: analysis.sentimentKeywords || []
      };
    });

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    console.log(`✅ Búsqueda semántica completada: ${relevantResults.length} resultados relevantes de ${totalCount} totales en ${executionTime}ms`);

    res.json({
      success: true,
      data: {
        results: resultsWithPreviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(relevantResults.length / limitNum),
          totalResults: relevantResults.length,
          totalInDatabase: totalCount,
          resultsPerPage: limitNum
        },
        aiInterpretation: {
          explanation: aiResult.explanation,
          confidence: aiResult.confidence,
          appliedFilters: filters,
          searchTerms: aiResult.searchTerms,
          semanticConcepts: aiResult.semanticConcepts || []
        },
        searchQuality: {
          relevantResults: relevantResults.length,
          totalScanned: allResults.length,
          averageScore: relevantResults.length > 0 
            ? Math.round(relevantResults.reduce((sum, r) => sum + r.relevanceScore, 0) / relevantResults.length)
            : 0
        },
        // 🆕 Estadísticas de sentimiento
        sentimentAnalysis: {
          stats: sentimentStats,
          clusters: analysisResult.clusters.map(cluster => ({
            theme: cluster.theme,
            articleCount: cluster.articles.length,
            keywords: cluster.keywords,
            description: cluster.description,
            articleIds: cluster.articles.map(a => a.id)
          }))
        },
        executionTime: `${executionTime}ms`
      }
    });

  } catch (error) {
    console.error('❌ Error en búsqueda semántica:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor en búsqueda semántica',
      details: error.message
    });
  }
};

// Crear instancia y exportar métodos vinculados
const searchController = new SearchController();

module.exports = {
  advancedSearch: searchController.advancedSearch.bind(searchController),
  getFilterOptions: searchController.getFilterOptions.bind(searchController),
  getSearchStats: searchController.getSearchStats.bind(searchController),
  runAutoScraping: searchController.runAutoScraping.bind(searchController),
  getAutoScrapingStatus: searchController.getAutoScrapingStatus.bind(searchController),
  getContentById: searchController.getContentById.bind(searchController),
  aiSearch
};