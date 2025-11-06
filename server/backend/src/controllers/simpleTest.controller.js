// ========================================
// SIMPLE TEST CONTROLLER
// Sistema simplificado de testing de URLs
// ========================================

const { scrapeSite } = require('../services/scraping.service');
const newsService = require('../services/news.service');

/**
 * POST /api/simple-test
 * Test ultra-simplificado: solo URL
 */
const simpleTest = async (req, res) => {
  try {
    const { url, save = false } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL requerida'
      });
    }

    // Validar URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'URL inválida'
      });
    }

    console.log(`🧪 Test simple: ${url}${save ? ' (con guardado)' : ''}`);

    // Scrapear automáticamente
    const result = await scrapeSite(url);

    if (!result || !result.noticias || result.noticias.length === 0) {
      return res.json({
        success: false,
        error: 'No se encontraron noticias',
        url,
        news_count: 0,
        suggestions: [
          'Verifica que la URL sea correcta',
          'Asegúrate que la página tenga artículos',
          'Intenta con la URL de una categoría específica'
        ]
      });
    }

    // Si se solicita guardar, persistir las noticias
    let savedCount = 0;
    let savedNews = [];
    
    if (save === true || save === 'true') {
      console.log(`💾 Guardando ${result.noticias.length} noticias en la base de datos...`);
      
      try {
        for (const noticia of result.noticias) {
          try {
            // Extraer contenido completo de cada noticia
            const articleResult = await require('../services/scraping.service').scrapeSingleArticle(noticia.enlace);
            
            if (articleResult.success) {
              // Preparar datos para guardar
              // Manejar fecha de publicación de forma segura
              let publishedAt;
              try {
                if (articleResult.fecha) {
                  const dateObj = new Date(articleResult.fecha);
                  publishedAt = isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString();
                } else {
                  publishedAt = new Date().toISOString();
                }
              } catch (e) {
                publishedAt = new Date().toISOString();
              }

              const newsData = {
                title: noticia.titulo || articleResult.titulo || 'Sin título',
                content: articleResult.contenido || noticia.descripcion || 'Contenido no disponible',
                url: noticia.enlace,
                source: new URL(noticia.enlace).hostname.replace('www.', ''),
                domain: new URL(noticia.enlace).hostname,
                author: articleResult.autor || 'Autor no especificado',
                published_at: publishedAt,
                scraped_at: new Date().toISOString(),
                category: 'General',
                tags: [],
                image_url: articleResult.imagenes?.[0] || null,
                summary: (noticia.descripcion || articleResult.contenido || '').substring(0, 200) + '...',
                word_count: (articleResult.contenido || '').split(' ').length,
                reading_time: Math.ceil((articleResult.contenido || '').split(' ').length / 200),
                language: 'es',
                status: 'published',
                priority: 2,
                is_selected: false,
                selected_by: null,
                selection_date: null,
                humanized_content: null,
                humanization_tone: null,
                humanization_style: null,
                humanization_complexity: null,
                humanization_date: null,
                humanization_cost: 0,
                humanization_tokens: 0,
                version: 1,
                parent_id: null
              };

              // Guardar en Supabase
              const { supabase } = require('../config/database');
              const { data, error } = await supabase
                .from('news')
                .insert([newsData])
                .select();

              if (error) {
                console.warn(`⚠️ Error guardando noticia "${noticia.titulo}":`, error.message);
              } else {
                savedCount++;
                savedNews.push(data[0]);
                console.log(`✅ Guardada: ${noticia.titulo.substring(0, 50)}...`);
              }
            }
          } catch (error) {
            console.warn(`⚠️ Error extrayendo contenido de "${noticia.titulo}":`, error.message);
          }
        }
        
        console.log(`🎉 Guardado completado: ${savedCount}/${result.noticias.length} noticias guardadas`);
        
      } catch (error) {
        console.error('❌ Error guardando noticias:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al guardar las noticias',
          details: error.message
        });
      }
    }

    // Éxito
    return res.json({
      success: true,
      url,
      news_count: result.noticias.length,
      saved_count: savedCount,
      preview: result.noticias.slice(0, 3).map(n => ({
        title: n.titulo || 'Sin título',
        url: n.enlace,
        excerpt: (n.descripcion || n.contenido || '').substring(0, 150)
      })),
      method: result.metadata?.strategy || 'auto',
      confidence: result.metadata?.confidence || 0,
      message: save
        ? `✅ Se encontraron ${result.noticias.length} noticias y se guardaron ${savedCount} correctamente`
        : `✅ Se encontraron ${result.noticias.length} noticias (vista previa)`
    });

  } catch (error) {
    console.error('Error en simpleTest:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al probar la URL',
      details: error.message
    });
  }
};

/**
 * POST /api/simple-test/with-selectors
 * Test con selectores personalizados (opcional)
 */
