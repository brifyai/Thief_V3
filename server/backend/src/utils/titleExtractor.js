const cheerio = require('cheerio');
const { loggers } = require('./logger');

const logger = loggers.scraping;

/**
 * Utilidad para extraer títulos de páginas web
 * Prioriza meta tags sobre IA para reducir costos
 */

/**
 * Lista de títulos genéricos que deben ser rechazados
 */
const GENERIC_TITLES = [
  'inicio',
  'home',
  'página principal',
  'bienvenido',
  'welcome',
  'untitled',
  'sin título',
  'no title',
  'página de inicio',
  'homepage',
  'index',
  'default',
  'main page'
];

/**
 * Valida si un título es genérico o inválido
 * @param {string} title - Título a validar
 * @param {string} siteName - Nombre del sitio (opcional)
 * @returns {boolean} true si el título es válido
 */
function isValidTitle(title, siteName = null) {
  if (!title || typeof title !== 'string') {
    return false;
  }

  const normalized = title.toLowerCase().trim();

  // Muy corto
  if (normalized.length < 10) {
    logger.debug(`Título muy corto: "${title}" (${normalized.length} chars)`);
    return false;
  }

  // Muy largo (probablemente descripción)
  if (normalized.length > 200) {
    logger.debug(`Título muy largo: "${title}" (${normalized.length} chars)`);
    return false;
  }

  // Genérico
  if (GENERIC_TITLES.some(generic => normalized === generic || normalized.includes(generic))) {
    logger.debug(`Título genérico detectado: "${title}"`);
    return false;
  }

  // Solo el nombre del sitio
  if (siteName && normalized === siteName.toLowerCase().trim()) {
    logger.debug(`Título es solo el nombre del sitio: "${title}"`);
    return false;
  }

  // Solo caracteres especiales o números
  if (/^[\W\d\s]+$/.test(normalized)) {
    logger.debug(`Título solo contiene caracteres especiales: "${title}"`);
    return false;
  }

  return true;
}

/**
 * Limpia un título removiendo el nombre del sitio y caracteres extra
 * @param {string} title - Título a limpiar
 * @param {string} siteName - Nombre del sitio (opcional)
 * @returns {string} Título limpio
 */
function cleanTitle(title, siteName = null) {
  if (!title) return '';

  let cleaned = title.trim();

  // Remover separadores comunes con nombre del sitio
  const separators = [' | ', ' - ', ' :: ', ' — ', ' – ', ' » '];
  
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned.split(sep);
      
      // Si el último elemento es el nombre del sitio, removerlo
      if (siteName && parts[parts.length - 1].toLowerCase().trim() === siteName.toLowerCase().trim()) {
        cleaned = parts.slice(0, -1).join(sep).trim();
      }
      // Si el primer elemento es el nombre del sitio, removerlo
      else if (siteName && parts[0].toLowerCase().trim() === siteName.toLowerCase().trim()) {
        cleaned = parts.slice(1).join(sep).trim();
      }
      // Tomar la parte más larga (probablemente el título real)
      else {
        cleaned = parts.reduce((longest, current) => 
          current.length > longest.length ? current : longest
        ).trim();
      }
      break;
    }
  }

  // Remover espacios extra
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Extrae título de meta tags Open Graph
 * @param {CheerioStatic} $ - Instancia de Cheerio
 * @returns {string|null} Título extraído o null
 */
function extractFromOpenGraph($) {
  try {
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle && ogTitle.trim().length > 0) {
      logger.debug(`Título extraído de og:title: "${ogTitle}"`);
      return ogTitle.trim();
    }
  } catch (error) {
    logger.warn('Error extrayendo og:title:', error.message);
  }
  return null;
}

/**
 * Extrae título de meta tags Twitter
 * @param {CheerioStatic} $ - Instancia de Cheerio
 * @returns {string|null} Título extraído o null
 */
function extractFromTwitter($) {
  try {
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    if (twitterTitle && twitterTitle.trim().length > 0) {
      logger.debug(`Título extraído de twitter:title: "${twitterTitle}"`);
      return twitterTitle.trim();
    }
  } catch (error) {
    logger.warn('Error extrayendo twitter:title:', error.message);
  }
  return null;
}

/**
 * Extrae título del tag <title>
 * @param {CheerioStatic} $ - Instancia de Cheerio
 * @returns {string|null} Título extraído o null
 */
function extractFromTitleTag($) {
  try {
    const titleTag = $('title').first().text();
    if (titleTag && titleTag.trim().length > 0) {
      logger.debug(`Título extraído de <title>: "${titleTag}"`);
      return titleTag.trim();
    }
  } catch (error) {
    logger.warn('Error extrayendo <title>:', error.message);
  }
  return null;
}

/**
 * Extrae título del primer h1
 * @param {CheerioStatic} $ - Instancia de Cheerio
 * @returns {string|null} Título extraído o null
 */
function extractFromH1($) {
  try {
    const h1 = $('h1').first().text();
    if (h1 && h1.trim().length > 0) {
      logger.debug(`Título extraído de <h1>: "${h1}"`);
      return h1.trim();
    }
  } catch (error) {
    logger.warn('Error extrayendo <h1>:', error.message);
  }
  return null;
}

