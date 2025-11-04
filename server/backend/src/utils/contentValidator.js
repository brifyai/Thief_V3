const cheerio = require('cheerio');

/**
 * Utilidades para validar y limpiar contenido extraído
 */

/**
 * Palabras que indican contenido de navegación/UI (no contenido principal)
 */
const NAVIGATION_KEYWORDS = [
  'home', 'menú', 'menu', 'navegación', 'navigation', 'sidebar', 'footer',
  'header', 'login', 'registro', 'sign in', 'sign up', 'search', 'buscar',
  'compartir', 'share', 'tweet', 'facebook', 'instagram', 'twitter',
  'suscribir', 'subscribe', 'newsletter', 'cookie', 'política', 'privacy',
  'términos', 'terms', 'condiciones', 'conditions', 'copyright', 'derechos',
  'all rights reserved', 'todos los derechos', 'contacto', 'contact',
  'about us', 'acerca de', 'quiénes somos'
];

/**
 * Valida si un título es válido
 * @param {string} title - Título a validar
 * @returns {boolean}
 */
function isValidTitle(title) {
  if (!title || typeof title !== 'string') return false;
  
  const cleanTitle = title.trim();
  
  // Longitud entre 10 y 200 caracteres
  if (cleanTitle.length < 10 || cleanTitle.length > 200) return false;
  
  // No debe ser solo números o caracteres especiales
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]{5,}/.test(cleanTitle)) return false;
  
  // No debe contener palabras de navegación
  const lowerTitle = cleanTitle.toLowerCase();
  const hasNavKeywords = NAVIGATION_KEYWORDS.some(keyword => 
    lowerTitle === keyword || lowerTitle.startsWith(keyword + ' ')
  );
  
  return !hasNavKeywords;
}

/**
 * Valida si el contenido es válido
 * @param {string} content - Contenido a validar
 * @returns {boolean}
 */
function isValidContent(content) {
  if (!content || typeof content !== 'string') return false;
  
  const cleanContent = content.trim();
  
  // Mínimo 100 caracteres
  if (cleanContent.length < 100) return false;
  
  // Debe tener al menos 3 palabras
  const words = cleanContent.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 3) return false;
  
  // No debe ser solo números o caracteres especiales
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]{10,}/.test(cleanContent)) return false;
  
  return true;
}

/**
 * Valida un resultado completo de scraping
 * @param {object} result - Resultado a validar
 * @returns {boolean}
 */
function isValidResult(result) {
  if (!result || typeof result !== 'object') return false;
  
  // Debe tener título válido
  if (!result.title || !isValidTitle(result.title)) return false;
  
  // Debe tener contenido válido
  if (!result.content || !isValidContent(result.content)) return false;
  
  return true;
}

/**
 * Limpia HTML y extrae texto plano
 * @param {string} html - HTML a limpiar
 * @returns {string}
 */
function cleanContent(html) {
  if (!html) return '';
  
  try {
    const $ = cheerio.load(html);
    
    // Remover elementos no deseados
    $('script, style, noscript, iframe, nav, header, footer, aside, .ad, .advertisement, .social-share').remove();
    
    // Obtener texto
    let text = $.text();
    
    // Limpiar espacios múltiples
    text = text.replace(/\s+/g, ' ');
    
    // Limpiar saltos de línea múltiples
    text = text.replace(/\n+/g, '\n');
    
    return text.trim();
  } catch (error) {
    // Si falla el parsing, intentar limpieza básica
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * Extrae imágenes de un elemento HTML
 * @param {cheerio.Cheerio} $element - Elemento de Cheerio
 * @param {string} baseUrl - URL base para resolver URLs relativas
 * @returns {array}
 */
function extractImages($element, baseUrl) {
  const images = new Set();
  
  $element.find('img').each((_, img) => {
    const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
    
    if (!src) return;
    
    // Ignorar imágenes pequeñas, iconos, etc.
    const width = parseInt($(img).attr('width')) || 0;
    const height = parseInt($(img).attr('height')) || 0;
    
    if (width > 0 && width < 100) return;
    if (height > 0 && height < 100) return;
    
    // Ignorar imágenes de tracking, ads, etc.
    if (src.match(/pixel|tracker|ad|banner|logo|icon|avatar|emoji/i)) return;
    
    try {
      const imageUrl = new URL(src, baseUrl).href;
      images.add(imageUrl);
    } catch (e) {
      // URL inválida, ignorar
    }
  });
  
  return Array.from(images);
}

/**
 * Calcula la legibilidad básica del texto (Flesch Reading Ease simplificado)
 * @param {string} text - Texto a analizar
 * @returns {number} Score de 0-100 (mayor = más legible)
 */
function calculateReadability(text) {
  if (!text || text.length < 100) return 0;
  
  // Contar oraciones (aproximado)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  if (sentences === 0) return 0;
  
  // Contar palabras
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  if (words === 0) return 0;
  
  // Contar sílabas (aproximado para español)
  const syllables = text.match(/[aeiouáéíóúü]/gi)?.length || 0;
  
  // Fórmula simplificada
  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllables / words;
  
  // Score: penalizar oraciones muy largas y palabras muy largas
  let score = 100;
  score -= (avgWordsPerSentence - 15) * 2; // Ideal: 15 palabras/oración
  score -= (avgSyllablesPerWord - 2) * 10; // Ideal: 2 sílabas/palabra
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Sanitiza texto removiendo caracteres problemáticos
 * @param {string} text - Texto a sanitizar
 * @returns {string}
 */
function sanitizeText(text) {
  if (!text) return '';
  
  return text
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Caracteres de control
    .replace(/\u200B/g, '') // Zero-width space
    .replace(/\u00A0/g, ' ') // Non-breaking space
    .replace(/\s+/g, ' ') // Múltiples espacios
    .trim();
}

/**
 * Verifica si un elemento es probablemente contenido principal
 * @param {cheerio.Cheerio} $element - Elemento a verificar
 * @returns {boolean}
 */
function isProbablyMainContent($element) {
  const classes = $element.attr('class') || '';
  const id = $element.attr('id') || '';
  const combined = (classes + ' ' + id).toLowerCase();
  
  // Palabras positivas (indican contenido principal)
  const positiveKeywords = [
    'article', 'content', 'main', 'post', 'entry', 'story', 'body',
    'texto', 'contenido', 'noticia', 'articulo'
  ];
  
  // Palabras negativas (indican no-contenido)
  const negativeKeywords = [
    'nav', 'menu', 'sidebar', 'footer', 'header', 'ad', 'advertisement',
    'comment', 'widget', 'related', 'share', 'social', 'popup', 'modal'
  ];
  
  const hasPositive = positiveKeywords.some(kw => combined.includes(kw));
  const hasNegative = negativeKeywords.some(kw => combined.includes(kw));
  
  return hasPositive && !hasNegative;
}

/**
 * Calcula la densidad de texto de un elemento
 * @param {cheerio.Cheerio} $element - Elemento a analizar
 * @returns {number} Ratio de texto/HTML (0-1)
 */
function calculateTextDensity($element) {
  const html = $element.html() || '';
  const text = $element.text() || '';
  
  if (html.length === 0) return 0;
  
  const textLength = text.replace(/\s+/g, '').length;
  const htmlLength = html.length;
  
  return textLength / htmlLength;
}

module.exports = {
  isValidTitle,
  isValidContent,
  isValidResult,
  cleanContent,
  extractImages,
  calculateReadability,
  sanitizeText,
  isProbablyMainContent,
  calculateTextDensity,
  NAVIGATION_KEYWORDS
};
