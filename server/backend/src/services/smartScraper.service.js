const cheerio = require('cheerio');
const { loggers } = require('../utils/logger');
const {
  isValidResult,
  cleanContent,
  extractImages,
  sanitizeText,
  isProbablyMainContent,
  calculateTextDensity
} = require('../utils/contentValidator');
const { detectPaywall } = require('../utils/paywallDetector');
const config = require('../config/env');

const logger = loggers.scraping;

/**
 * Timeout para cada estrategia de extracción (5 segundos)
 */
const STRATEGY_TIMEOUT = 5000;

/**
 * Ejecuta una función con timeout
 * @param {Function} fn - Función a ejecutar
 * @param {number} timeout - Timeout en ms
 * @returns {Promise}
 */
async function withTimeout(fn, timeout) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Strategy timeout')), timeout)
    )
  ]);
}

/**
 * Estrategia 1: Detectar datos estructurados (JSON-LD, Open Graph)
 * Confidence: 0.9
 */
async function detectStructuredData(html, url) {
  try {
    const $ = cheerio.load(html);
    const result = {
      title: null,
      content: null,
      date: null,
      author: null,
      images: [],
      confidence: 0.9,
      strategy: 'structured-data'
    };

    // 1. Buscar JSON-LD (schema.org)
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonData = JSON.parse($(element).html());
        
        // Puede ser un array o un objeto
        const data = Array.isArray(jsonData) ? jsonData[0] : jsonData;
        
        if (data['@type'] === 'NewsArticle' || data['@type'] === 'Article' || data['@type'] === 'BlogPosting') {
          result.title = result.title || sanitizeText(data.headline || data.name);
          result.content = result.content || sanitizeText(data.articleBody || data.description);
          result.date = result.date || sanitizeText(data.datePublished || data.dateCreated);
          result.author = result.author || sanitizeText(
            data.author?.name || 
            (Array.isArray(data.author) ? data.author[0]?.name : null)
          );
          
          if (data.image) {
            const imageUrl = typeof data.image === 'string' ? data.image : data.image?.url;
            if (imageUrl) result.images.push(imageUrl);
          }
        }
      } catch (e) {
        // JSON inválido, continuar
      }
    });

    // 2. Buscar Open Graph meta tags
    if (!result.title) {
      result.title = sanitizeText($('meta[property="og:title"]').attr('content'));
    }
    
    if (!result.content) {
      result.content = sanitizeText($('meta[property="og:description"]').attr('content'));
    }
    
    if (!result.date) {
      result.date = sanitizeText(
        $('meta[property="article:published_time"]').attr('content') ||
        $('meta[name="publish-date"]').attr('content') ||
        $('meta[name="date"]').attr('content')
      );
    }
    
    if (!result.author) {
      result.author = sanitizeText(
        $('meta[property="article:author"]').attr('content') ||
        $('meta[name="author"]').attr('content')
      );
    }
    
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && !result.images.includes(ogImage)) {
      result.images.push(ogImage);
    }

    // 3. Si tenemos título y contenido, intentar mejorar el contenido buscando en el HTML
    if (result.title && result.content && result.content.length < 500) {
      // El contenido de OG suele ser corto, buscar el contenido completo
      const articleContent = $('article, [role="article"], .article-content, .post-content, .entry-content')
        .first()
        .text();
      
      if (articleContent && articleContent.length > result.content.length) {
        result.content = sanitizeText(cleanContent(articleContent));
      }
    }

    logger.debug(`Structured data extraction: title=${!!result.title}, content=${!!result.content}`);
    
    return result;
  } catch (error) {
    logger.warn('Error in structured data detection', error);
    return null;
  }
}

/**
 * Estrategia 2: Analizar HTML semántico
 * Confidence: 0.7
 */
