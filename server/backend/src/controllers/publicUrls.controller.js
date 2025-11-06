const { supabase } = require('../config/database');
const { scrapeSite } = require('../services/scraping.service');

/**
 * 🧪 POST /api/public-urls/test
 * Probar URL antes de crear (OBLIGATORIO)
 * Retorna cuántas noticias están disponibles
 */
const testUrl = async (req, res) => {
  try {
    const { url, custom_selectors } = req.body; // 🆕 Recibir selectores

    // Validación
    if (!url) {
      return res.status(400).json({
        error: 'URL requerida'
      });
    }

    // Validar formato de URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        error: 'URL inválida'
      });
    }

    console.log(`🧪 Probando URL: ${url}`);

    // 🆕 Preparar opciones de scraping con selectores temporales
    const scrapingOptions = {};
    
    if (custom_selectors && Object.keys(custom_selectors).length > 0) {
      console.log('🎯 Usando selectores personalizados para test');
      
      const domain = new URL(url).hostname;
      
      scrapingOptions.temporaryConfig = {
        domain: domain,
        name: `Test: ${domain}`,
        selectors: {
          titleSelector: custom_selectors.customTitleSelector || null,
          contentSelector: custom_selectors.customContentSelector || null,
          dateSelector: custom_selectors.customDateSelector || null,
          authorSelector: custom_selectors.customAuthorSelector || null,
          imageSelector: custom_selectors.customImageSelector || null
        },
        listingSelectors: null
      };
      
      if (custom_selectors.listingContainerSelector && custom_selectors.listingLinkSelector) {
        scrapingOptions.temporaryConfig.listingSelectors = {
          containerSelector: custom_selectors.listingContainerSelector,
          linkSelector: custom_selectors.listingLinkSelector,
          titleSelector: custom_selectors.listingTitleSelector || null
        };
      }
    }

    // Scrapear con configuración temporal
    const scrapingResult = await scrapeSite(url, scrapingOptions);

    if (!scrapingResult || !scrapingResult.noticias) {
      return res.status(400).json({
        error: 'No se pudieron extraer noticias de esta URL',
        test_status: 'failed'
      });
    }

    const newsCount = scrapingResult.noticias.length;

    console.log(`✅ Test exitoso: ${newsCount} noticias encontradas`);

    // Retornar resultado del test
    return res.json({
      success: true,
      url,
      available_news_count: newsCount,
      news_preview: scrapingResult.noticias.slice(0, 5).map(n => ({
        titulo: n.titulo,
        enlace: n.enlace,
        descripcion: n.descripcion?.substring(0, 100) || ''
      })),
      tested_at: new Date(),
      test_status: 'success',
      used_custom_selectors: !!custom_selectors, // 🆕 Indicar si usó selectores
      scraping_method: scrapingResult.metadata?.method || 'unknown' // 🆕 Método usado
    });

  } catch (error) {
    console.error('Error en testUrl:', error);
    return res.status(500).json({
      error: 'Error al probar la URL',
      details: error.message,
      test_status: 'failed'
    });
  }
};

/**
 * POST /api/public-urls
 * Crear una nueva URL pública (solo admin)
 * 🆕 Ahora requiere test previo y valida límite de noticias
 */
