const { loggers } = require('./logger');

const logger = loggers.scraping;

/**
 * Utilidad para categorización inteligente de artículos
 * Prioriza categorización por URL y dominio antes de usar IA
 */

/**
 * Mapeo de categorías por patrones de URL
 */
const URL_CATEGORY_PATTERNS = {
  economia: ['economia', 'economic', 'finanzas', 'finance', 'negocios', 'business', 'mercado', 'market'],
  politica: ['politica', 'politics', 'gobierno', 'government', 'congreso', 'congress', 'elecciones', 'elections'],
  deportes: ['deportes', 'sports', 'futbol', 'football', 'soccer', 'tenis', 'tennis', 'basquetbol', 'basketball'],
  tecnologia: ['tecnologia', 'technology', 'tech', 'digital', 'internet', 'software', 'hardware', 'innovacion'],
  salud: ['salud', 'health', 'medicina', 'medical', 'hospital', 'doctor', 'enfermedad', 'disease'],
  educacion: ['educacion', 'education', 'universidad', 'university', 'escuela', 'school', 'estudiantes'],
  cultura: ['cultura', 'culture', 'arte', 'art', 'musica', 'music', 'cine', 'cinema', 'teatro', 'theater'],
  internacional: ['internacional', 'international', 'mundo', 'world', 'global', 'exterior', 'foreign'],
  nacional: ['nacional', 'national', 'pais', 'country', 'chile', 'region'],
  entretenimiento: ['entretenimiento', 'entertainment', 'espectaculos', 'shows', 'celebrities', 'famosos'],
  ciencia: ['ciencia', 'science', 'investigacion', 'research', 'estudio', 'study', 'descubrimiento'],
  medio_ambiente: ['medio-ambiente', 'environment', 'clima', 'climate', 'ecologia', 'ecology', 'sustentabilidad'],
  seguridad: ['seguridad', 'security', 'policia', 'police', 'crimen', 'crime', 'delincuencia']
};

/**
 * Keywords por categoría para análisis de contenido
 */
const CATEGORY_KEYWORDS = {
  economia: {
    keywords: ['dólar', 'peso', 'inflación', 'banco central', 'mercado', 'inversión', 'acciones', 'bolsa', 'pib', 'empleo', 'desempleo', 'salario', 'impuesto', 'comercio', 'exportación', 'importación'],
    weight: 1.0
  },
  politica: {
    keywords: ['presidente', 'gobierno', 'ministro', 'congreso', 'diputado', 'senador', 'ley', 'reforma', 'elecciones', 'votación', 'partido político', 'coalición', 'oposición'],
    weight: 1.0
  },
  deportes: {
    keywords: ['gol', 'partido', 'equipo', 'jugador', 'entrenador', 'campeonato', 'torneo', 'liga', 'copa', 'victoria', 'derrota', 'clasificación', 'estadio'],
    weight: 1.0
  },
  tecnologia: {
    keywords: ['tecnología', 'software', 'hardware', 'aplicación', 'app', 'inteligencia artificial', 'ia', 'robot', 'algoritmo', 'datos', 'ciberseguridad', 'startup', 'innovación'],
    weight: 1.0
  },
  salud: {
    keywords: ['hospital', 'médico', 'paciente', 'enfermedad', 'tratamiento', 'vacuna', 'virus', 'bacteria', 'síntoma', 'diagnóstico', 'cirugía', 'salud pública', 'pandemia'],
    weight: 1.0
  },
  educacion: {
    keywords: ['universidad', 'colegio', 'escuela', 'estudiante', 'profesor', 'educación', 'clase', 'examen', 'título', 'carrera', 'matrícula', 'beca'],
    weight: 1.0
  },
  cultura: {
    keywords: ['arte', 'música', 'cine', 'película', 'libro', 'autor', 'artista', 'exposición', 'museo', 'teatro', 'obra', 'festival', 'cultura'],
    weight: 0.9
  },
  internacional: {
    keywords: ['estados unidos', 'europa', 'asia', 'áfrica', 'onu', 'otan', 'embajada', 'diplomacia', 'tratado', 'conflicto internacional', 'relaciones exteriores'],
    weight: 0.9
  },
  nacional: {
    keywords: ['chile', 'chileno', 'región', 'provincia', 'comuna', 'municipalidad', 'intendencia', 'gobernación'],
    weight: 0.8
  },
  entretenimiento: {
    keywords: ['celebrity', 'famoso', 'actor', 'actriz', 'cantante', 'show', 'espectáculo', 'estreno', 'gala', 'premio', 'nominación'],
    weight: 0.8
  },
  ciencia: {
    keywords: ['científico', 'investigación', 'estudio', 'descubrimiento', 'experimento', 'laboratorio', 'teoría', 'hipótesis', 'análisis', 'publicación'],
    weight: 0.9
  },
  medio_ambiente: {
    keywords: ['clima', 'calentamiento global', 'contaminación', 'reciclaje', 'energía renovable', 'biodiversidad', 'ecosistema', 'deforestación', 'emisiones'],
    weight: 0.9
  },
  seguridad: {
    keywords: ['policía', 'carabineros', 'pdi', 'delincuencia', 'robo', 'asalto', 'crimen', 'investigación policial', 'detención', 'seguridad ciudadana'],
    weight: 1.0
  }
};