async function analyzeSemanticHTML($, url) {
  try {
    const result = {
      title: null,
      content: null,
      date: null,
      author: null,
      images: [],
      confidence: 0.7,
      strategy: 'semantic-html'
    };

    // 1. Buscar contenedor principal
    const mainContainers = $('article, main, [role="main"], [role="article"]');
    
    if (mainContainers.length === 0) {
      return null;
    }

    const $main = mainContainers.first();

    // 2. Extraer título
    const titleSelectors = ['h1', 'h2', '.title', '.headline', '[itemprop="headline"]'];
    for (const selector of titleSelectors) {
      const title = $main.find(selector).first().text();
      if (title && title.trim().length > 10) {
        result.title = sanitizeText(title);
        break;
      }
    }

    // 3. Extraer fecha
    const $time = $main.find('time[datetime], [datetime], .date, .published, [itemprop="datePublished"]').first();
    result.date = sanitizeText($time.attr('datetime') || $time.text());

    // 4. Extraer autor
    const authorSelectors = [
      '[rel="author"]',
      '[itemprop="author"]',
      '.author',
      '.byline',
      '.author-name'
    ];
    
    for (const selector of authorSelectors) {
      const author = $main.find(selector).first().text();
      if (author && author.trim().length > 0) {
        result.author = sanitizeText(author);
        break;
      }
    }

    // 5. Extraer contenido
    // Buscar el contenedor de contenido dentro del main
    const contentSelectors = [
      '.entry-content',
      '.post-content',
      '.article-content',
      '.article-body',
      '[itemprop="articleBody"]',
      '.content'
    ];

    let $content = null;
    for (const selector of contentSelectors) {
      const found = $main.find(selector).first();
      if (found.length > 0) {
        $content = found;
        break;
      }
    }

    // Si no encontramos contenedor específico, usar todo el main
    if (!$content || $content.length === 0) {
      $content = $main;
    }

    // Extraer texto de párrafos
    const paragraphs = [];
    $content.find('p').each((_, p) => {
      const text = $(p).text().trim();
      if (text.length > 20) {
        paragraphs.push(text);
      }
    });

    if (paragraphs.length > 0) {
      result.content = sanitizeText(paragraphs.join('\n\n'));
    }

    // 6. Extraer imágenes
    result.images = extractImages($content, url);

    logger.debug(`Semantic HTML extraction: title=${!!result.title}, content=${!!result.content}`);
    
    return result;
  } catch (error) {
    logger.warn('Error in semantic HTML analysis', error);
    return null;
  }
}

/**
 * Estrategia 3: Calcular densidad de texto
 * Confidence: 0.5
 */
async function calculateTextDensityStrategy($, url) {
  try {
    const result = {
      title: null,
      content: null,
      date: null,
      author: null,
      images: [],
      confidence: 0.5,
      strategy: 'text-density'
    };

    // 1. Buscar título en h1
    const h1 = $('h1').first().text();
    if (h1 && h1.trim().length > 10) {
      result.title = sanitizeText(h1);
    }

    // 2. Analizar todos los elementos del body
    const candidates = [];
    
    $('body *').each((_, element) => {
      const $el = $(element);
      
      // Ignorar elementos no deseados
      const tagName = element.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
        return;
      }

      // Ignorar por clase/id
      const classes = $el.attr('class') || '';
      const id = $el.attr('id') || '';
      const combined = (classes + ' ' + id).toLowerCase();
      
      if (combined.match(/nav|menu|footer|sidebar|header|ad|comment|widget/)) {
        return;
      }

      // Calcular densidad
      const density = calculateTextDensity($el);
      const textLength = $el.text().trim().length;
      
      // Solo considerar elementos con buena densidad y suficiente texto
      if (density > 0.3 && textLength > 100) {
        candidates.push({
          element: $el,
          density,
          textLength,
          score: density * Math.log(textLength) // Score combinado
        });
      }
    });

    // 3. Ordenar por score y seleccionar el mejor
    candidates.sort((a, b) => b.score - a.score);
    
    if (candidates.length > 0) {
      const best = candidates[0];
      
      // Extraer párrafos del mejor candidato
      const paragraphs = [];
      best.element.find('p').each((_, p) => {
        const text = $(p).text().trim();
        if (text.length > 20) {
          paragraphs.push(text);
        }
      });

      if (paragraphs.length > 0) {
        result.content = sanitizeText(paragraphs.join('\n\n'));
      } else {
        result.content = sanitizeText(best.element.text());
      }

      // Extraer imágenes
      result.images = extractImages(best.element, url);
      
      logger.debug(`Text density extraction: density=${best.density.toFixed(2)}, length=${best.textLength}`);
    }

    return result;
  } catch (error) {
    logger.warn('Error in text density calculation', error);
    return null;
  }
}

/**
 * Estrategia 4: Buscar el contenido más largo
 * Confidence: 0.3
 */