const createPublicUrl = async (req, res) => {
  try {
    const { url, name, domain, region, custom_selectors, max_news_limit, available_news_count } = req.body;

    // Validación
    if (!url || !domain) {
      return res.status(400).json({
        error: 'URL y domain son requeridos'
      });
    }

    // 🆕 Validar que se hizo el test
    if (!available_news_count) {
      return res.status(400).json({
        error: 'Debes probar la URL primero usando POST /api/public-urls/test'
      });
    }

    // 🆕 Validar que el límite no exceda las disponibles
    if (max_news_limit && max_news_limit > available_news_count) {
      return res.status(400).json({
        error: `El límite (${max_news_limit}) no puede ser mayor que las noticias disponibles (${available_news_count})`
      });
    }

    // 🆕 Validar que el límite sea positivo
    if (max_news_limit && max_news_limit < 1) {
      return res.status(400).json({
        error: 'El límite debe ser al menos 1'
      });
    }

    // Validar formato de URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        error: 'URL inválida'
      });
    }

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('public_urls')
      .select('*')
      .eq('url', url)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'Esta URL ya existe en el sistema',
        existingUrl: {
          id: existing.id,
          name: existing.name,
          domain: existing.domain,
          is_active: existing.is_active
        }
      });
    }

    // Crear URL pública con límite
    const { data: publicUrl } = await supabase
      .from('public_urls')
      .insert({
        url,
        name: name || domain,
        domain,
        region: region || null,
        max_news_limit: max_news_limit || null,
        available_news_count,
        last_tested_at: new Date().toISOString(),
        test_status: 'success',
        created_by: req.user.id
      })
      .select()
      .single();

    // Si hay selectores personalizados, guardar configuración en SiteConfiguration
    let configSaved = null;
    if (custom_selectors && (
      custom_selectors.customTitleSelector ||
      custom_selectors.customContentSelector ||
      custom_selectors.listingContainerSelector ||
      custom_selectors.listingLinkSelector
    )) {
      try {
        const siteConfigService = require('../services/siteConfigService');
        
        // Preparar datos para SiteConfiguration
        const configData = {
          domain: domain,
          name: name || domain,
          selectors: {
            titleSelector: custom_selectors.customTitleSelector || null,
            contentSelector: custom_selectors.customContentSelector || null,
            dateSelector: custom_selectors.customDateSelector || null,
            authorSelector: custom_selectors.customAuthorSelector || null,
            imageSelector: custom_selectors.customImageSelector || null
          },
          listingSelectors: null
        };

        // Agregar selectores de listado si existen
        if (custom_selectors.listingContainerSelector && custom_selectors.listingLinkSelector) {
          configData.listingSelectors = {
            containerSelector: custom_selectors.listingContainerSelector,
            linkSelector: custom_selectors.listingLinkSelector,
            titleSelector: custom_selectors.listingTitleSelector || null
          };
        }

        // Guardar configuración
        configSaved = await siteConfigService.saveConfig(configData, req.user.id);
        
        console.log(`✅ Configuración guardada para dominio ${domain}:`, configSaved.name);
      } catch (configError) {
        console.error('Error guardando configuración de sitio:', configError);
        // No fallar toda la operación si solo falla el guardado de la configuración
      }
    }

    const responseMessage = configSaved
      ? 'URL pública creada exitosamente con configuración personalizada'
      : 'URL pública creada exitosamente';

    res.status(201).json({
      success: true,
      message: responseMessage,
      data: publicUrl,
      configSaved: configSaved ? {
        id: configSaved.id,
        domain: configSaved.domain,
        name: configSaved.name,
        hasSelectors: true
      } : null
    });

  } catch (error) {
    console.error('Error en createPublicUrl:', error);
    res.status(500).json({
      error: 'Error al crear URL pública',
      details: error.message
    });
  }
};

/**
 * GET /api/public-urls
 * Listar todas las URLs públicas activas
 */
const getPublicUrls = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      region,
      domain,
      is_active = 'true'
    } = req.query;

    // Modo demo - retornar datos simulados
    if (process.env.DEMO_MODE === 'true') {
      const demoUrls = [
        {
          id: 1,
          url: 'https://example-news.com',
          name: 'Example News Site',
          domain: 'example-news.com',
          region: 'US',
          is_active: true,
          max_news_limit: 50,
          available_news_count: 45,
          last_tested_at: new Date(),
          test_status: 'success',
          created_at: new Date(),
          updated_at: new Date(),
          created_by: req.user.id,
          createdBy: {
            id: req.user.id,
            email: req.user.email,
            name: 'Demo User'
          },
          _count: {
            selections: 5
          }
        },
        {
          id: 2,
          url: 'https://tech-news.example',
          name: 'Tech News',
          domain: 'tech-news.example',
          region: 'Global',
          is_active: true,
          max_news_limit: 30,
          available_news_count: 28,
          last_tested_at: new Date(),
          test_status: 'success',
          created_at: new Date(),
          updated_at: new Date(),
          created_by: req.user.id,
          createdBy: {
            id: req.user.id,
            email: req.user.email,
            name: 'Demo User'
          },
          _count: {
            selections: 3
          }
        }
      ];

      return res.json({
        success: true,
        data: demoUrls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: demoUrls.length,
          totalPages: 1
        }
      });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const where = {};

    if (is_active === 'true') {
      where.is_active = true;
    } else if (is_active === 'false') {
      where.is_active = false;
    }

    if (region) {
      where.region = region;
    }

    if (domain) {
      where.domain = {
        contains: domain,
        mode: 'insensitive'
      };
    }

    // Modo real con Supabase - obtener URLs públicas
    console.log('✅ Usando Supabase real para URLs públicas');
    
    // Construir consulta base
    let query = supabase
      .from('public_urls')
      .select('*', { count: 'exact' })
      .range(skip, skip + limitNum - 1)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (where.is_active !== undefined) {
      query = query.eq('is_active', where.is_active);
    }
    if (where.region) {
      query = query.eq('region', where.region);
    }
    if (where.domain) {
      query = query.ilike('domain', `%${where.domain}%`);
    }

    const { data: urls, count: total } = await query;

    res.json({
      success: true,
      data: urls,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Error en getPublicUrls:', error);
    res.status(500).json({
      error: 'Error al obtener URLs públicas',
      details: error.message
    });
  }
};

