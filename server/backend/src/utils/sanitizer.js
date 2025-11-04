const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Configuración estricta de sanitización para contenido scrapeado
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'i', 'b',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'section', 'article'
  ],
  ALLOWED_ATTR: ['href', 'title', 'alt'],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^https?:\/\//,
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  FORCE_BODY: false
};

/**
 * Configuración permisiva para títulos y textos cortos
 */
const TEXT_CONFIG = {
  ALLOWED_TAGS: [],
  KEEP_CONTENT: true
};

/**
 * Sanitiza contenido HTML completo (artículos, noticias)
 * @param {string} html - HTML a sanitizar
 * @returns {string} - HTML sanitizado
 */
const sanitizeContent = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  try {
    return DOMPurify.sanitize(html, STRICT_CONFIG);
  } catch (error) {
    console.error('Error sanitizando contenido:', error.message);
    return '';
  }
};

/**
 * Sanitiza texto plano (títulos, nombres, descripciones)
 * Remueve todos los tags HTML pero mantiene el contenido
 * @param {string} text - Texto a sanitizar
 * @returns {string} - Texto limpio sin HTML
 */
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  try {
    return DOMPurify.sanitize(text, TEXT_CONFIG).trim();
  } catch (error) {
    console.error('Error sanitizando texto:', error.message);
    return '';
  }
};

/**
 * Sanitiza URL para prevenir javascript: y data: URIs
 * @param {string} url - URL a sanitizar
 * @returns {string|null} - URL sanitizada o null si es inválida
 */
const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  const trimmed = url.trim();
  
  // Bloquear protocolos peligrosos
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmed.toLowerCase();
  
  if (dangerousProtocols.some(proto => lowerUrl.startsWith(proto))) {
    return null;
  }
  
  // Validar que sea HTTP o HTTPS
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
    return null;
  }
  
  return trimmed;
};

/**
 * Sanitiza objeto completo de resultado de scraping
 * @param {Object} result - Resultado de scraping
 * @returns {Object} - Resultado sanitizado
 */
const sanitizeScrapingResult = (result) => {
  if (!result || typeof result !== 'object') {
    return result;
  }
  
  return {
    ...result,
    title: result.title ? sanitizeText(result.title) : '',
    summary: result.summary ? sanitizeText(result.summary) : '',
    content: result.content ? sanitizeContent(result.content) : '',
    cleaned_content: result.cleaned_content ? sanitizeContent(result.cleaned_content) : '',
    author: result.author ? sanitizeText(result.author) : null,
    category: result.category ? sanitizeText(result.category) : null,
    url: result.url ? sanitizeUrl(result.url) : null
  };
};

module.exports = {
  sanitizeContent,
  sanitizeText,
  sanitizeUrl,
  sanitizeScrapingResult
};
