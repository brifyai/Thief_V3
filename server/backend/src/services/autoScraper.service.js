const { supabase } = require('../config/database'); // Usar instancia compartida
const { scrapeSite, scrapeSingleArticle } = require('./scraping.service');
const { categorizeWithAI } = require('./ai.service');
const { generateTitleAndSummary } = require('./aiEnhancer.service');
const config = require('../config/env');
const { invalidateAfterScrapingResult } = require('../middleware/cacheInvalidation');
const duplicateDetector = require('./duplicateDetector.service'); // 🔹 FASE 1
const { generateContentHash } = require('../utils/contentHasher'); // 🔹 FASE 1
const { extractTitle, isValidTitle } = require('../utils/titleExtractor'); // 🔹 FASE 2
const axios = require('axios'); // 🔹 FASE 2: Para obtener HTML
const { categorizeArticle } = require('../utils/categoryExtractor'); // 🔹 FASE 3
const { getOrScrape } = require('./scrapingCache.service'); // 🚀 OPTIMIZACIÓN: Caché
const { scrapeParallel } = require('../utils/parallelScraper'); // 🚀 OPTIMIZACIÓN: Paralelo

/**
 * Servicio de Scraping Automático
 * Ejecuta scraping diario de todas las URLs guardadas en la base de datos
 * Incluye lógica de prevención de duplicados y clasificación automática
 */