async function findLongestContent($, url) {
  try {
    const result = {
      title: null,
      content: null,
      date: null,
      author: null,
      images: [],
      confidence: 0.3,
      strategy: 'longest-content'
    };

    // 1. Buscar título
    const h1 = $('h1').first().text();
    if (h1 && h1.trim().length > 10) {
      result.title = sanitizeText(h1);
    }

    // 2. Buscar todos los contenedores potenciales
    const candidates = [];
    
    $('div, section, article, main').each((_, element) => {
      const $el = $(element);
      
      // Ignorar elementos con clases no deseadas
      if (!isProbablyMainContent($el)) {
        return;
      }

      // Concatenar texto de párrafos
      const paragraphs = [];
      $el.find('p').each((_, p) => {
        const text = $(p).text().trim();
        if (text.length > 20) {
          paragraphs.push(text);
        }
      });

      const content = paragraphs.join('\n\n');
      
      if (content.length > 100) {
        candidates.push({
          element: $el,
          content,
          length: content.length
        });
      }
    });

    // 3. Seleccionar el más largo
    candidates.sort((a, b) => b.length - a.length);
    
    if (candidates.length > 0) {
      const longest = candidates[0];
      result.content = sanitizeText(longest.content);
      result.images = extractImages(longest.element, url);
      
      logger.debug(`Longest content extraction: length=${longest.length}`);
    }

    return result;
  } catch (error) {
    logger.warn('Error in longest content search', error);
    return null;
  }
}

/**
 * Función principal: Smart Scrape con múltiples estrategias
 * @param {string} url - URL del sitio
 * @param {string} html - HTML del sitio
 * @returns {Promise<object>}
 */
async function smartScrape(url, html) {
  logger.info(`🧠 Iniciando smart scraping para: ${url}`);
  
  const $ = cheerio.load(html);
  
  // Estrategias en orden de confianza (mayor a menor)
  const strategies = [
    { name: 'Structured Data', fn: () => detectStructuredData(html, url) },
    { name: 'Semantic HTML', fn: () => analyzeSemanticHTML($, url) },
    { name: 'Text Density', fn: () => calculateTextDensityStrategy($, url) },
    { name: 'Longest Content', fn: () => findLongestContent($, url) }
  ];

  // Ejecutar estrategias en orden
  for (const strategy of strategies) {
    try {
      logger.debug(`Probando estrategia: ${strategy.name}`);
      
      const result = await withTimeout(strategy.fn, STRATEGY_TIMEOUT);
      
      if (result && isValidResult(result)) {
        logger.info(`✅ Estrategia exitosa: ${strategy.name} (confidence: ${result.confidence})`);
        
        // Detectar paywall si está habilitado
        let paywallInfo = {
          hasPaywall: false,
          paywallConfidence: 0
        };
        
        if (config.paywallDetectionEnabled) {
          const paywallCheck = detectPaywall(html, result.content || '');
          if (paywallCheck.hasPaywall) {
            logger.warn(`⚠️ Paywall detectado: ${paywallCheck.message}`);
            paywallInfo = {
              hasPaywall: true,
              paywallConfidence: paywallCheck.confidence,
              paywallMethod: paywallCheck.method,
              paywallIndicator: paywallCheck.indicator
            };
          }
        }
        
        return {
          success: true,
          ...result,
          ...paywallInfo,
          url,
          extractedAt: new Date().toISOString()
        };
      } else {
        logger.debug(`❌ Estrategia ${strategy.name} no produjo resultado válido`);
      }
    } catch (error) {
      logger.warn(`Error en estrategia ${strategy.name}:`, error.message);
    }
  }

  // Si todas las estrategias fallaron
  logger.warn(`⚠️ Todas las estrategias fallaron para: ${url}`);
  
  return {
    success: false,
    needsHelp: true,
    reason: 'No se pudo extraer contenido válido con ninguna estrategia',
    url,
    attemptedStrategies: strategies.map(s => s.name),
    extractedAt: new Date().toISOString()
  };
}

/**
 * Valida si un resultado tiene contenido válido
 * @param {object} result - Resultado a validar
 * @returns {boolean}
 */
function isValidContent(result) {
  return isValidResult(result);
}

module.exports = {
  smartScrape,
  detectStructuredData,
  analyzeSemanticHTML,
  calculateTextDensityStrategy,
  findLongestContent,
  isValidContent
};
