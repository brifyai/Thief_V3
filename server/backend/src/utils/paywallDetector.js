/**
 * Detector de Paywalls
 * Identifica si un artículo tiene contenido bloqueado por paywall
 */

const PAYWALL_INDICATORS = [
  // Español
  'suscríbete',
  'suscribete',
  'suscripción',
  'suscripcion',
  'contenido exclusivo',
  'acceso premium',
  'inicia sesión para leer',
  'inicia sesion para leer',
  'regístrate gratis',
  'registrate gratis',
  'hazte socio',
  'para seguir leyendo',
  'continúa leyendo',
  'continua leyendo',
  'lee el artículo completo',
  'acceso restringido',
  'solo para suscriptores',
  'contenido para suscriptores',
  
  // Inglés
  'subscribe',
  'subscription',
  'premium content',
  'login to read',
  'member only',
  'members only',
  'paywall',
  'exclusive content',
  'members-only',
  'subscriber only',
  'sign up to read',
  'register to continue',
  
  // Nombres de sitios con paywall conocidos
  'el mercurio premium',
  'la tercera premium',
  'the new york times subscription'
];

const PAYWALL_HTML_CLASSES = [
  'paywall',
  'subscription-wall',
  'premium-content',
  'member-only',
  'locked-content',
  'subscriber-only',
  'registration-wall',
  'login-wall'
];

/**
 * Detectar si un artículo tiene paywall
 * @param {string} html - HTML completo de la página
 * @param {string} text - Texto limpio del artículo
 * @returns {Object} Resultado de la detección
 */
function detectPaywall(html, text) {
  if (!html || !text) {
    return {
      hasPaywall: false,
      confidence: 0,
      method: 'no-content',
      message: 'Sin contenido para analizar'
    };
  }
  
  const lowerText = text.toLowerCase();
  const lowerHtml = html.toLowerCase();
  
  // Método 1: Buscar indicadores de texto
  for (const indicator of PAYWALL_INDICATORS) {
    if (lowerText.includes(indicator) || lowerHtml.includes(indicator)) {
      return {
        hasPaywall: true,
        indicator: indicator,
        method: 'keyword',
        confidence: 0.9,
        message: `Detectado: "${indicator}"`
      };
    }
  }
  
  // Método 2: Buscar clases HTML de paywall
  for (const className of PAYWALL_HTML_CLASSES) {
    if (lowerHtml.includes(`class="${className}"`) || 
        lowerHtml.includes(`class='${className}'`) ||
        lowerHtml.includes(`id="${className}"`) ||
        lowerHtml.includes(`id='${className}'`)) {
      return {
        hasPaywall: true,
        indicator: className,
        method: 'html-class',
        confidence: 0.85,
        message: `Detectada clase/id: "${className}"`
      };
    }
  }
  
  // Método 3: Contenido muy corto (posible paywall)
  const textLength = text.trim().length;
  if (textLength < 200 && textLength > 0) {
    return {
      hasPaywall: true,
      indicator: 'short-content',
      method: 'length',
      confidence: 0.5,
      message: `Contenido muy corto (${textLength} caracteres)`
    };
  }
  
  // No se detectó paywall
  return {
    hasPaywall: false,
    confidence: 0.95,
    method: 'none',
    message: 'Contenido completo disponible'
  };
}

/**
 * Verificar si un dominio es conocido por tener paywall
 * @param {string} url - URL del artículo
 * @returns {boolean} True si el dominio tiene paywall conocido
 */
function isKnownPaywallDomain(url) {
  const knownPaywallDomains = [
    'elmercurio.com',
    'latercera.com',
    'nytimes.com',
    'wsj.com',
    'ft.com',
    'economist.com'
  ];
  
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return knownPaywallDomains.some(d => domain.includes(d));
  } catch (error) {
    return false;
  }
}

module.exports = {
  detectPaywall,
  isKnownPaywallDomain,
  PAYWALL_INDICATORS,
  PAYWALL_HTML_CLASSES
};
