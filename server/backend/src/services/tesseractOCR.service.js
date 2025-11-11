const Tesseract = require('tesseract.js');
const { loggers } = require('../utils/logger');

const logger = loggers.scraping;

/**
 * Servicio de OCR usando Tesseract.js
 * Solución local 100% gratuita
 * No requiere API externa
 */
class TesseractOCRService {
  constructor() {
    this.language = 'spa'; // Español
    logger.info('🤖 Tesseract.js OCR Service inicializado');
  }

  /**
   * Extraer texto de una imagen usando Tesseract
   * @param {string} imagePath - Ruta de la imagen
   * @returns {Promise<string>} Texto extraído
   */
  async extractTextFromImage(imagePath) {
    try {
      logger.debug(`📸 Extrayendo texto de imagen con Tesseract: ${imagePath}`);
      
      const result = await Tesseract.recognize(
        imagePath,
        this.language,
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              logger.debug(`📊 Tesseract progreso: ${(m.progress * 100).toFixed(1)}%`);
            }
          }
        }
      );
      
      const text = result.data.text;
      
      logger.debug(`✅ Texto extraído: ${text.length} caracteres`);
      logger.debug(`   Confianza: ${result.data.confidence.toFixed(1)}%`);
      
      return text;
    } catch (error) {
      logger.error(`❌ Error en Tesseract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extraer títulos de noticias de una imagen
   * @param {string} imagePath - Ruta de la imagen
   * @returns {Promise<Array>} Array de títulos extraídos
   */
  async extractTitlesFromImage(imagePath) {
    try {
      logger.debug(`📰 Extrayendo títulos de imagen: ${imagePath}`);
      
      // Extraer texto completo
      const texto = await this.extractTextFromImage(imagePath);
      
      // Procesar texto para extraer títulos
      const titulos = this.processTitles(texto);
      
      logger.debug(`✅ ${titulos.length} títulos extraídos`);
      
      return titulos;
    } catch (error) {
      logger.error(`❌ Error extrayendo títulos: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesar texto para extraer títulos
   * @private
   */
  processTitles(texto) {
    if (!texto) return [];
    
    const lineas = texto.split('\n');
    const titulos = [];
    
    for (const linea of lineas) {
      const limpia = linea.trim();
      
      // Filtrar líneas que no son títulos
      if (
        limpia.length > 15 &&
        limpia.length < 300 &&
        !limpia.match(/^[0-9\s\-\.]+$/) && // Solo números
        !limpia.toLowerCase().includes('publicidad') &&
        !limpia.toLowerCase().includes('anuncio') &&
        !limpia.toLowerCase().includes('advertisement') &&
        !limpia.toLowerCase().includes('haga click') &&
        !limpia.toLowerCase().includes('suscríbete') &&
        !limpia.match(/^[a-z0-9]{20,}$/i) // Strings aleatorios
      ) {
        titulos.push(limpia);
      }
    }
    
    // Remover duplicados
    return [...new Set(titulos)];
  }
}

module.exports = TesseractOCRService;