/**
 * Extrae título de meta description como fallback
 * @param {CheerioStatic} $ - Instancia de Cheerio
 * @returns {string|null} Título extraído o null
 */
function extractFromDescription($) {
  try {
    const description = $('meta[name="description"]').attr('content');
    if (description && description.trim().length > 20) {
      // Tomar primeras palabras de la descripción
      const words = description.trim().split(' ');
      const title = words.slice(0, 15).join(' ');
      logger.debug(`Título extraído de description: "${title}"`);
      return title;
    }
  } catch (error) {
    logger.warn('Error extrayendo description:', error.message);
  }
  return null;
}

/**
 * Extrae el nombre del sitio de meta tags
 * @param {CheerioStatic} $ - Instancia de Cheerio
 * @returns {string|null} Nombre del sitio o null
 */
function extractSiteName($) {
  try {
    // Intentar og:site_name
    let siteName = $('meta[property="og:site_name"]').attr('content');
    if (siteName) return siteName.trim();

    // Intentar application-name
    siteName = $('meta[name="application-name"]').attr('content');
    if (siteName) return siteName.trim();

    // Intentar extraer del title tag (después del separador)
    const titleTag = $('title').first().text();
    if (titleTag) {
      const separators = [' | ', ' - ', ' :: '];
      for (const sep of separators) {
        if (titleTag.includes(sep)) {
          const parts = titleTag.split(sep);
          siteName = parts[parts.length - 1].trim();
          if (siteName.length > 0 && siteName.length < 50) {
            return siteName;
          }
        }
      }
    }
  } catch (error) {
    logger.warn('Error extrayendo site name:', error.message);
  }
  return null;
}

/**
 * Extrae título de una página HTML usando múltiples estrategias
 * PRIORIDAD: og:title → twitter:title → <title> → <h1> → description
 * @param {string} html - HTML de la página
 * @param {Object} options - Opciones de extracción
 * @returns {Object} { title, source, siteName, confidence }
 */
function extractTitle(html, options = {}) {
  const {
    url = null,
    validateTitle = true
  } = options;

  try {
    const $ = cheerio.load(html);
    let title = null;
    let source = null;
    let confidence = 0;

    // Extraer nombre del sitio primero
    const siteName = extractSiteName($);
    logger.debug(`Nombre del sitio: ${siteName || 'no detectado'}`);

    // Estrategia 1: Open Graph (más confiable)
    title = extractFromOpenGraph($);
    if (title) {
      source = 'og:title';
      confidence = 0.95;
      title = cleanTitle(title, siteName);
      
      if (!validateTitle || isValidTitle(title, siteName)) {
        logger.info(`✅ Título extraído de ${source}: "${title}"`);
        return { title, source, siteName, confidence };
      }
    }

    // Estrategia 2: Twitter Card
    title = extractFromTwitter($);
    if (title) {
      source = 'twitter:title';
      confidence = 0.90;
      title = cleanTitle(title, siteName);
      
      if (!validateTitle || isValidTitle(title, siteName)) {
        logger.info(`✅ Título extraído de ${source}: "${title}"`);
        return { title, source, siteName, confidence };
      }
    }

    // Estrategia 3: Title tag
    title = extractFromTitleTag($);
    if (title) {
      source = '<title>';
      confidence = 0.85;
      title = cleanTitle(title, siteName);
      
      if (!validateTitle || isValidTitle(title, siteName)) {
        logger.info(`✅ Título extraído de ${source}: "${title}"`);
        return { title, source, siteName, confidence };
      }
    }

    // Estrategia 4: H1
    title = extractFromH1($);
    if (title) {
      source = '<h1>';
      confidence = 0.80;
      title = cleanTitle(title, siteName);
      
      if (!validateTitle || isValidTitle(title, siteName)) {
        logger.info(`✅ Título extraído de ${source}: "${title}"`);
        return { title, source, siteName, confidence };
      }
    }

    // Estrategia 5: Description (último recurso)
    title = extractFromDescription($);
    if (title) {
      source = 'description';
      confidence = 0.60;
      
      if (!validateTitle || isValidTitle(title, siteName)) {
        logger.info(`✅ Título extraído de ${source}: "${title}"`);
        return { title, source, siteName, confidence };
      }
    }

    // No se pudo extraer título válido
    logger.warn(`⚠️ No se pudo extraer título válido de: ${url || 'URL desconocida'}`);
    return { title: null, source: null, siteName, confidence: 0 };

  } catch (error) {
    logger.error('Error extrayendo título:', {
      error: error.message,
      stack: error.stack,
      url
    });
    return { title: null, source: null, siteName: null, confidence: 0 };
  }
}

module.exports = {
  extractTitle,
  isValidTitle,
  cleanTitle,
  extractFromOpenGraph,
  extractFromTwitter,
  extractFromTitleTag,
  extractFromH1,
  extractSiteName,
  GENERIC_TITLES
};
