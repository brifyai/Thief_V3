const scrapingService = require('../services/scraping.service');
const aiService = require('../services/ai.service');
const { supabase } = require('../config/database');
const { categorizeWithAI } = require('../services/ai.service');
const { isValidTitle, isValidContent } = require('../utils/contentValidator');
const { cleanContent, generateSummary, extractTitleFromContent, isValidTitle: isValidTitleCleaner } = require('../utils/contentCleaner');
const aiEnhancer = require('../services/aiEnhancer.service');
const { invalidateAfterScrapingResult } = require('../middleware/cacheInvalidation');

/**
 * Detecta categoría basándose en palabras clave (fallback cuando IA falla)
 */
function detectCategoryByKeywords(text) {
  const textLower = text.toLowerCase();
  
  const keywords = {
    'politica': ['presidente', 'gobierno', 'congreso', 'ministro', 'elecciones', 'ley', 'senado', 'diputado'],
    'economia': ['economía', 'dólar', 'inflación', 'banco', 'mercado', 'empresa', 'inversión', 'finanzas'],
    'deportes': ['fútbol', 'deporte', 'gol', 'partido', 'equipo', 'campeonato', 'jugador', 'copa'],
    'tecnologia': ['tecnología', 'software', 'app', 'digital', 'internet', 'inteligencia artificial', 'startup'],
    'salud': ['salud', 'hospital', 'médico', 'enfermedad', 'tratamiento', 'vacuna', 'paciente'],
    'seguridad': ['delincuencia', 'robo', 'crimen', 'policía', 'delito', 'asalto', 'violencia'],
    'entretenimiento': ['música', 'cine', 'película', 'artista', 'concierto', 'festival', 'serie']
  };
  
  let maxMatches = 0;
  let detectedCategory = 'general';
  
  for (const [category, words] of Object.entries(keywords)) {
    const matches = words.filter(word => textLower.includes(word)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedCategory = category;
    }
  }
  
  return detectedCategory;
}

// POST /scrape - Código original sin cambios
const scrape = async (req, res) => {
  try {
    const { url: targetUrl, keyword } = req.body;

    if (!targetUrl) {
      return res.status(400).json({ error: "URL es requerida" });
    }

    const result = await scrapingService.scrapeSite(targetUrl, keyword);
    res.json(result);
  } catch (error) {
    console.error("Error en scrape:", error);
    res.status(500).json({
      error: "Error al obtener los datos",
      detalle: error.message,
    });
  }
};

