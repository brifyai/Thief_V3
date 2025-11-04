// Funciones auxiliares para el scraping
const { loggers } = require('./logger');
const logger = loggers.scraping;

const limpiarTexto = (texto) => {
  if (!texto) return "";
  return texto
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\n/g, "")
    .replace(/\t/g, "")
    .replace(/Exclusivo suscriptor/g, "")
    .replace(/\s{2,}/g, " ");
};

const obtenerURLBase = (url) => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch (e) {
    logger.warn(`Error extrayendo dominio de URL: ${url}`, { error: e.message });
    return "";
  }
};

const commonConfig = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    DNT: "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
  },
  timeout: 30000, // Aumentado a 30 segundos
  maxRedirects: 5,
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Aceptar 4xx para manejarlos manualmente
  },
};

// Función para validar URLs
const isValidUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

// Función para esperar con backoff exponencial
const exponentialBackoff = async (attempt, maxAttempts = 3) => {
  if (attempt >= maxAttempts) return;
  const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 segundos
  console.log(`⏳ Esperando ${delay}ms antes de reintentar...`);
  await new Promise(resolve => setTimeout(resolve, delay));
};

module.exports = {
  limpiarTexto,
  obtenerURLBase,
  commonConfig,
  isValidUrl,
  exponentialBackoff,
};