const testWithSelectors = async (req, res) => {
  try {
    const { url, selectors, listingSelectors } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL requerida'
      });
    }

    console.log(`🧪 Test con selectores: ${url}`);
    console.log('📋 Selectores recibidos:', { selectors, listingSelectors });

    const domain = new URL(url).hostname;

    // Preparar configuración temporal
    const options = {
      temporaryConfig: {
        domain,
        name: `Test: ${domain}`,
        selectors: {
          titleSelector: selectors?.titleSelector || selectors?.title || null,
          contentSelector: selectors?.contentSelector || selectors?.content || null,
          dateSelector: selectors?.dateSelector || selectors?.date || null,
          authorSelector: selectors?.authorSelector || selectors?.author || null,
          imageSelector: selectors?.imageSelector || selectors?.image || null
        },
        listingSelectors: null
      }
    };

    // Agregar selectores de listado si existen
    if (listingSelectors && listingSelectors.containerSelector && listingSelectors.linkSelector) {
      options.temporaryConfig.listingSelectors = {
        containerSelector: listingSelectors.containerSelector,
        linkSelector: listingSelectors.linkSelector,
        titleSelector: listingSelectors.titleSelector || null
      };
      console.log('✅ Selectores de listado agregados:', options.temporaryConfig.listingSelectors);
    }

    console.log('🚀 Opciones finales:', JSON.stringify(options, null, 2));

    const result = await scrapeSite(url, options);

    console.log('📊 Resultado del scraping:', {
      success: !!result,
      noticiasCount: result?.noticias?.length || 0,
      metadata: result?.metadata
    });

    if (!result || !result.noticias || result.noticias.length === 0) {
      return res.json({
        success: false,
        error: 'No se encontraron noticias con estos selectores',
        url,
        news_count: 0,
        debug: {
          selectorsUsed: options.temporaryConfig,
          resultReceived: !!result
        }
      });
    }

    return res.json({
      success: true,
      url,
      news_count: result.noticias.length,
      preview: result.noticias.slice(0, 5).map(n => ({
        title: n.titulo || 'Sin título',
        url: n.enlace,
        excerpt: (n.descripcion || n.contenido || '').substring(0, 150)
      })),
      method: result.metadata?.strategy || 'custom',
      confidence: result.metadata?.confidence || 0.8,
      message: `✅ Se encontraron ${result.noticias.length} noticias`
    });

  } catch (error) {
    console.error('❌ Error en testWithSelectors:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al probar la URL',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * POST /api/simple-test/save-scraped
 * Guardar noticias scrapeadas previamente
 */
const saveScrapedNews = async (req, res) => {
  try {
    const { url, noticias } = req.body;

    if (!url || !noticias || !Array.isArray(noticias)) {
      return res.status(400).json({
        success: false,
        error: 'URL y lista de noticias requeridas'
      });
    }

    console.log(`💾 Guardando ${noticias.length} noticias desde: ${url}`);

    let savedCount = 0;
    let errors = [];

    for (const noticia of noticias) {
      try {
        // Extraer contenido completo de cada noticia
        const articleResult = await require('../services/scraping.service').scrapeSingleArticle(noticia.enlace);
        
        if (articleResult.success) {
          // Preparar datos para guardar
          // Manejar fecha de publicación de forma segura
          let publishedAt;
          try {
            if (articleResult.fecha) {
              const dateObj = new Date(articleResult.fecha);
              publishedAt = isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString();
            } else {
              publishedAt = new Date().toISOString();
            }
          } catch (e) {
            publishedAt = new Date().toISOString();
          }

          const newsData = {
            title: noticia.titulo || articleResult.titulo || 'Sin título',
            content: articleResult.contenido || noticia.descripcion || 'Contenido no disponible',
            url: noticia.enlace,
            source: new URL(noticia.enlace).hostname.replace('www.', ''),
            domain: new URL(noticia.enlace).hostname,
            author: articleResult.autor || 'Autor no especificado',
            published_at: publishedAt,
            scraped_at: new Date().toISOString(),
            category: 'General',
            tags: [],
            image_url: articleResult.imagenes?.[0] || null,
            summary: (noticia.descripcion || articleResult.contenido || '').substring(0, 200) + '...',
            word_count: (articleResult.contenido || '').split(' ').length,
            reading_time: Math.ceil((articleResult.contenido || '').split(' ').length / 200),
            language: 'es',
            status: 'published',
            priority: 2,
            is_selected: false,
            selected_by: null,
            selection_date: null,
            humanized_content: null,
            humanization_tone: null,
            humanization_style: null,
            humanization_complexity: null,
            humanization_date: null,
            humanization_cost: 0,
            humanization_tokens: 0,
            version: 1,
            parent_id: null
          };

          // Guardar en Supabase
          const { supabase } = require('../config/database');
          const { data, error } = await supabase
            .from('news')
            .insert([newsData])
            .select();

          if (error) {
            errors.push({
              title: noticia.titulo,
              error: error.message
            });
            console.warn(`⚠️ Error guardando noticia "${noticia.titulo}":`, error.message);
          } else {
            savedCount++;
            console.log(`✅ Guardada: ${noticia.titulo.substring(0, 50)}...`);
          }
        } else {
          errors.push({
            title: noticia.titulo,
            error: 'No se pudo extraer el contenido completo'
          });
        }
      } catch (error) {
        errors.push({
          title: noticia.titulo,
          error: error.message
        });
        console.warn(`⚠️ Error procesando "${noticia.titulo}":`, error.message);
      }
    }
    
    console.log(`🎉 Guardado completado: ${savedCount}/${noticias.length} noticias guardadas`);

    return res.json({
      success: true,
      url,
      total_noticias: noticias.length,
      saved_count: savedCount,
      error_count: errors.length,
      errors: errors.slice(0, 5), // Solo mostrar primeros 5 errores
      message: `✅ Se guardaron ${savedCount} de ${noticias.length} noticias correctamente`
    });

  } catch (error) {
    console.error('❌ Error en saveScrapedNews:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al guardar las noticias',
      details: error.message
    });
  }
};

module.exports = {
  simpleTest,
  testWithSelectors,
  saveScrapedNews
};