// POST /scrape-single - Con soporte para smart scraper y metadata
const scrapeSingle = async (req, res) => {
  try {
    let { url, customSelectors } = req.body;

    if (!url) {
      return res.status(400).json({
        error: "URL es requerida",
        success: false,
      });
    }

    const result = await scrapingService.scrapeSingleArticle(url, customSelectors);
    
    // Agregar información adicional si el scraping necesita ayuda
    if (result.metadata?.needsHelp) {
      result.showHelpModal = true;
      result.helpMessage = result.metadata.confidence < 0.5 
        ? "La extracción tiene baja confianza. Considera agregar configuración específica para este sitio."
        : "No se pudo extraer el contenido. Este sitio necesita configuración manual.";
    }
    
    res.json(result);
  } catch (error) {
    console.error("Error en scrape-single:", error);
    let mensajeError = "Error al obtener los datos de la noticia";

    if (error.response) {
      mensajeError = `Error ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      mensajeError = "No se pudo conectar con el servidor";
    }

    res.status(error.response?.status || 500).json({
      error: mensajeError,
      detalle: error.message,
      success: false,
    });
  }
};

// POST /rewrite-with-ai - Código original sin cambios
const rewriteWithAI = async (req, res) => {
  console.log("Recibida solicitud de reescritura");
  const titulo = req.body.titulo;
  
  try {
    const { titulo, contenido } = req.body;
    console.log("Datos recibidos:", { 
      titulo, 
      contenidoLength: contenido ? contenido.length : 0 
    });

    if (!titulo || !contenido) {
      console.log("Faltan datos requeridos");
      return res.status(400).json({
        error: "Se requieren tanto el título como el contenido",
      });
    }

    const resultado = await aiService.rewriteWithAI(titulo, contenido);
    return res.json(resultado);
  } catch (error) {
    console.error("Error en rewrite-with-ai:", error);
    return res.status(500).json({
      error: error.message,
      errorType: "AI_REWRITE_ERROR",
      originalTitle: titulo || "Título no disponible"
    });
  }
};

// POST /api/scraping/save - Guardar contenido scrapeado en BD
const saveScrapedContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { url, titulo, contenido, fecha, autor, imagenes, metadata } = req.body;

    // Validación básica de campos requeridos
    if (!url || !titulo || !contenido) {
      return res.status(400).json({
        error: 'URL, título y contenido son requeridos',
        success: false
      });
    }

    // Validación de calidad del contenido
    if (!isValidTitle(titulo)) {
      return res.status(400).json({
        error: 'El título es inválido o muy corto (mínimo 10 caracteres)',
        success: false
      });
    }

    if (!isValidContent(contenido)) {
      return res.status(400).json({
        error: 'El contenido es inválido o muy corto (mínimo 100 caracteres)',
        success: false
      });
    }

    // Validar formato de URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        error: 'URL inválida',
        success: false
      });
    }

    // 🔹 NUEVO: Buscar PublicUrl (URLs globales compartidas)
    const domain = new URL(url).hostname.replace('www.', '');
    
    let publicUrl = await prisma.publicUrl.findFirst({
      where: { url: url }
    });

    // Si no existe como PublicUrl, buscar en saved_urls (compatibilidad legacy)
    let savedUrl = null;
    if (!publicUrl) {
      savedUrl = await prisma.saved_urls.findFirst({
        where: {
          user_id: userId,
          url: url
        }
      });

      if (!savedUrl) {
        savedUrl = await prisma.saved_urls.create({
          data: {
            user_id: userId,
            url: url,
            title: titulo,
            domain: domain
          }
        });
      }
    }

    // Categorizar contenido con IA
    let category = null;
    let region = null;
    
    try {
      const categorization = await categorizeWithAI(titulo, contenido, url);
      category = categorization.category;
      region = categorization.region;
      console.log('✅ Contenido categorizado:', { category, region, confidence: categorization.confidence });
    } catch (error) {
      console.warn('⚠️ No se pudo categorizar el contenido:', error.message);
      // Categorización por defecto basada en palabras clave
      category = detectCategoryByKeywords(titulo + ' ' + contenido);
      console.log('📝 Categoría detectada por palabras clave:', category);
    }

    // Limpiar contenido
    const cleanedContent = cleanContent(contenido);
    
    // Validar que haya contenido limpio
    if (!cleanedContent || cleanedContent.length < 50) {
      return res.status(400).json({
        error: 'El contenido limpio es demasiado corto o está vacío',
        success: false
      });
    }
    
    // Validar y mejorar título
    let finalTitle = titulo;
    let summary = null;
    
    // Si no hay título o es inválido, intentar generarlo
    if (!finalTitle || !isValidTitleCleaner(finalTitle)) {
      console.log('🤖 Título faltante o inválido, intentando generar con IA...');
      
      try {
        const aiResult = await aiEnhancer.generateTitleAndSummary(cleanedContent);
        
        if (aiResult.title) {
          finalTitle = aiResult.title;
          summary = aiResult.summary;
          console.log(`✅ IA generó título: "${finalTitle}"`);
        } else {
          // Fallback: extraer del contenido
          finalTitle = extractTitleFromContent(cleanedContent);
          console.log(`⚠️ Usando título extraído del contenido: "${finalTitle}"`);
        }
      } catch (error) {
        console.error('❌ Error generando título con IA:', error.message);
        finalTitle = extractTitleFromContent(cleanedContent);
      }
    } else {
      // Generar resumen aunque el título sea válido
      summary = generateSummary(cleanedContent, 200);
    }
    
    // Asegurar que siempre haya un título válido
    if (!finalTitle || finalTitle.length < 5) {
      finalTitle = "Sin título";
    }
    
    // Preparar contenido para guardar (JSON con todos los datos)
    const contentToSave = JSON.stringify({
      titulo: finalTitle,
      contenido: cleanedContent,
      fecha,
      autor,
      imagenes: imagenes || [],
      metadata: metadata || {}
    });

    // 🔹 NUEVO: Guardar resultado con public_url_id o saved_url_id
    const scrapingResult = await prisma.scraping_results.create({
      data: {
        user_id: userId,
        public_url_id: publicUrl ? publicUrl.id : null,     // ← NUEVO: PublicUrl
        saved_url_id: savedUrl ? savedUrl.id : null,        // ← Legacy: saved_urls
        title: finalTitle,
        summary: summary,
        content: contentToSave,
        cleaned_content: cleanedContent,
        scraping_type: 'single',
        success: true,
        category: category,
        domain: domain,
        region: region,
        scraped_at: new Date(),
        content_length: cleanedContent.length
      }
    });
    
    console.log(`✅ Guardado: Título="${finalTitle}", Contenido=${cleanedContent.length} chars`);

    // Actualizar estadísticas del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.scraping_stats.upsert({
      where: {
        user_id_date: {
          user_id: userId,
          date: today
        }
      },
      update: {
        total_scrapes: { increment: 1 },
        successful_scrapes: { increment: 1 }
      },
      create: {
        user_id: userId,
        date: today,
        total_scrapes: 1,
        successful_scrapes: 1,
        failed_scrapes: 0
      }
    });

    res.json({
      success: true,
      message: 'Contenido guardado exitosamente',
      data: {
        id: scrapingResult.id,
        category,
        region,
        savedUrlId: savedUrl.id
      }
    });
  } catch (error) {
    console.error('Error al guardar contenido scrapeado:', error);
    res.status(500).json({
      error: 'Error al guardar el contenido',
      detalle: error.message,
      success: false
    });
  }
};

// GET /api/scraping/history - Obtener últimas 10 noticias de una URL específica
const getScrapingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: 'URL es requerida',
        success: false
      });
    }

    // Buscar saved_url
    const savedUrl = await prisma.saved_urls.findFirst({
      where: {
        user_id: userId,
        url: url
      }
    });

    if (!savedUrl) {
      return res.json({
        success: true,
        data: [],
        message: 'No hay historial para esta URL'
      });
    }

    // Obtener últimas 10 noticias scrapeadas
    const results = await prisma.scraping_results.findMany({
      where: {
        saved_url_id: savedUrl.id,
        success: true
      },
      orderBy: {
        scraped_at: 'desc'
      },
      take: 10,
      select: {
        id: true,
        content: true,
        category: true,
        region: true,
        scraped_at: true,
        created_at: true
      }
    });

    // Parsear contenido JSON
    const parsedResults = results.map(result => {
      try {
        let parsed = {};
        if (result.content) {
          // Verificar si el contenido parece ser JSON antes de parsear
          const contentStr = result.content.toString().trim();
          if (contentStr.startsWith('{') || contentStr.startsWith('[')) {
            parsed = JSON.parse(contentStr);
          } else {
            // Si no empieza con { o [, no es JSON válido
            console.warn('⚠️ Contenido en historial no parece ser JSON:', contentStr.substring(0, 100));
            throw new Error('Contenido no es formato JSON');
          }
        }
        
        return {
          id: result.id,
          titulo: parsed.titulo || result.title || 'Sin título',
          contenido: parsed.contenido?.substring(0, 200) + '...' || result.cleaned_content?.substring(0, 200) + '...' || 'Sin contenido',
          fecha: parsed.fecha,
          autor: parsed.autor,
          category: result.category,
          region: result.region,
          scraped_at: result.scraped_at,
          created_at: result.created_at
        };
      } catch (e) {
        console.warn('⚠️ Error parseando contenido en historial:', e.message);
        // Retornar un resultado básico incluso si el JSON falla
        return {
          id: result.id,
          titulo: result.title || 'Sin título',
          contenido: result.cleaned_content?.substring(0, 200) + '...' || 'Contenido no disponible',
          fecha: null,
          autor: null,
          category: result.category,
          region: result.region,
          scraped_at: result.scraped_at,
          created_at: result.created_at
        };
      }
    }).filter(Boolean);

    res.json({
      success: true,
      data: parsedResults,
      total: parsedResults.length
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      error: 'Error al obtener el historial',
      detalle: error.message,
      success: false
    });
  }
};

// GET /api/scraping/content/:id - Obtener contenido completo de un scraping
const getScrapingContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Buscar el resultado - puede ser de URLs privadas (con user_id) o públicas (sin user_id)
    const result = await prisma.scraping_results.findFirst({
      where: {
        id: parseInt(id),
        OR: [
          { user_id: userId },           // URLs privadas del usuario
          { user_id: null }              // URLs públicas (sin user_id)
        ]
      },
      include: {
        saved_urls: true,
        public_url: true
      }
    });

    if (!result) {
      return res.status(404).json({
        error: 'Contenido no encontrado',
        success: false
      });
    }

    // Intentar parsear el contenido
    let parsed = {};
    try {
      if (result.content) {
        // Verificar si el contenido parece ser JSON antes de parsear
        const contentStr = result.content.toString().trim();
        if (contentStr.startsWith('{') || contentStr.startsWith('[')) {
          parsed = JSON.parse(contentStr);
        } else {
          // Si no empieza con { o [, no es JSON válido
          console.warn('⚠️ Contenido no parece ser JSON, usando como texto plano:', contentStr.substring(0, 100));
          throw new Error('Contenido no es formato JSON');
        }
      }
    } catch (parseError) {
      console.error('Error al parsear content JSON:', parseError);
      // Si no es JSON, usar el contenido como texto plano
      parsed = {
        titulo: result.title || result.saved_urls?.title || result.public_url?.name || 'Sin título',
        contenido: result.content || result.cleaned_content || 'Sin contenido',
        error: 'Contenido no estaba en formato JSON'
      };
    }

    // Asegurar que siempre haya un título (prioridad: result.title > saved_urls > public_url > parsed)
    if (!parsed.titulo) {
      parsed.titulo = result.title || result.saved_urls?.title || result.public_url?.name || 'Sin título';
    }

    // Usar cleaned_content si contenido está vacío
    if (!parsed.contenido && result.cleaned_content) {
      parsed.contenido = result.cleaned_content;
    }

    res.json({
      success: true,
      data: {
        ...parsed,
        titulo: result.title || parsed.titulo,  // Priorizar result.title
        url: result.saved_urls?.url || result.public_url?.url || 'URL no disponible',
        category: result.category,
        region: result.region,
        domain: result.domain,
        scraped_at: result.scraped_at
      }
    });
  } catch (error) {
    console.error('Error al obtener contenido:', error);
    res.status(500).json({
      error: 'Error al obtener el contenido',
      detalle: error.message,
      success: false
    });
  }
};

// POST /api/scraping/test-selectors - Probar selectores personalizados
const testCustomSelectors = async (req, res) => {
  try {
    const { url, customSelectors } = req.body;
    
    // Validar
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL es requerida'
      });
    }
    
    if (!customSelectors || (!customSelectors.titleSelector && !customSelectors.contentSelector)) {
      return res.status(400).json({
        success: false,
        error: 'Debes proporcionar al menos un selector de título o contenido'
      });
    }
    
    // Probar selectores
    const result = await scrapingService.testCustomSelectors(url, customSelectors);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Selectores probados exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'No se pudo extraer contenido con los selectores proporcionados'
      });
    }
  } catch (error) {
    console.error('Error al probar selectores:', error);
    res.status(500).json({
      success: false,
      error: 'Error al probar selectores',
      detalle: error.message
    });
  }
};

// POST /api/scraping/scrape-listing - Scrapear múltiples noticias de un listado
const scrapeListingPage = async (req, res) => {
  try {
    const { url, listingSelectors, articleSelectors } = req.body;
    
    // Validar URL
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL es requerida'
      });
    }
    
    // Validar selectores de listado
    if (!listingSelectors || !listingSelectors.containerSelector || !listingSelectors.linkSelector) {
      return res.status(400).json({
        success: false,
        error: 'Selectores de listado son requeridos (containerSelector y linkSelector)'
      });
    }
    
    // Validar selectores de artículo
    if (!articleSelectors || (!articleSelectors.titleSelector && !articleSelectors.contentSelector)) {
      return res.status(400).json({
        success: false,
        error: 'Selectores de artículo son requeridos (al menos titleSelector o contentSelector)'
      });
    }
    
    console.log('📋 Iniciando scraping de listado...');
    console.log('   URL:', url);
    console.log('   Selectores de listado:', listingSelectors);
    console.log('   Selectores de artículo:', articleSelectors);
    
    // Scrapear listado
    const result = await scrapingService.scrapeListingPage(
      url, 
      listingSelectors, 
      articleSelectors
    );
    
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: `Scrapeadas ${result.totalScraped} de ${result.totalFound} noticias (${result.successRate}% éxito)`
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'No se pudo scrapear el listado'
      });
    }
  } catch (error) {
    console.error('Error al scrapear listado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al scrapear listado',
      detalle: error.message
    });
  }
};

// POST /api/scraping/test-listing - Probar selectores de listado (solo extraer URLs)
const testListingSelectors = async (req, res) => {
  try {
    const { url, listingSelectors } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL es requerida'
      });
    }
    
    if (!listingSelectors || !listingSelectors.containerSelector || !listingSelectors.linkSelector) {
      return res.status(400).json({
        success: false,
        error: 'Selectores de listado son requeridos'
      });
    }
    
    const puppeteer = require('puppeteer');
    const browserConfig = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    
    const browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const newsUrls = await page.evaluate((selectors) => {
        const containers = document.querySelectorAll(selectors.containerSelector);
        const urls = [];
        
        containers.forEach((container, index) => {
          try {
            const linkEl = container.querySelector(selectors.linkSelector);
            const titleEl = selectors.titleSelector ? container.querySelector(selectors.titleSelector) : null;
            
            if (linkEl) {
              const href = linkEl.href || linkEl.getAttribute('href');
              if (href && href.startsWith('http')) {
                urls.push({
                  url: href,
                  previewTitle: titleEl ? titleEl.textContent.trim() : `Noticia ${index + 1}`,
                  index: index + 1
                });
              }
            }
          } catch (e) {
            console.error('Error extrayendo noticia:', e);
          }
        });
        
        return urls;
      }, listingSelectors);
      
      await browser.close();
      
      if (newsUrls.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No se encontraron noticias con los selectores proporcionados'
        });
      }
      
      res.json({
        success: true,
        newsUrls: newsUrls,
        total: newsUrls.length,
        message: `Encontradas ${newsUrls.length} noticias`
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error('Error al probar selectores de listado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al probar selectores de listado',
      detalle: error.message
    });
  }
};

// POST /api/scraping/save-listing-content - Guardar contenido de listado SIN crear saved_urls individuales
const saveListingContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingUrl, articles } = req.body;

    // Validación
    if (!listingUrl || !articles || !Array.isArray(articles)) {
      return res.status(400).json({
        error: 'listingUrl y articles (array) son requeridos',
        success: false
      });
    }

    // Buscar o crear saved_url SOLO para la URL principal del listado
    const domain = new URL(listingUrl).hostname.replace('www.', '');
    
    let savedUrl = await prisma.saved_urls.findFirst({
      where: {
        user_id: userId,
        url: listingUrl
      }
    });

    if (!savedUrl) {
      savedUrl = await prisma.saved_urls.create({
        data: {
          user_id: userId,
          url: listingUrl,
          title: `Listado - ${domain}`,
          domain: domain
        }
      });
    }

    // Guardar cada artículo asociado al saved_url del listado principal
    let savedCount = 0;
    const errors = [];

    for (const article of articles) {
      try {
        // Validar artículo
        if (!article.titulo || !article.contenido || article.contenido.length < 100) {
          errors.push({ url: article.sourceUrl, error: 'Contenido inválido o muy corto' });
          continue;
        }

        // Categorizar contenido
        let category = null;
        let region = null;
        
        try {
          const categorization = await categorizeWithAI(article.titulo, article.contenido, article.sourceUrl);
          category = categorization.category;
          region = categorization.region;
        } catch (error) {
          category = detectCategoryByKeywords(article.titulo + ' ' + article.contenido);
        }

        // Preparar contenido
        const contentToSave = JSON.stringify({
          titulo: article.titulo,
          contenido: article.contenido,
          fecha: article.fecha,
          autor: article.autor,
          imagenes: article.imagenes || [],
          sourceUrl: article.sourceUrl,
          metadata: {
            listingUrl: listingUrl,
            listingIndex: article.listingIndex,
            scrapedAt: article.scrapedAt
          }
        });

        // Guardar resultado asociado al saved_url del listado
        await prisma.scraping_results.create({
          data: {
            user_id: userId,
            saved_url_id: savedUrl.id, // Asociar al listado principal
            content: contentToSave,
            cleaned_content: article.contenido,
            scraping_type: 'listing',
            success: true,
            category: category,
            domain: domain,
            region: region,
            scraped_at: new Date(),
            content_length: article.contenido.length
          }
        });

        savedCount++;
      } catch (error) {
        console.error('Error guardando artículo:', error);
        errors.push({ url: article.sourceUrl, error: error.message });
      }
    }

    // Invalidar caché
    await invalidateAfterScrapingResult(userId);

    res.json({
      success: true,
      message: `${savedCount} artículos guardados exitosamente`,
      savedCount: savedCount,
      totalArticles: articles.length,
      errors: errors.length > 0 ? errors : undefined,
      listingUrl: listingUrl,
      savedUrlId: savedUrl.id
    });

  } catch (error) {
    console.error('Error en saveListingContent:', error);
    res.status(500).json({
      error: 'Error al guardar contenido del listado',
      detalle: error.message,
      success: false
    });
  }
};

module.exports = {
  scrape,
  scrapeSingle,
  rewriteWithAI,
  saveScrapedContent,
  saveListingContent,
  getScrapingHistory,
  getScrapingContent,
  testCustomSelectors,
  scrapeListingPage,
  testListingSelectors
};
