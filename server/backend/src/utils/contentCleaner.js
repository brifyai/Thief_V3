/**
 * Utilidad para limpiar contenido HTML y texto extraído
 * Soluciona problemas como: .p, p8220;, entidades HTML mal formateadas, etc.
 */

const { decode } = require('html-entities');

/**
 * Limpia contenido HTML/texto de etiquetas, entidades y caracteres extraños
 * @param {string} html - Contenido a limpiar
 * @returns {string} - Contenido limpio
 */
function cleanContent(html) {
  if (!html || typeof html !== 'string') return '';
  
  let cleaned = html;
  
  // 1. Remover etiquetas HTML completas
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, ' ');
  
  // 2. Limpiar etiquetas HTML mal cerradas o visibles
  cleaned = cleaned.replace(/\.p\s+p/g, '. ');  // .p p → ". "
  cleaned = cleaned.replace(/\.p(?=\s|$)/g, '.');  // .p al final → "."
  cleaned = cleaned.replace(/\bp\s+p\b/g, ' ');  // p p → " "
  cleaned = cleaned.replace(/\s+p\s+/g, ' ');  // espacios + p + espacios
  
  // 3. Limpiar código HTML visible y entidades mal formateadas
  cleaned = cleaned.replace(/p8220;/g, '"');
  cleaned = cleaned.replace(/p8221;/g, '"');
  cleaned = cleaned.replace(/8220;/g, '"');
  cleaned = cleaned.replace(/8221;/g, '"');
  cleaned = cleaned.replace(/8216;/g, "'");
  cleaned = cleaned.replace(/8217;/g, "'");
  cleaned = cleaned.replace(/8211;/g, '-');
  cleaned = cleaned.replace(/8212;/g, '-');
  cleaned = cleaned.replace(/8230;/g, '...');
  
  // 4. Decodificar entidades HTML correctas
  try {
    cleaned = decode(cleaned);  // &quot; → ", &#8220; → ", etc.
  } catch (e) {
    // Si falla, continuar con el texto parcialmente limpio
  }
  
  // 5. Limpiar entidades HTML residuales
  cleaned = cleaned.replace(/&[a-z]+;/gi, '');  // Otras entidades no decodificadas
  cleaned = cleaned.replace(/&#\d+;/g, '');  // Entidades numéricas residuales
  
  // 6. Normalizar espacios y puntuación
  cleaned = cleaned.replace(/\s+/g, ' ');  // Múltiples espacios → 1
  cleaned = cleaned.replace(/\s+\./g, '.');  // " ." → "."
  cleaned = cleaned.replace(/\s+,/g, ',');  // " ," → ","
  cleaned = cleaned.replace(/\.\s+([a-z])/g, '. $1');  // ".palabra" → ". palabra"
  cleaned = cleaned.replace(/([.!?])\s*([A-Z])/g, '$1 $2');  // Espacio después de puntuación
  
  // 7. Limpiar saltos de línea excesivos
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');  // Máximo 2 saltos
  
  // 8. Remover caracteres extraños al inicio y final
  cleaned = cleaned.replace(/^[.\s,;:]+/, '');  // Inicio
  cleaned = cleaned.replace(/[.\s,;:]+$/, '');  // Final
  
  // 9. Trim final
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Genera un resumen corto del contenido
 * @param {string} content - Contenido completo
 * @param {number} maxLength - Longitud máxima del resumen
 * @returns {string} - Resumen
 */
function generateSummary(content, maxLength = 200) {
  if (!content) return '';
  
  const cleaned = cleanContent(content);
  
  // Tomar las primeras oraciones hasta alcanzar maxLength
  const sentences = cleaned.split(/[.!?]+\s+/);
  let summary = '';
  
  for (const sentence of sentences) {
    if ((summary + sentence).length > maxLength) {
      break;
    }
    summary += sentence + '. ';
  }
  
  // Si no hay suficiente, tomar substring
  if (summary.length < 50 && cleaned.length > 0) {
    summary = cleaned.substring(0, maxLength) + '...';
  }
  
  return summary.trim();
}

/**
 * Extrae el título del contenido si no se proporcionó
 * @param {string} content - Contenido completo
 * @returns {string} - Título extraído
 */
function extractTitleFromContent(content) {
  if (!content) return '';
  
  const cleaned = cleanContent(content);
  
  // Tomar la primera oración o primeras 100 caracteres
  const firstSentence = cleaned.split(/[.!?]+/)[0];
  
  if (firstSentence && firstSentence.length > 10 && firstSentence.length < 150) {
    return firstSentence.trim();
  }
  
  // Fallback: primeros 100 caracteres
  return cleaned.substring(0, 100).trim() + '...';
}

/**
 * Valida si un título es válido
 * @param {string} title - Título a validar
 * @returns {boolean}
 */
function isValidTitle(title) {
  if (!title || typeof title !== 'string') return false;
  
  const cleaned = title.trim();
  
  // Debe tener al menos 10 caracteres
  if (cleaned.length < 10) return false;
  
  // No debe ser solo números o caracteres especiales
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]{5,}/.test(cleaned)) return false;
  
  // No debe contener palabras de navegación
  const navWords = ['menu', 'navegación', 'search', 'buscar', 'login', 'registro'];
  const lowerTitle = cleaned.toLowerCase();
  if (navWords.some(word => lowerTitle.includes(word))) return false;
  
  return true;
}

module.exports = {
  cleanContent,
  generateSummary,
  extractTitleFromContent,
  isValidTitle
};
