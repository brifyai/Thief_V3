const crypto = require('crypto');
const { loggers } = require('./logger');

const logger = loggers.scraping;

/**
 * Utilidad para generar hashes de contenido
 * Usado para detección de duplicados en scraping
 */

/**
 * Normaliza contenido antes de hashear
 * Remueve espacios extra, puntuación inconsistente, etc.
 * @param {string} content - Contenido a normalizar
 * @returns {string} Contenido normalizado
 */
function normalizeContent(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    .toLowerCase()
    .trim()
    // Remover múltiples espacios
    .replace(/\s+/g, ' ')
    // Remover puntuación al inicio/final de palabras
    .replace(/\s+[.,;:!?]+\s+/g, ' ')
    // Remover caracteres especiales pero mantener acentos
    .replace(/[^\w\sáéíóúñü]/gi, '')
    .trim();
}

/**
 * Genera hash SHA-256 de contenido
 * @param {string} content - Contenido a hashear
 * @returns {string} Hash hexadecimal (64 caracteres)
 */
function generateContentHash(content) {
  try {
    if (!content || typeof content !== 'string') {
      logger.warn('generateContentHash: contenido vacío o inválido');
      return null;
    }

    // Normalizar contenido antes de hashear
    const normalized = normalizeContent(content);
    
    if (normalized.length < 50) {
      logger.warn(`generateContentHash: contenido muy corto (${normalized.length} chars)`);
      return null;
    }

    // Generar hash SHA-256
    const hash = crypto
      .createHash('sha256')
      .update(normalized, 'utf8')
      .digest('hex');

    logger.debug(`Hash generado: ${hash.substring(0, 16)}... (${normalized.length} chars)`);
    
    return hash;
  } catch (error) {
    logger.error('Error generando hash de contenido:', {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * Genera hash combinado de título + contenido
 * Más robusto para detectar artículos similares
 * @param {string} title - Título del artículo
 * @param {string} content - Contenido del artículo
 * @returns {string} Hash hexadecimal
 */
function generateCombinedHash(title, content) {
  try {
    const normalizedTitle = normalizeContent(title || '');
    const normalizedContent = normalizeContent(content || '');
    
    // Combinar título y primeros 1000 caracteres del contenido
    const combined = `${normalizedTitle}|||${normalizedContent.substring(0, 1000)}`;
    
    if (combined.length < 100) {
      logger.warn('generateCombinedHash: contenido combinado muy corto');
      return null;
    }

    const hash = crypto
      .createHash('sha256')
      .update(combined, 'utf8')
      .digest('hex');

    logger.debug(`Hash combinado generado: ${hash.substring(0, 16)}...`);
    
    return hash;
  } catch (error) {
    logger.error('Error generando hash combinado:', {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * Calcula similitud entre dos strings usando Levenshtein simplificado
 * @param {string} str1 - Primer string
 * @param {string} str2 - Segundo string
 * @returns {number} Similitud de 0 a 1 (1 = idénticos)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const normalized1 = normalizeContent(str1);
  const normalized2 = normalizeContent(str2);
  
  if (normalized1 === normalized2) return 1;
  
  // Similitud simple basada en palabras comunes
  const words1 = new Set(normalized1.split(' '));
  const words2 = new Set(normalized2.split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Verifica si dos contenidos son duplicados
 * @param {string} content1 - Primer contenido
 * @param {string} content2 - Segundo contenido
 * @param {number} threshold - Umbral de similitud (0-1), default 0.9
 * @returns {boolean} true si son duplicados
 */
function areDuplicates(content1, content2, threshold = 0.9) {
  try {
    if (!content1 || !content2) return false;
    
    // Primero comparar hashes (más rápido)
    const hash1 = generateContentHash(content1);
    const hash2 = generateContentHash(content2);
    
    if (hash1 && hash2 && hash1 === hash2) {
      logger.debug('Duplicado detectado por hash exacto');
      return true;
    }
    
    // Si hashes diferentes, calcular similitud
    const similarity = calculateSimilarity(content1, content2);
    const isDuplicate = similarity >= threshold;
    
    if (isDuplicate) {
      logger.debug(`Duplicado detectado por similitud: ${(similarity * 100).toFixed(1)}%`);
    }
    
    return isDuplicate;
  } catch (error) {
    logger.error('Error verificando duplicados:', {
      error: error.message
    });
    return false;
  }
}

/**
 * Genera hash corto (primeros 16 caracteres) para logging
 * @param {string} content - Contenido
 * @returns {string} Hash corto
 */
function generateShortHash(content) {
  const fullHash = generateContentHash(content);
  return fullHash ? fullHash.substring(0, 16) : null;
}

module.exports = {
  normalizeContent,
  generateContentHash,
  generateCombinedHash,
  calculateSimilarity,
  areDuplicates,
  generateShortHash
};
