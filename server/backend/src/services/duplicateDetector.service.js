const { supabase } = require('../config/database');
const { generateContentHash, generateCombinedHash, areDuplicates } = require('../utils/contentHasher');
const { loggers } = require('../utils/logger');

const logger = loggers.scraping;

/**
 * Servicio de detección de duplicados
 * Usa hashing de contenido para identificar artículos duplicados
 */

class DuplicateDetectorService {
  constructor() {
    this.stats = {
      checked: 0,
      duplicatesFound: 0,
      hashMatches: 0,
      similarityMatches: 0
    };
  }

  /**
   * Verifica si un artículo es duplicado basándose en su hash
   * @param {string} contentHash - Hash del contenido
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Object|null>} Artículo duplicado encontrado o null
   */
  async findDuplicateByHash(contentHash, options = {}) {
    try {
      if (!contentHash) {
        logger.warn('findDuplicateByHash: hash vacío');
        return null;
      }

      const {
        excludeId = null,
        timeWindowHours = 72, // Buscar en últimas 72 horas por defecto
        domain = null
      } = options;

      this.stats.checked++;

      // Construir filtro de búsqueda
      const where = {
        content_hash: contentHash,
        success: true
      };

      // Excluir ID específico (útil para updates)
      if (excludeId) {
        where.id = { not: excludeId };
      }

      // Filtrar por ventana de tiempo
      if (timeWindowHours) {
        const timeLimit = new Date();
        timeLimit.setHours(timeLimit.getHours() - timeWindowHours);
        where.scraped_at = { gte: timeLimit };
      }

      // Filtrar por dominio
      if (domain) {
        where.domain = domain;
      }

      // Buscar duplicado
      const duplicate = await prisma.scraping_results.findFirst({
        where,
        orderBy: { scraped_at: 'desc' },
        select: {
          id: true,
          title: true,
          content_hash: true,
          scraped_at: true,
          domain: true,
          category: true,
          public_url_id: true,
          saved_url_id: true
        }
      });

      if (duplicate) {
        this.stats.duplicatesFound++;
        this.stats.hashMatches++;
        logger.info(`✓ Duplicado encontrado por hash: "${duplicate.title}" (ID: ${duplicate.id})`);
      }

      return duplicate;
    } catch (error) {
      logger.error('Error buscando duplicado por hash:', {
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Verifica si un artículo es duplicado basándose en título y contenido
   * Más lento pero más robusto que solo hash
   * @param {string} title - Título del artículo
   * @param {string} content - Contenido del artículo
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Object|null>} Artículo duplicado encontrado o null
   */
  async findDuplicateByContent(title, content, options = {}) {
    try {
      if (!content || content.length < 100) {
        logger.warn('findDuplicateByContent: contenido muy corto o vacío');
        return null;
      }

      // Primero intentar por hash (más rápido)
      const contentHash = generateContentHash(content);
      if (contentHash) {
        const hashDuplicate = await this.findDuplicateByHash(contentHash, options);
        if (hashDuplicate) {
          return hashDuplicate;
        }
      }

      // Si no hay match por hash, buscar por similitud de título
      const {
        domain = null,
        timeWindowHours = 72,
        similarityThreshold = 0.85
      } = options;

      if (!title || title.length < 10) {
        logger.debug('Título muy corto para búsqueda por similitud');
        return null;
      }

      // Buscar artículos con títulos similares
      const where = {
        success: true,
        title: {
          contains: title.substring(0, 50), // Primeras 50 chars del título
          mode: 'insensitive'
        }
      };

      if (domain) {
        where.domain = domain;
      }

      if (timeWindowHours) {
        const timeLimit = new Date();
        timeLimit.setHours(timeLimit.getHours() - timeWindowHours);
        where.scraped_at = { gte: timeLimit };
      }

      const candidates = await prisma.scraping_results.findMany({
        where,
        take: 10, // Limitar a 10 candidatos
        orderBy: { scraped_at: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          content_hash: true,
          scraped_at: true,
          domain: true,
          category: true
        }
      });

      // Verificar similitud con cada candidato
      for (const candidate of candidates) {
        if (areDuplicates(content, candidate.content, similarityThreshold)) {
          this.stats.duplicatesFound++;
          this.stats.similarityMatches++;
          logger.info(`✓ Duplicado encontrado por similitud: "${candidate.title}" (ID: ${candidate.id})`);
          return candidate;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error buscando duplicado por contenido:', {
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Verifica si un artículo es duplicado (método principal)
   * Combina búsqueda por hash y similitud
   * @param {Object} article - Artículo a verificar
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Object>} { isDuplicate: boolean, duplicate: Object|null }
   */
  async checkDuplicate(article, options = {}) {
    try {
      const { title, content, cleaned_content, domain } = article;
      
      if (!content && !cleaned_content) {
        logger.warn('checkDuplicate: sin contenido para verificar');
        return { isDuplicate: false, duplicate: null };
      }

      const contentToCheck = cleaned_content || content;

      // Generar hash si no existe
      let contentHash = article.content_hash;
      if (!contentHash) {
        contentHash = generateContentHash(contentToCheck);
      }

      // Buscar duplicado
      const duplicate = await this.findDuplicateByContent(
        title,
        contentToCheck,
        { ...options, domain }
      );

      return {
        isDuplicate: !!duplicate,
        duplicate: duplicate,
        contentHash: contentHash
      };
    } catch (error) {
      logger.error('Error verificando duplicado:', {
        error: error.message,
        stack: error.stack
      });
      return { isDuplicate: false, duplicate: null, contentHash: null };
    }
  }

  /**
   * Genera y guarda hash para un artículo existente
   * Útil para migración de datos antiguos
   * @param {number} articleId - ID del artículo
   * @returns {Promise<string|null>} Hash generado o null
   */
  async generateHashForExisting(articleId) {
    try {
      const article = await prisma.scraping_results.findUnique({
        where: { id: articleId },
        select: { id: true, content: true, cleaned_content: true, content_hash: true }
      });

      if (!article) {
        logger.warn(`Artículo ${articleId} no encontrado`);
        return null;
      }

      if (article.content_hash) {
        logger.debug(`Artículo ${articleId} ya tiene hash`);
        return article.content_hash;
      }

      const contentToHash = article.cleaned_content || article.content;
      const hash = generateContentHash(contentToHash);

      if (!hash) {
        logger.warn(`No se pudo generar hash para artículo ${articleId}`);
        return null;
      }

      // Guardar hash
      await prisma.scraping_results.update({
        where: { id: articleId },
        data: { content_hash: hash }
      });

      logger.debug(`Hash generado y guardado para artículo ${articleId}`);
      return hash;
    } catch (error) {
      logger.error(`Error generando hash para artículo ${articleId}:`, {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Genera hashes para todos los artículos sin hash
   * Útil para migración masiva
   * @param {number} batchSize - Tamaño del lote
   * @returns {Promise<Object>} Estadísticas de la migración
   */
  async generateHashesForAll(batchSize = 100) {
    try {
      logger.info('🔄 Iniciando generación de hashes para artículos existentes...');

      const stats = {
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0
      };

      // Contar total de artículos sin hash
      const total = await prisma.scraping_results.count({
        where: {
          content_hash: null,
          success: true
        }
      });

      stats.total = total;
      logger.info(`📊 Total de artículos sin hash: ${total}`);

      if (total === 0) {
        logger.info('✅ Todos los artículos ya tienen hash');
        return stats;
      }

      // Procesar en lotes
      let offset = 0;
      while (offset < total) {
        const articles = await prisma.scraping_results.findMany({
          where: {
            content_hash: null,
            success: true
          },
          select: {
            id: true,
            content: true,
            cleaned_content: true
          },
          take: batchSize,
          skip: offset
        });

        if (articles.length === 0) break;

        logger.info(`📦 Procesando lote ${offset + 1}-${offset + articles.length} de ${total}...`);

        for (const article of articles) {
          try {
            const contentToHash = article.cleaned_content || article.content;
            
            if (!contentToHash || contentToHash.length < 50) {
              stats.skipped++;
              continue;
            }

            const hash = generateContentHash(contentToHash);

            if (hash) {
              await prisma.scraping_results.update({
                where: { id: article.id },
                data: { content_hash: hash }
              });
              stats.success++;
            } else {
              stats.failed++;
            }

            stats.processed++;
          } catch (error) {
            logger.error(`Error procesando artículo ${article.id}:`, error.message);
            stats.failed++;
            stats.processed++;
          }
        }

        offset += batchSize;

        // Pausa entre lotes para no sobrecargar la BD
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('✅ Generación de hashes completada:', stats);
      return stats;
    } catch (error) {
      logger.error('Error en generación masiva de hashes:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del detector
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      duplicateRate: this.stats.checked > 0 
        ? (this.stats.duplicatesFound / this.stats.checked * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Resetea estadísticas
   */
  resetStats() {
    this.stats = {
      checked: 0,
      duplicatesFound: 0,
      hashMatches: 0,
      similarityMatches: 0
    };
  }
}

// Exportar instancia singleton
const duplicateDetector = new DuplicateDetectorService();

module.exports = duplicateDetector;
