const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { loggers } = require('../utils/logger');

// Configurar automáticamente Google Vision API para esta ejecución
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../../../master-scope-463121-d4-b1a71fa937ed.json');
}

// Google Vision API
let visionClient = null;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const vision = require('@google-cloud/vision');
    visionClient = new vision.ImageAnnotatorClient();
  }
} catch (error) {
  console.warn('Google Vision API no disponible:', error.message);
}

const logger = loggers.scraping;

/**
 * Servicio OCR - Google Vision API Únicamente
 * Optimizado para máxima calidad usando Google Vision API con preprocesamiento avanzado
 */
class EnhancedOCRService {
  constructor() {
    this.language = 'spa';
    this.useGoogleVision = !!visionClient;
    
    // Configuración de preprocesamiento optimizada para Google Vision
    this.preprocessingOptions = {
      resize: { width: 2400, height: null }, // Mayor resolución
      enhance: true,
      normalize: true,
      sharpen: true,
      contrast: 1.5, // Mayor contraste
      brightness: 1.2,
      denoise: true,
      binarize: true // Binarización para mejor OCR
    };
    
    logger.info('🚀 Enhanced OCR Service inicializado (Google Vision Only)');
    logger.info(`🧠 Google Vision API: ${this.useGoogleVision ? 'Habilitado' : 'Deshabilitado'}`);
    
    if (!this.useGoogleVision) {
      logger.warn('⚠️ Google Vision API no está configurada. El OCR no funcionará correctamente.');
    }
  }

  /**
   * Preprocesar imagen para mejorar OCR
   * @param {string} imagePath - Ruta de la imagen original
   * @returns {Promise<string>} Ruta de la imagen preprocesada
   * @private
   */
  async preprocessImage(imagePath) {
    try {
      logger.debug('🔧 Preprocesando imagen para Google Vision...');
      
      const outputPath = imagePath.replace(/\.[^.]+$/, '_preprocessed.png');
      
      let pipeline = sharp(imagePath);
      
      // 1. Redimensionar para mayor resolución
      if (this.preprocessingOptions.resize) {
        pipeline = pipeline.resize(
          this.preprocessingOptions.resize.width,
          this.preprocessingOptions.resize.height,
          {
            kernel: sharp.kernel.lanczos3,
            withoutEnlargement: false
          }
        );
      }
      
      // 2. Mejorar contraste y brillo
      pipeline = pipeline.modulate({
        brightness: this.preprocessingOptions.brightness,
        saturation: 1.3
      });
      
      // 3. Aumentar contraste significativamente
      pipeline = pipeline.linear(
        this.preprocessingOptions.contrast,
        0
      );
      
      // 4. Normalizar histograma
      if (this.preprocessingOptions.normalize) {
        pipeline = pipeline.normalize();
      }
      
      // 5. Enfoque mejorado
      if (this.preprocessingOptions.sharpen) {
        pipeline = pipeline.sharpen({
          sigma: 2.0,
          flat: 1.5,
          jagged: 3.0
        });
      }
      
      // 6. Convertir a escala de grises
      pipeline = pipeline.greyscale();
      
      // 7. Eliminar ruido
      if (this.preprocessingOptions.denoise) {
        pipeline = pipeline.median(5);
      }
      
      // 8. Binarización para mejor OCR
      if (this.preprocessingOptions.binarize) {
        pipeline = pipeline.threshold(128);
      }
      
      // Usar PNG para máxima calidad para Google Vision
      await pipeline.png({
        compressionLevel: 9,
        adaptiveFiltering: false
      }).toFile(outputPath);
      
      logger.debug(`✅ Imagen preprocesada: ${outputPath}`);
      return outputPath;
      
    } catch (error) {
      logger.warn(`⚠️ Error en preprocesamiento: ${error.message}`);
      return imagePath; // Devolver original si falla
    }
  }