/**
 * Extrae categoría desde la URL
 * @param {string} url - URL del artículo
 * @returns {Object} { category, confidence, method }
 */
function categorizeByUrl(url) {
  if (!url || typeof url !== 'string') {
    return { category: null, confidence: 0, method: 'url' };
  }

  const urlLower = url.toLowerCase();

  // Buscar patrones en la URL
  for (const [category, patterns] of Object.entries(URL_CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (urlLower.includes(`/${pattern}/`) || urlLower.includes(`/${pattern}-`)) {
        logger.debug(`Categoría detectada por URL: ${category} (patrón: ${pattern})`);
        return { category, confidence: 0.95, method: 'url' };
      }
    }
  }

  return { category: null, confidence: 0, method: 'url' };
}

/**
 * Extrae categoría analizando título y contenido con keywords
 * @param {string} title - Título del artículo
 * @param {string} content - Contenido del artículo
 * @returns {Object} { category, confidence, method }
 */
function categorizeByKeywords(title, content) {
  if (!title && !content) {
    return { category: null, confidence: 0, method: 'keywords' };
  }

  const text = `${title || ''} ${content || ''}`.toLowerCase();
  const scores = {};

  // Calcular score para cada categoría
  for (const [category, data] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    let matchCount = 0;

    for (const keyword of data.keywords) {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(`\\b${keywordLower}\\b`, 'gi');
      const matches = (text.match(regex) || []).length;
      
      if (matches > 0) {
        score += matches * data.weight;
        matchCount++;
      }
    }

    if (matchCount > 0) {
      scores[category] = {
        score: score,
        matchCount: matchCount,
        confidence: Math.min(0.9, (matchCount / data.keywords.length) * data.weight)
      };
    }
  }

  // Encontrar categoría con mayor score
  let bestCategory = null;
  let bestScore = 0;
  let bestConfidence = 0;

  for (const [category, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestCategory = category;
      bestConfidence = data.confidence;
    }
  }

  if (bestCategory) {
    logger.debug(`Categoría detectada por keywords: ${bestCategory} (confianza: ${bestConfidence.toFixed(2)})`);
    return { category: bestCategory, confidence: bestConfidence, method: 'keywords' };
  }

  return { category: null, confidence: 0, method: 'keywords' };
}

/**
 * Categorización por dominio (reglas específicas por sitio)
 * @param {string} domain - Dominio del sitio
 * @param {string} title - Título del artículo
 * @param {string} content - Contenido del artículo
 * @returns {Object} { category, confidence, method }
 */
