// ========================================
// SIMPLE TEST CONTROLLER
// Sistema simplificado de testing de URLs
// ========================================

const { scrapeSite } = require('../services/scraping.service');

/**
 * POST /api/simple-test
 * Test ultra-simplificado: solo URL
 */
const simpleTest = async (req, res) => {
  try {
    const { url } = req.body;

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

    console.log(`🧪 Test simple: ${url}`);

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

    // Éxito
    return res.json({
      success: true,
      url,
      news_count: result.noticias.length,
      preview: result.noticias.slice(0, 3).map(n => ({
        title: n.titulo || 'Sin título',
        url: n.enlace,
        excerpt: (n.descripcion || n.contenido || '').substring(0, 150)
      })),
      method: result.metadata?.strategy || 'auto',
      confidence: result.metadata?.confidence || 0,
      message: `✅ Se encontraron ${result.noticias.length} noticias`
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

module.exports = {
  simpleTest,
  testWithSelectors
};