/**
 * GET /api/public-urls/:id
 * Obtener una URL pública específica
 */
const getPublicUrlById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: publicUrl } = await supabase
      .from('public_urls')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (!publicUrl) {
      return res.status(404).json({ 
        error: 'URL pública no encontrada' 
      });
    }

    res.json({
      success: true,
      data: publicUrl
    });

  } catch (error) {
    console.error('Error en getPublicUrlById:', error);
    res.status(500).json({ 
      error: 'Error al obtener URL pública',
      details: error.message 
    });
  }
};

/**
 * PUT /api/public-urls/:id
 * Actualizar una URL pública (solo admin)
 */
const updatePublicUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, region, is_active } = req.body;

    const { data: publicUrl } = await supabase
      .from('public_urls')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (!publicUrl) {
      return res.status(404).json({
        error: 'URL pública no encontrada'
      });
    }

    // Actualizar
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (region !== undefined) updateData.region = region;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updated } = await supabase
      .from('public_urls')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    res.json({
      success: true,
      message: 'URL pública actualizada exitosamente',
      data: updated
    });

  } catch (error) {
    console.error('Error en updatePublicUrl:', error);
    res.status(500).json({ 
      error: 'Error al actualizar URL pública',
      details: error.message 
    });
  }
};

/**
 * DELETE /api/public-urls/:id
 * Eliminar (desactivar) una URL pública (solo admin)
 */
const deletePublicUrl = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: publicUrl } = await supabase
      .from('public_urls')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (!publicUrl) {
      return res.status(404).json({
        error: 'URL pública no encontrada'
      });
    }

    // Soft delete: marcar como inactiva
    await supabase
      .from('public_urls')
      .update({ is_active: false })
      .eq('id', parseInt(id));

    res.json({
      success: true,
      message: 'URL pública desactivada exitosamente'
    });

  } catch (error) {
    console.error('Error en deletePublicUrl:', error);
    res.status(500).json({ 
      error: 'Error al eliminar URL pública',
      details: error.message 
    });
  }
};

/**
 * PUT /api/public-urls/:id/retest
 * Re-testear URL existente y actualizar límite
 */
const retestPublicUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_limit, custom_selectors } = req.body;

    // 1. Obtener URL existente
    const { data: publicUrl } = await supabase
      .from('public_urls')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (!publicUrl) {
      return res.status(404).json({ 
        error: 'URL pública no encontrada' 
      });
    }

    console.log(`🔄 Re-testeando URL: ${publicUrl.url}`);

    // 2. Preparar opciones de scraping con selectores temporales
    const scrapingOptions = {};
    
    if (custom_selectors && Object.keys(custom_selectors).length > 0) {
      console.log('🎯 Usando selectores personalizados para re-test');
      
      const domain = new URL(publicUrl.url).hostname;
      
      scrapingOptions.temporaryConfig = {
        domain: domain,
        name: `Re-test: ${domain}`,
        selectors: {
          titleSelector: custom_selectors.customTitleSelector || null,
          contentSelector: custom_selectors.customContentSelector || null,
          dateSelector: custom_selectors.customDateSelector || null,
          authorSelector: custom_selectors.customAuthorSelector || null,
          imageSelector: custom_selectors.customImageSelector || null
        },
        listingSelectors: null
      };
      
      if (custom_selectors.listingContainerSelector && custom_selectors.listingLinkSelector) {
        scrapingOptions.temporaryConfig.listingSelectors = {
          containerSelector: custom_selectors.listingContainerSelector,
          linkSelector: custom_selectors.listingLinkSelector,
          titleSelector: custom_selectors.listingTitleSelector || null
        };
      }
    }

    // 3. Re-scrapear con configuración temporal
    const scrapingResult = await scrapeSite(publicUrl.url, scrapingOptions);

    if (!scrapingResult || !scrapingResult.noticias || scrapingResult.noticias.length === 0) {
      return res.status(400).json({
        error: 'No se pudieron extraer noticias de esta URL',
        test_status: 'failed',
        suggestion: 'La URL puede haber cambiado o estar inaccesible. Verifica los selectores personalizados.'
      });
    }

    const newAvailableCount = scrapingResult.noticias.length;

    console.log(`✅ Re-test exitoso: ${newAvailableCount} noticias encontradas`);

    // 4. Validar nuevo límite si se proporcionó
    if (new_limit !== undefined && new_limit !== null) {
      if (new_limit > newAvailableCount) {
        return res.status(400).json({
          error: `El nuevo límite (${new_limit}) no puede ser mayor que las noticias disponibles (${newAvailableCount})`
        });
      }

      if (new_limit < 1) {
        return res.status(400).json({
          error: 'El límite debe ser al menos 1'
        });
      }
    }

    // 5. Preparar datos de actualización
    const updateData = {
      available_news_count: newAvailableCount,
      last_tested_at: new Date(),
      test_status: 'success'
    };

    // Solo actualizar límite si se proporcionó uno nuevo
    if (new_limit !== undefined && new_limit !== null) {
      updateData.max_news_limit = parseInt(new_limit);
    }

    // 6. Actualizar URL en BD
    const { data: updatedUrl } = await supabase
      .from('public_urls')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    // 7. Si hay nuevos selectores, actualizar SiteConfiguration
    if (custom_selectors && Object.keys(custom_selectors).length > 0) {
      try {
        const siteConfigService = require('../services/siteConfigService');
        
        const configData = {
          domain: new URL(publicUrl.url).hostname,
          name: publicUrl.name || new URL(publicUrl.url).hostname,
          selectors: {
            titleSelector: custom_selectors.customTitleSelector || null,
            contentSelector: custom_selectors.customContentSelector || null,
            dateSelector: custom_selectors.customDateSelector || null,
            authorSelector: custom_selectors.customAuthorSelector || null,
            imageSelector: custom_selectors.customImageSelector || null
          },
          listingSelectors: null
        };

        if (custom_selectors.listingContainerSelector && custom_selectors.listingLinkSelector) {
          configData.listingSelectors = {
            containerSelector: custom_selectors.listingContainerSelector,
            linkSelector: custom_selectors.listingLinkSelector,
            titleSelector: custom_selectors.listingTitleSelector || null
          };
        }

        await siteConfigService.saveConfig(configData, req.user.id);
        console.log(`✅ Configuración actualizada para dominio ${configData.domain}`);
      } catch (configError) {
        console.error('Error actualizando configuración de sitio:', configError);
      }
    }

    // 8. Retornar resultado con comparación
    return res.json({
      success: true,
      message: 'URL re-testeada y actualizada exitosamente',
      data: updatedUrl,
      previous_stats: {
        available_news_count: publicUrl.available_news_count,
        max_news_limit: publicUrl.max_news_limit,
        last_tested_at: publicUrl.last_tested_at
      },
      new_stats: {
        available_news_count: newAvailableCount,
        max_news_limit: new_limit !== undefined && new_limit !== null ? parseInt(new_limit) : publicUrl.max_news_limit,
        last_tested_at: new Date()
      },
      news_preview: scrapingResult.noticias.slice(0, 5).map(n => ({
        titulo: n.titulo,
        enlace: n.enlace,
        descripcion: n.descripcion?.substring(0, 100) || ''
      })),
      used_custom_selectors: !!custom_selectors
    });

  } catch (error) {
    console.error('Error en retestPublicUrl:', error);
    return res.status(500).json({
      error: 'Error al re-testear la URL',
      details: error.message
    });
  }
};

module.exports = {
  testUrl,
  createPublicUrl,
  getPublicUrls,
  getPublicUrlById,
  updatePublicUrl,
  deletePublicUrl,
  retestPublicUrl
};