function categorizeByDomain(domain, title, content) {
  if (!domain) {
    return { category: null, confidence: 0, method: 'domain' };
  }

  const domainLower = domain.toLowerCase();

  // Reglas específicas por dominio conocido
  const domainRules = {
    'emol.com': () => categorizeByKeywords(title, content),
    'biobiochile.cl': () => categorizeByKeywords(title, content),
    'latercera.com': () => categorizeByKeywords(title, content),
    'elmercurio.com': () => categorizeByKeywords(title, content),
    'df.cl': () => ({ category: 'economia', confidence: 0.85, method: 'domain' }),
    'gol.cl': () => ({ category: 'deportes', confidence: 0.85, method: 'domain' }),
    'fayerwayer.com': () => ({ category: 'tecnologia', confidence: 0.85, method: 'domain' })
  };

  for (const [domainPattern, rule] of Object.entries(domainRules)) {
    if (domainLower.includes(domainPattern)) {
      const result = rule();
      if (result.category) {
        logger.debug(`Categoría detectada por dominio: ${result.category}`);
        return { ...result, method: 'domain' };
      }
    }
  }

  return { category: null, confidence: 0, method: 'domain' };
}

/**
 * Categorización inteligente con múltiples estrategias
 * @param {Object} article - Artículo a categorizar
 * @param {Object} options - Opciones de categorización
 * @returns {Object} { category, confidence, method }
 */
function categorizeArticle(article, options = {}) {
  const {
    url = null,
    domain = null,
    title = '',
    content = '',
    minConfidence = 0.7
  } = options;

  try {
    // Inicializar resultados
    let urlResult = { category: null, confidence: 0, method: 'url' };
    let domainResult = { category: null, confidence: 0, method: 'domain' };
    let keywordsResult = { category: null, confidence: 0, method: 'keywords' };

    // ESTRATEGIA 1: Categorizar por URL (más confiable)
    if (url) {
      urlResult = categorizeByUrl(url);
      if (urlResult.category && urlResult.confidence >= minConfidence) {
        logger.info(`✅ Categoría por URL: ${urlResult.category} (${(urlResult.confidence * 100).toFixed(0)}%)`);
        return urlResult;
      }
    }

    // ESTRATEGIA 2: Categorizar por dominio
    if (domain) {
      domainResult = categorizeByDomain(domain, title, content);
      if (domainResult.category && domainResult.confidence >= minConfidence) {
        logger.info(`✅ Categoría por dominio: ${domainResult.category} (${(domainResult.confidence * 100).toFixed(0)}%)`);
        return domainResult;
      }
    }

    // ESTRATEGIA 3: Categorizar por keywords
    keywordsResult = categorizeByKeywords(title, content);
    if (keywordsResult.category && keywordsResult.confidence >= minConfidence) {
      logger.info(`✅ Categoría por keywords: ${keywordsResult.category} (${(keywordsResult.confidence * 100).toFixed(0)}%)`);
      return keywordsResult;
    }

    // Si ninguna estrategia alcanza el umbral, retornar la mejor opción con flag de baja confianza
    const allResults = [urlResult, domainResult, keywordsResult].filter(r => r.category);
    
    if (allResults.length > 0) {
      const best = allResults.reduce((prev, current) => 
        current.confidence > prev.confidence ? current : prev
      );
      
      logger.warn(`⚠️  Categoría con baja confianza: ${best.category} (${(best.confidence * 100).toFixed(0)}%)`);
      return best;
    }

    // No se pudo categorizar
    logger.warn('⚠️  No se pudo categorizar el artículo');
    return { category: 'general', confidence: 0.3, method: 'fallback' };

  } catch (error) {
    logger.error('Error categorizando artículo:', {
      error: error.message,
      stack: error.stack
    });
    return { category: 'general', confidence: 0.3, method: 'fallback' };
  }
}

/**
 * Obtiene lista de categorías disponibles
 * @returns {Array} Lista de categorías
 */
function getAvailableCategories() {
  return Object.keys(URL_CATEGORY_PATTERNS);
}

module.exports = {
  categorizeArticle,
  categorizeByUrl,
  categorizeByKeywords,
  categorizeByDomain,
  getAvailableCategories,
  URL_CATEGORY_PATTERNS,
  CATEGORY_KEYWORDS
};