class AutoScraperService {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      duplicates: 0
    };
  }

  /**
   * Procesa un batch de URLs de forma optimizada
   * 🚀 OPTIMIZACIÓN: Usa scraping paralelo según configuración
   * Invalida caché UNA SOLA VEZ al final
   * @param {Array} urls - Array de URLs a procesar
   * @returns {Object} Estadísticas del proceso
   */
  async processUrlsBatch(urls) {
    console.log(`📦 Procesando batch de ${urls.length} URLs...`);
    console.log(`⚡ Concurrencia configurada: ${config.scrapingConcurrency} URLs simultáneas`);
    
    const userIds = new Set();
    
    // 🚀 OPTIMIZACIÓN: Scraping paralelo
    const results = await scrapeParallel(
      urls,
      async (savedUrl) => {
        try {
          await this.processSingleUrl(savedUrl, true);
          userIds.add(savedUrl.user_id);
          return { success: true, url: savedUrl.url };
        } catch (error) {
          console.error(`Error procesando URL ${savedUrl.url}:`, error.message);
          if (!this.stats.errors) this.stats.errors = [];
          this.stats.errors.push({
            url: savedUrl.url,
            error: error.message,
            timestamp: new Date()
          });
          return { success: false, url: savedUrl.url, error: error.message };
        }
      },
      config.scrapingConcurrency
    );
    
    // Contar resultados
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    this.stats.successful += successful;
    this.stats.failed += failed;
    
    console.log(`📊 Resultados: ${successful} exitosos, ${failed} fallidos`);
    
    // Invalidar caché UNA SOLA VEZ por usuario al final del batch
    console.log(`🧹 Invalidando caché para ${userIds.size} usuarios...`);
    for (const userId of userIds) {
      try {
        await invalidateAfterScrapingResult(userId);
        console.log(`✅ Caché invalidado para usuario ${userId}`);
      } catch (err) {
        console.error(`❌ Error invalidando caché para usuario ${userId}:`, err.message);
      }
    }
    
    console.log(`✅ Batch completado e invalidación de caché finalizada`);
  }

  /**
   * Ejecuta el scraping automático de URLs guardadas
   * OPTIMIZADO: Usa processUrlsBatch para invalidar caché una sola vez
   * @param {number} userId - ID del usuario (opcional, si no se proporciona procesa todas las URLs)
   * @returns {Object} Estadísticas del proceso
   */
  async runDailyScraping(userId = null) {
    if (this.isRunning) {
      console.log('⚠️ Scraping automático ya está en ejecución');
      return { error: 'Proceso ya en ejecución' };
    }

    this.isRunning = true;
    this.lastRun = new Date();
    this.resetStats();

    const userFilter = userId ? ` para usuario ${userId}` : ' para todos los usuarios';
    console.log(`🚀 Iniciando scraping automático diario${userFilter}...`);

    try {
      // 🔹 NUEVO: Obtener URLs públicas activas (scraping centralizado)
      const publicUrls = await prisma.publicUrl.findMany({
        where: { is_active: true },
        select: {
          id: true,
          url: true,
          domain: true,
          name: true,
          region: true,
          max_news_limit: true // 🆕 Límite de noticias
        }
      });

      console.log(`📊 URLs públicas encontradas: ${publicUrls.length}`);

      // Convertir a formato compatible con processUrlsBatch
      const urlsToProcess = publicUrls.map(pu => ({
        id: pu.id,
        url: pu.url,
        domain: pu.domain,
        nombre: pu.name,
        region: pu.region,
        title: pu.name,
        max_news_limit: pu.max_news_limit, // 🆕 Límite de noticias
        user_id: null, // Sin user_id porque es scraping global
        isPublicUrl: true // Flag para identificar que es URL pública
      }));

      // Procesar todas las URLs en batch (invalidación optimizada)
      await this.processUrlsBatch(urlsToProcess);

      const finalStats = this.getFinalStats();
      console.log('✅ Scraping automático completado:', finalStats);
      console.log(`📊 URLs públicas procesadas: ${publicUrls.length}`);
      
      return finalStats;

    } catch (error) {
      console.error('❌ Error en scraping automático:', error);
      
      // Intentar invalidar caché aunque haya error
      if (userId) {
        try {
          await invalidateAfterScrapingResult(userId);
        } catch (cacheErr) {
          console.error('Error invalidando caché después de error:', cacheErr.message);
        }
      }
      
      return { error: error.message, stats: this.stats };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Procesa una URL individual
   * @param {Object} savedUrl - URL guardada de la base de datos
   * @param {boolean} skipCacheInvalidation - Si es true, no invalida caché (para procesamiento batch)
   */
  async processSingleUrl(savedUrl, skipCacheInvalidation = false) {
    this.stats.totalProcessed++;
    
    try {
      console.log(`🔍 Procesando: ${savedUrl.url}`);

      // Verificar si ya existe un scraping reciente (últimas 24 horas)
      const existingResult = await this.checkForDuplicate(savedUrl.id);
      if (existingResult) {
        console.log(`⏭️ Saltando ${savedUrl.url} - ya scrapeado recientemente`);
        this.stats.duplicates++;
        return;
      }

      // Ejecutar scraping para obtener múltiples noticias
      const scrapingResults = await scrapeSite(savedUrl.url);
      
      if (!scrapingResults || !scrapingResults.noticias || scrapingResults.noticias.length === 0) {
        console.log(`⚠️ No se encontraron noticias en: ${savedUrl.url}`);
        await this.saveErrorResult(savedUrl.id, 'No se encontraron noticias');
        this.stats.failed++;
        return;
      }

      let noticias = scrapingResults.noticias;
      const originalCount = noticias.length;
      
      // 🆕 APLICAR LÍMITE DE NOTICIAS
      if (savedUrl.max_news_limit && savedUrl.max_news_limit > 0) {
        noticias = noticias.slice(0, savedUrl.max_news_limit);
        console.log(`📊 Límite aplicado: ${noticias.length}/${originalCount} noticias (límite: ${savedUrl.max_news_limit})`);
      } else {
        console.log(`📰 Sin límite: procesando todas las ${noticias.length} noticias de: ${savedUrl.url}`);
      }
      
      let savedCount = 0;

      // Procesar cada noticia individualmente con límite de concurrencia
      const MAX_CONCURRENT = 3; // Procesar máximo 3 noticias simultáneamente
      
      for (let i = 0; i < noticias.length; i += MAX_CONCURRENT) {
        const batch = noticias.slice(i, i + MAX_CONCURRENT);
        
        await Promise.allSettled(batch.map(async (noticia) => {
          try {
            // Verificar que la noticia tenga contenido válido
            if (!noticia.titulo || !noticia.enlace || noticia.titulo.length < 10) {
              return;
            }

            // Verificar si esta noticia específica ya existe (por título)
            const existingNews = await this.checkForDuplicateByUrl(noticia.titulo, savedUrl.id);
            if (existingNews) {
              console.log(`⏭️ Noticia ya existe: ${noticia.titulo.substring(0, 50)}...`);
              return;
            }

          console.log(`📄 Extrayendo contenido completo de: ${noticia.titulo.substring(0, 50)}...`);
          
          // 🚀 OPTIMIZACIÓN: Usar caché para scraping
          let fullArticle;
          try {
            fullArticle = await getOrScrape(
              noticia.enlace,
              async (url) => await scrapeSingleArticle(url)
            );
          } catch (articleError) {
            console.error(`❌ Error extrayendo contenido de ${noticia.enlace}:`, articleError.message);
            // Si falla la extracción del artículo completo, usar solo título y descripción
            fullArticle = {
              success: false,
              titulo: noticia.titulo,
              contenido: noticia.descripcion || '',
              fecha: 'No disponible',
              autor: 'No disponible'
            };
          }

          // Construir el contenido completo para guardar
          let fullContent = '';
          if (fullArticle.success && fullArticle.contenido) {
            // Si se extrajo exitosamente el contenido completo
            fullContent = `${fullArticle.titulo || noticia.titulo}\n\n`;
            if (fullArticle.bajada) {
              fullContent += `${fullArticle.bajada}\n\n`;
            }
            fullContent += fullArticle.contenido;
            
            // Agregar metadatos si están disponibles
            if (fullArticle.fecha && fullArticle.fecha !== 'Fecha no disponible') {
              fullContent += `\n\nFecha: ${fullArticle.fecha}`;
            }
            if (fullArticle.autor && fullArticle.autor !== 'Autor no especificado') {
              fullContent += `\nAutor: ${fullArticle.autor}`;
            }
          } else {
            // Fallback: usar título y descripción original
            fullContent = `${noticia.titulo}\n\n${noticia.descripcion || 'No hay descripción disponible'}`;
          }

          // Clasificar automáticamente el contenido (usando el contenido completo)
          const contentForClassification = {
            titulo: fullArticle.titulo || noticia.titulo,
            descripcion: fullArticle.bajada || noticia.descripcion || '',
            contenido: fullArticle.contenido || '',
            enlace: noticia.enlace
          };
          
          let classification;
          try {
            classification = await this.classifyContent(contentForClassification, savedUrl);
          } catch (classificationError) {
            console.warn(`⚠️ Error en clasificación para "${noticia.titulo.substring(0, 50)}...", usando valores por defecto:`, classificationError.message);
            // Usar clasificación por defecto si falla todo
            classification = {
              category: 'general',
              region: savedUrl.region || null,
              method: 'fallback',
              confidence: 0.3
            };
          }

          // 🔹 FASE 2: Optimización de extracción de títulos
          let finalTitle = fullArticle.titulo || noticia.titulo || 'Sin título';
          let finalSummary = fullArticle.bajada || noticia.descripcion || null;
          let titleSource = 'extracted'; // Por defecto
          let aiUsedForTitle = false;
          
          // Validar si el título extraído es válido
          const isTitleValid = isValidTitle(finalTitle);
          
          if (!isTitleValid) {
            console.log(`⚠️  Título extraído inválido: "${finalTitle}"`);
            
            // 🔹 FASE 2: ESTRATEGIA 1 - Intentar extraer de meta tags
            console.log('📝 Intentando extraer título de meta tags...');
            try {
              const response = await axios.get(noticia.enlace, {
                timeout: 10000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              
              const titleExtraction = extractTitle(response.data, { url: noticia.enlace });
              
              if (titleExtraction.title && isValidTitle(titleExtraction.title)) {
                finalTitle = titleExtraction.title;
                titleSource = titleExtraction.source || 'meta_tags';
                console.log(`✅ Título extraído de ${titleSource}: "${finalTitle}"`);
              } else {
                console.log('⚠️  No se pudo extraer título válido de meta tags');
                
                // 🔹 FASE 2: ESTRATEGIA 2 - Usar IA como último recurso
                console.log('🤖 Generando título con IA...');
                try {
                  const aiResult = await generateTitleAndSummary(fullContent);
                  if (aiResult.title) {
                    finalTitle = aiResult.title;
                    titleSource = 'ai';
                    aiUsedForTitle = true;
                    console.log(`✅ Título generado con IA: "${finalTitle}"`);
                  }
                  if (aiResult.summary && !finalSummary) {
                    finalSummary = aiResult.summary;
                  }
                } catch (aiError) {
                  console.warn(`⚠️ Error generando título con IA: ${aiError.message}`);
                  // Fallback: usar primeras palabras del contenido
                  const firstLine = this.cleanContent(fullContent).split('\n')[0];
                  finalTitle = firstLine.substring(0, 100) || 'Sin título';
                  titleSource = 'fallback';
                }
              }
            } catch (metaError) {
              console.warn(`⚠️ Error obteniendo HTML para meta tags: ${metaError.message}`);
              
              // Si falla meta tags, ir directo a IA
              console.log('🤖 Generando título con IA (fallback)...');
              try {
                const aiResult = await generateTitleAndSummary(fullContent);
                if (aiResult.title) {
                  finalTitle = aiResult.title;
                  titleSource = 'ai';
                  aiUsedForTitle = true;
                  console.log(`✅ Título generado con IA: "${finalTitle}"`);
                }
                if (aiResult.summary && !finalSummary) {
                  finalSummary = aiResult.summary;
                }
              } catch (aiError) {
                console.warn(`⚠️ Error generando título con IA: ${aiError.message}`);
                const firstLine = this.cleanContent(fullContent).split('\n')[0];
                finalTitle = firstLine.substring(0, 100) || 'Sin título';
                titleSource = 'fallback';
              }
            }
          } else {
            console.log(`✅ Título extraído válido: "${finalTitle}"`);
            titleSource = 'extracted';
          }

          // 🔹 FASE 1: Generar hash del contenido para detección de duplicados
          const cleanedContent = this.cleanContent(fullContent);
          const contentHash = generateContentHash(cleanedContent);

          // 🔹 FASE 1: Verificar si es duplicado
          const duplicateCheck = await duplicateDetector.checkDuplicate({
            title: finalTitle,
            content: fullContent,
            cleaned_content: cleanedContent,
            content_hash: contentHash,
            domain: savedUrl.domain
          }, {
            timeWindowHours: 72, // Buscar duplicados en últimas 72 horas
            domain: savedUrl.domain
          });

          if (duplicateCheck.isDuplicate) {
            console.log(`⏭️  Duplicado detectado, omitiendo: "${finalTitle.substring(0, 50)}..."`);
            console.log(`   Original: ID ${duplicateCheck.duplicate.id}, scraped ${duplicateCheck.duplicate.scraped_at}`);
            this.stats.duplicates++;
            return; // Saltar al siguiente artículo
          }

          // Guardar cada noticia como un resultado separado con contenido completo
          // Preparar contenido como JSON para mantener consistencia
          const contentJson = JSON.stringify({
            titulo: finalTitle,
            contenido: fullContent,
            fecha: fullArticle.fecha || 'Fecha no disponible',
            autor: fullArticle.autor || 'Autor no especificado',
            imagenes: fullArticle.imagenes || [],
            metadata: {
              source: 'auto-scraper',
              titleSource: titleSource,
              aiUsedForTitle: aiUsedForTitle,
              classification: classification,
              scrapedAt: new Date().toISOString()
            }
          });

          const scrapingData = {
            user_id: savedUrl.user_id, // null para URLs públicas, ID para URLs privadas
            title: finalTitle,
            summary: finalSummary,
            content: contentJson, // 🔧 CORRECCIÓN: Guardar como JSON en lugar de texto plano
            cleaned_content: cleanedContent,
            content_hash: contentHash, // 🔹 FASE 1: Guardar hash
            scraping_type: 'automatic',
            category: classification.category,
            region: savedUrl.region || classification.region,
            domain: savedUrl.domain,
            scraped_at: new Date(),
            success: true,
            response_time: null,
            status_code: 200,
            content_length: fullContent.length,
            // 🔹 FASE 2-4: Campos de tracking
            title_source: titleSource, // 🔹 FASE 2: Fuente real del título
            categorization_method: classification.method || 'keywords',
            categorization_confidence: classification.confidence || 0.7,
            ai_used: aiUsedForTitle, // 🔹 FASE 2: Tracking de uso de IA
            ai_tokens_used: null // TODO: Implementar conteo de tokens
          };

          // Agregar referencia según el tipo de URL
          if (savedUrl.isPublicUrl) {
            scrapingData.public_url_id = savedUrl.id;
          } else {
            scrapingData.saved_url_id = savedUrl.id;
          }

          const savedResult = await prisma.scraping_results.create({
            data: scrapingData
          });

          savedCount++;
          console.log(`✅ Guardada con contenido completo: ${noticia.titulo.substring(0, 50)}...`);
          
          // 🔍 DETECCIÓN DE ENTIDADES (V2 - MEJORADO)
          try {
            const entityMonitor = require('./entityMonitorV2.service');  // ✅ USANDO V2
            const mentions = await entityMonitor.detectMentions(savedResult);
            if (mentions.length > 0) {
              await entityMonitor.saveMentions(mentions);
              console.log(`✅ Detectadas ${mentions.length} menciones de entidades`);
            }
          } catch (entityError) {
            console.error('❌ Error detectando entidades:', entityError.message);
            // No fallar el scraping por error de entidades
          }
          
          // Solo invalidar caché si no estamos en modo batch
          if (!skipCacheInvalidation) {
            invalidateAfterScrapingResult(savedUrl.user_id).catch(err => {
              console.error('Error invalidando caché:', err.message);
            });
          }

          } catch (newsError) {
            console.error(`❌ Error guardando noticia "${noticia.titulo}":`, newsError.message);
          }
        }));
        
        // Pausa entre batches para no sobrecargar el servidor
        if (i + MAX_CONCURRENT < noticias.length) {
          await this.sleep(config.scrapingDelayMs || 1000);
        }
      }

      if (savedCount > 0) {
        this.stats.successful++;
        console.log(`✅ Éxito: ${savedCount} noticias guardadas de ${savedUrl.url}`);
      } else {
        this.stats.failed++;
        await this.saveErrorResult(savedUrl.id, 'No se pudieron guardar noticias válidas');
      }

    } catch (error) {
      console.error(`❌ Error procesando ${savedUrl.url}:`, error.message);
      
      // Guardar error en la base de datos
      await this.saveErrorResult(savedUrl.id, error.message);
      this.stats.failed++;
    }
  }

  /**
   * Verifica si existe un scraping reciente para evitar duplicados
   * @param {number} savedUrlId - ID de la URL guardada
   * @returns {boolean} True si existe un scraping reciente
   */
  async checkForDuplicate(savedUrlId) {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const existingResult = await prisma.scraping_results.findFirst({
      where: {
        saved_url_id: savedUrlId,
        scraped_at: {
          gte: twentyFourHoursAgo
        },
        success: true
      }
    });

    return !!existingResult;
  }

  /**
   * Verifica si existe una noticia específica por título para evitar duplicados
   * OPTIMIZADO: Usa búsqueda más eficiente con hash o comparación exacta
   * @param {string} newsTitle - Título de la noticia específica
   * @param {number} savedUrlId - ID de la URL guardada
   * @returns {boolean} True si existe una noticia reciente con ese título
   */
  async checkForDuplicateByUrl(newsTitle, savedUrlId) {
    if (!newsTitle || newsTitle.length < 10) return false;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // Reducido a 3 días para mejor performance

    try {
      // Búsqueda más eficiente: solo en la misma URL y con índices
      const existingNews = await prisma.scraping_results.findFirst({
        where: {
          saved_url_id: savedUrlId,
          scraped_at: {
            gte: threeDaysAgo
          },
          success: true
        },
        select: {
          content: true
        },
        orderBy: {
          scraped_at: 'desc'
        }
      });

      // Comparación en memoria (más rápido que LIKE en DB)
      if (existingNews && existingNews.content) {
        const titleNormalized = newsTitle.toLowerCase().trim().substring(0, 100);
        const contentNormalized = existingNews.content.toLowerCase();
        return contentNormalized.includes(titleNormalized);
      }

      return false;
    } catch (error) {
      console.error('⚠️ Error verificando duplicados:', error.message);
      return false;
    }
  }

  /**
   * 🔹 FASE 3: Clasificación inteligente de contenido
   * Prioriza categorización por URL/dominio/keywords antes de usar IA
   * @param {Object} scrapingResult - Resultado del scraping (puede ser noticia individual o contenido completo)
   * @param {Object} savedUrl - URL guardada
   * @returns {Object} Clasificación con categoría y región
   */
  async classifyContent(scrapingResult, savedUrl) {
    // Manejar tanto noticias individuales como contenido completo
    const titulo = scrapingResult.titulo || scrapingResult.title || savedUrl.title || '';
    const contenido = scrapingResult.descripcion || scrapingResult.contenido || '';
    const url = scrapingResult.enlace || savedUrl.url || '';
    const domain = savedUrl.domain || '';

    // 🔹 FASE 3: ESTRATEGIA 1 - Categorización inteligente (URL, dominio, keywords)
    console.log('📊 Intentando categorización inteligente...');
    const intelligentClassification = categorizeArticle({}, {
      url: url,
      domain: domain,
      title: titulo,
      content: contenido,
      minConfidence: 0.7
    });

    // Si la confianza es >= 70%, usar categorización inteligente
    if (intelligentClassification.confidence >= 0.7) {
      console.log(`✅ Categorización inteligente exitosa: ${intelligentClassification.category} (${(intelligentClassification.confidence * 100).toFixed(0)}%)`);
      return {
        category: intelligentClassification.category,
        region: savedUrl.region || 'Nacional',
        method: intelligentClassification.method,
        confidence: intelligentClassification.confidence
      };
    }

    // 🔹 FASE 3: ESTRATEGIA 2 - IA solo si confianza < 70%
    console.log(`⚠️  Confianza baja (${(intelligentClassification.confidence * 100).toFixed(0)}%), intentando con IA...`);
    
    try {
      const aiClassification = await categorizeWithAI(titulo, contenido, url);
      
      console.log('✅ Clasificación con IA exitosa:', aiClassification);
      return {
        category: aiClassification.category,
        region: aiClassification.region,
        method: 'ai',
        confidence: aiClassification.confidence || 0.9
      };

    } catch (aiError) {
      console.warn('⚠️ Error en clasificación con IA, usando resultado de baja confianza:', aiError.message);
      
      // Fallback: usar resultado de categorización inteligente aunque tenga baja confianza
      return {
        category: intelligentClassification.category,
        region: savedUrl.region || 'Nacional',
        method: intelligentClassification.method,
        confidence: intelligentClassification.confidence
      };
    }
  }

  /**
   * Clasificación de respaldo basada en palabras clave
   * @param {Object} scrapingResult - Resultado del scraping (puede ser noticia individual o contenido completo)
   * @param {Object} savedUrl - URL guardada
   * @returns {Object} Clasificación con categoría y región
   */
  classifyContentWithKeywords(scrapingResult, savedUrl) {
    // Manejar tanto noticias individuales como contenido completo
    const content = (scrapingResult.descripcion || scrapingResult.contenido || '').toLowerCase();
    const title = (scrapingResult.titulo || scrapingResult.title || savedUrl.title || '').toLowerCase();
    const fullText = `${title} ${content}`;

    // Clasificación por categoría (expandida)
    const categories = {
      'política': ['gobierno', 'presidente', 'ministro', 'congreso', 'elecciones', 'política', 'ley', 'senado', 'diputado'],
      'economía': ['economía', 'mercado', 'empresa', 'negocio', 'inversión', 'finanzas', 'banco', 'peso', 'dólar'],
      'deportes': ['fútbol', 'deporte', 'copa', 'mundial', 'equipo', 'jugador', 'partido', 'gol', 'campeonato'],
      'tecnología': ['tecnología', 'software', 'inteligencia artificial', 'ia', 'digital', 'tech', 'startup', 'innovación'],
      'salud': ['salud', 'medicina', 'hospital', 'doctor', 'enfermedad', 'tratamiento', 'vacuna', 'covid'],
      'educación': ['educación', 'universidad', 'estudiante', 'profesor', 'escuela', 'académico', 'colegio'],
      'entretenimiento': ['música', 'cine', 'actor', 'artista', 'show', 'festival', 'cultura', 'televisión'],
      'seguridad': ['delincuencia', 'policía', 'crimen', 'robo', 'justicia', 'tribunal', 'investigación'],
      'medio ambiente': ['medio ambiente', 'clima', 'contaminación', 'ecología', 'naturaleza', 'sostenible'],
      'internacional': ['internacional', 'mundial', 'global', 'extranjero', 'embajada', 'exterior'],
      'sociedad': ['sociedad', 'comunidad', 'social', 'ciudadano', 'vecino', 'local', 'municipal']
    };

    let detectedCategory = 'general';
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(keyword => fullText.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedCategory = category;
      }
    }

    // Clasificación por región (si no está ya definida)
    let detectedRegion = savedUrl.region || 'Nacional';
    
    if (!savedUrl.region) {
      const regions = [
        'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
        'Valparaíso', 'Metropolitana', 'O\'Higgins', 'Maule', 'Ñuble', 'Biobío',
        'Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'
      ];

      for (const region of regions) {
        if (fullText.includes(region.toLowerCase())) {
          detectedRegion = region;
          break;
        }
      }
    }

    console.log('🔤 Clasificación con palabras clave:', { category: detectedCategory, region: detectedRegion });
    
    return {
      category: detectedCategory,
      region: detectedRegion,
      method: 'keywords',
      confidence: maxMatches > 0 ? 0.7 : 0.3
    };
  }

  /**
   * Limpia el contenido eliminando caracteres especiales y espacios extra
   * @param {string} content - Contenido a limpiar
   * @returns {string} Contenido limpio
   */
  cleanContent(content) {
    return content
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.\,\;\:\!\?\-]/g, '')
      .trim()
      .substring(0, 5000); // Limitar a 5000 caracteres
  }

  /**
   * Guarda un resultado de error en la base de datos
   * @param {number} savedUrlId - ID de la URL guardada
   * @param {string} errorMessage - Mensaje de error
   */
  async saveErrorResult(savedUrlId, errorMessage) {
    try {
      // Obtener el user_id de la URL guardada
      const savedUrl = await prisma.saved_urls.findUnique({
        where: { id: savedUrlId },
        select: { user_id: true }
      });

      if (!savedUrl) {
        console.error('URL guardada no encontrada:', savedUrlId);
        return;
      }

      // Limitar longitud del mensaje de error
      const truncatedError = errorMessage.length > 500 
        ? errorMessage.substring(0, 500) + '...'
        : errorMessage;

      await prisma.scraping_results.create({
        data: {
          user_id: savedUrl.user_id,
          saved_url_id: savedUrlId,
          content: '',
          scraping_type: 'automatic',
          success: false,
          error_message: truncatedError,
          scraped_at: new Date()
        }
      });
    } catch (error) {
      console.error('Error guardando resultado de error:', error.message);
    }
  }

  /**
   * Pausa la ejecución por el tiempo especificado
   * @param {number} ms - Milisegundos a esperar
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reinicia las estadísticas
   */
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      duplicates: 0
    };
  }

  /**
   * Obtiene las estadísticas finales del proceso
   * @returns {Object} Estadísticas completas
   */
  getFinalStats() {
    return {
      ...this.stats,
      lastRun: this.lastRun,
      duration: this.lastRun ? Date.now() - this.lastRun.getTime() : 0,
      successRate: this.stats.totalProcessed > 0 
        ? ((this.stats.successful / this.stats.totalProcessed) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Obtiene el estado actual del servicio
   * @returns {Object} Estado del servicio
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      stats: this.stats
    };
  }

  /**
   * Función auxiliar para agregar trabajos a la cola (BullMQ)
   * @param {Object} data - Datos del trabajo
   * @param {number} data.userId - ID del usuario (opcional)
   * @param {Array} data.urls - Array de URLs a procesar (opcional)
   * @returns {Promise<Object>} Resultado del trabajo en cola
   */
  async queueAutoScraping(data = {}) {
    try {
      const { addScrapingJob } = require('./queueService');
      
      const { userId = null, urls = null } = data;
      
      // Si no se proporcionan URLs, obtenerlas de la base de datos
      let urlsToProcess = urls;
      
      if (!urlsToProcess) {
        const whereClause = userId ? { user_id: userId } : {};
        const savedUrls = await prisma.saved_urls.findMany({
          where: whereClause,
          select: {
            id: true,
            url: true,
            domain: true,
            nombre: true,
            region: true,
            title: true,
            user_id: true
          }
        });
        
        urlsToProcess = savedUrls;
      }

      if (!urlsToProcess || urlsToProcess.length === 0) {
        throw new Error('No hay URLs para procesar');
      }

      // Determinar userId si no se proporcionó
      const finalUserId = userId || urlsToProcess[0].user_id;

      console.log(`📤 Enviando ${urlsToProcess.length} URLs a la cola para usuario ${finalUserId}`);

      const result = await addScrapingJob({
        userId: finalUserId,
        urls: urlsToProcess,
        options: {
          timeout: 30000,
          attempts: 3,
        }
      });

      return result;
    } catch (error) {
      console.error('❌ Error enviando trabajo a la cola:', error);
      throw error;
    }
  }
}

// Instancia singleton del servicio
const autoScraperService = new AutoScraperService();

module.exports = {
  autoScraperService,
  AutoScraperService
};