  /**
   * Extraer texto usando Google Vision API
   * @param {string} imagePath - Ruta de la imagen
   * @returns {Promise<{text: string, confidence: number}>}
   * @private
   */
  async extractWithGoogleVision(imagePath) {
    try {
      if (!this.useGoogleVision) {
        throw new Error('Google Vision API no configurada');
      }
      
      logger.debug('🧠 Usando Google Vision API...');
      
      // Leer imagen
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Realizar OCR con Google Vision
      const [result] = await visionClient.textDetection({
        image: { content: imageBuffer }
      });
      
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        throw new Error('No se detectó texto con Google Vision');
      }
      
      // El primer elemento contiene el texto completo
      const fullText = detections[0].description || '';
      
      // Calcular confianza promedio
      let totalConfidence = 0;
      let validDetections = 0;
      
      detections.slice(1).forEach(detection => {
        if (detection.confidence) {
          totalConfidence += detection.confidence;
          validDetections++;
        }
      });
      
      const avgConfidence = validDetections > 0 ? (totalConfidence / validDetections) * 100 : 95;
      
      logger.debug(`✅ Google Vision: ${fullText.length} caracteres, confianza: ${avgConfidence.toFixed(1)}%`);
      
      return {
        text: fullText,
        confidence: avgConfidence,
        engine: 'google-vision'
      };
      
    } catch (error) {
      logger.error(`❌ Error en Google Vision: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extraer texto de imagen con Google Vision API
   * @param {string} imagePath - Ruta de la imagen
   * @returns {Promise<string>} Texto extraído
   */
  async extractTextFromImage(imagePath) {
    try {
      logger.debug(`📸 Extrayendo texto con Google Vision: ${imagePath}`);
      
      // Verificar que Google Vision esté disponible
      if (!this.useGoogleVision) {
        throw new Error('Google Vision API no está configurada. Configure las credenciales para usar el servicio OCR.');
      }
      
      // 1. Preprocesar imagen
      const preprocessedPath = await this.preprocessImage(imagePath);
      
      // 2. Extraer texto con Google Vision
      const result = await this.extractWithGoogleVision(preprocessedPath);
      
      // 3. Limpiar archivo temporal
      if (preprocessedPath !== imagePath) {
        fs.unlink(preprocessedPath, () => {});
      }
      
      logger.info(`✅ OCR completado: ${result.text.length} caracteres, confianza: ${result.confidence.toFixed(1)}% (Google Vision)`);
      
      return result.text;
      
    } catch (error) {
      logger.error(`❌ Error en OCR: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extraer títulos de noticias con OCR
   * @param {string} imagePath - Ruta de la imagen
   * @returns {Promise<Array>} Array de títulos extraídos
   */
  async extractTitlesFromImage(imagePath) {
    try {
      logger.debug(`📰 Extrayendo títulos con OCR: ${imagePath}`);
      
      // Extraer texto completo
      const texto = await this.extractTextFromImage(imagePath);
      
      // Procesar texto para extraer títulos
      const titulos = this.processTitles(texto);
      
      logger.debug(`✅ ${titulos.length} títulos extraídos con OCR`);
      
      return titulos;
    } catch (error) {
      logger.error(`❌ Error extrayendo títulos: ${error.message}`);
      throw error;
    }
  }

  /**
   * Limpiar texto extraído del OCR
   * @private
   */
  cleanOCRText(texto) {
    if (!texto) return '';
    
    let cleaned = texto;
    
    // 1. Corregir errores comunes de OCR
    const corrections = {
      'á': 'á', 'é': 'é', 'í': 'í', 'ó': 'ó', 'ú': 'ú',
      'Á': 'Á', 'É': 'É', 'Í': 'Í', 'Ó': 'Ó', 'Ú': 'Ú',
      'ñ': 'ñ', 'Ñ': 'Ñ',
      'ü': 'ü', 'Ü': 'Ü',
      '¿': '¿', '¡': '¡',
      // Correcciones de caracteres comunes mal reconocidos
      'lun': 'LUN',
      'cl': 'cl',
      'com': 'com',
      // Reemplazar caracteres extraños comunes
      '[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ¿¡°ºª]': '',
      // Múltiples espacios a uno solo
      '\\s+': ' ',
      // Espacios en blanco al inicio y final
      '^\\s+|\\s+$': ''
    };
    
    // Aplicar correcciones
    for (const [wrong, right] of Object.entries(corrections)) {
      const regex = new RegExp(wrong, 'g');
      cleaned = cleaned.replace(regex, right);
    }
    
    // 2. Eliminar líneas con demasiados caracteres extraños
    const lines = cleaned.split('\n');
    const validLines = lines.filter(line => {
      const strangeChars = (line.match(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ¿¡°ºª.,;:¡!¿?()-_"\'/\\@#$%&+*=<>]/g) || []).length;
      const totalChars = line.length;
      const strangeRatio = totalChars > 0 ? strangeChars / totalChars : 0;
      
      // Rechazar líneas con más del 30% de caracteres extraños
      return strangeRatio <= 0.3;
    });
    
    return validLines.join('\n').trim();
  }

  /**
   * Validar si un texto es un título válido
   * @private
   */
  isValidTitle(texto) {
    // Rechazar si tiene caracteres corruptos consecutivos
    if (texto.match(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ¿¡°ºª.,;:¡!¿?()-_"\'/\\@#$%&+*=<>]{3,}/)) {
      return false;
    }
    
    // Rechazar si tiene demasiados caracteres repetidos
    if (texto.match(/(.)\1{4,}/)) {
      return false;
    }
    
    // Asegurar que tenga al menos algunas letras
    const letterCount = (texto.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g) || []).length;
    if (letterCount < texto.length * 0.3) {
      return false;
    }
    
    return true;
  }

  /**
   * Procesar texto para extraer títulos
   * @private
   */
  processTitles(texto) {
    if (!texto) return [];
    
    // 1. Limpiar texto OCR primero
    const cleanedText = this.cleanOCRText(texto);
    
    const lineas = cleanedText.split('\n');
    const titulos = [];
    
    for (const linea of lineas) {
      const limpia = linea.trim();
      
      // Filtrar líneas que parecen títulos
      if (
        limpia.length > 15 &&
        limpia.length < 300 &&
        !limpia.match(/^[0-9\s\-\.]+$/) && // Solo números
        !limpia.toLowerCase().includes('publicidad') &&
        !limpia.toLowerCase().includes('anuncio') &&
        !limpia.toLowerCase().includes('advertisement') &&
        !limpia.toLowerCase().includes('haga click') &&
        !limpia.toLowerCase().includes('suscríbete') &&
        !limpia.toLowerCase().includes('newsletter') &&
        !limpia.toLowerCase().includes('cookie') &&
        !limpia.toLowerCase().includes('términos') &&
        !limpia.toLowerCase().includes('privacidad') &&
        !limpia.match(/^[a-z0-9]{20,}$/i) && // Strings aleatorios
        !limpia.match(/^[A-Z\s]{30,}$/) && // Solo mayúsculas muy largas
        this.hasTitleCharacteristics(limpia) &&
        this.isValidTitle(limpia)
      ) {
        titulos.push(limpia);
      }
    }
    
    // Remover duplicados y ordenar por longitud (más largos primero)
    return [...new Set(titulos)].sort((a, b) => b.length - a.length);
  }

  /**
   * Verificar si una línea tiene características de título
   * @private
   */
  hasTitleCharacteristics(texto) {
    // Características de títulos de noticias
    const titlePatterns = [
      /\b(?:el|la|los|las|un|una|unos|unas|del|de|en|por|para|con|sin|sobre|entre|hacia|hasta)\b/i, // Preposiciones
      /\b(?:presidente|gobierno|chile|santiago|país|economía|política|deportes|cultura|tecnología|salud|educación)\b/i, // Palabras comunes en noticias
      /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/, // Fechas
      /\$\s*\d+/, // Dinero
      /\d+[%º]/, // Porcentajes o grados
    ];
    
    // Debe tener al menos una característica de título
    return titlePatterns.some(pattern => pattern.test(texto)) ||
           (texto.split(' ').length >= 5 && texto.split(' ').length <= 15); // Longitud adecuada
  }
}

module.exports = EnhancedOCRService;