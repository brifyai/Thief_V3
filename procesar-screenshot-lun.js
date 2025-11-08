// Script para procesar screenshots de LUN.com con Google Vision API
const path = require('path');
const fs = require('fs');

// Configurar automáticamente Google Vision API
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'master-scope-463121-d4-b1a71fa937ed.json');

const EnhancedOCRService = require('./server/backend/src/services/enhancedOCR.service');

class ScreenshotProcessor {
  constructor() {
    this.ocrService = new EnhancedOCRService();
    this.outputDir = path.join(__dirname, 'lun-screenshot-procesados');
    
    // Crear directorio de salida si no existe
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    console.log('🎬 Procesador de Screenshots LUN.com inicializado');
    console.log(`📁 Directorio de salida: ${this.outputDir}`);
  }

  async procesarScreenshot(screenshotPath) {
    try {
      console.log(`🧠 Procesando screenshot: ${screenshotPath}`);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(screenshotPath)) {
        throw new Error(`El screenshot no existe: ${screenshotPath}`);
      }
      
      // Analizar con Google Vision API
      console.log('🔍 Analizando con Google Vision API...');
      
      const textoExtraido = await this.ocrService.extractTextFromImage(screenshotPath);
      const titulosExtraidos = await this.ocrService.extractTitlesFromImage(screenshotPath);
      
      console.log(`✅ Análisis completado!`);
      console.log(`📝 Texto extraído: ${textoExtraido.length} caracteres`);
      console.log(`📰 Títulos encontrados: ${titulosExtraidos.length}`);
      
      // Mostrar resultados
      if (titulosExtraidos.length > 0) {
        console.log('\n📰 Títulos detectados:');
        titulosExtraidos.forEach((titulo, index) => {
          console.log(`   ${index + 1}. ${titulo}`);
        });
      }
      
      if (textoExtraido.length > 0) {
        console.log('\n📄 Primeros 800 caracteres del texto:');
        console.log(`   ${textoExtraido.substring(0, 800)}...`);
        
        // Buscar palabras clave de noticias
        const palabrasClave = ['presidente', 'gobierno', 'chile', 'política', 'economía', 'deportes', 'cultura'];
        const encontradas = palabrasClave.filter(palabra => 
          textoExtraido.toLowerCase().includes(palabra)
        );
        
        if (encontradas.length > 0) {
          console.log('\n🔍 Palabras clave encontradas:');
          encontradas.forEach(palabra => console.log(`   • ${palabra}`));
        }
      }
      
      // Guardar resultados
      const timestamp = Date.now();
      const resultado = {
        screenshotPath: screenshotPath,
        textoExtraido: textoExtraido,
        titulosExtraidos: titulosExtraidos,
        timestamp: new Date().toISOString(),
        totalCaracteres: textoExtraido.length,
        totalTitulos: titulosExtraidos.length
      };
      
      const resultadosPath = path.join(this.outputDir, `resultado-${timestamp}.json`);
      fs.writeFileSync(resultadosPath, JSON.stringify(resultado, null, 2));
      
      console.log(`\n💾 Resultados guardados en: ${resultadosPath}`);
      console.log('🎉 Procesamiento completado exitosamente');
      
      return resultado;
      
    } catch (error) {
      console.error('❌ Error procesando screenshot:', error.message);
      throw error;
    }
  }

  async buscarYProcesarScreenshots() {
    try {
      console.log('🔍 Buscando screenshots recientes...');
      
      // Buscar en directorios conocidos
      const directoriosBusqueda = [
        path.join(__dirname, 'lun-news-detail-resultados'),
        path.join(__dirname, 'lun-menu-interactivo-resultados'),
        path.join(__dirname, 'lun-menu-lateral-resultados')
      ];
      
      let screenshotsEncontrados = [];
      
      for (const directorio of directoriosBusqueda) {
        if (fs.existsSync(directorio)) {
          const archivos = fs.readdirSync(directorio).filter(archivo => 
            archivo.endsWith('.png')
          );
          
          archivos.forEach(archivo => {
            const fullPath = path.join(directorio, archivo);
            const stats = fs.statSync(fullPath);
            screenshotsEncontrados.push({
              path: fullPath,
              name: archivo,
              modified: stats.mtime
            });
          });
        }
      }
      
      // Ordenar por fecha de modificación (más recientes primero)
      screenshotsEncontrados.sort((a, b) => b.modified - a.modified);
      
      console.log(`📸 Encontrados ${screenshotsEncontrados.length} screenshots`);
      
      if (screenshotsEncontrados.length === 0) {
        console.log('❌ No se encontraron screenshots para procesar');
        return;
      }
      
      // Procesar el más reciente
      const screenshotMasReciente = screenshotsEncontrados[0];
      console.log(`📸 Procesando el más reciente: ${screenshotMasReciente.name}`);
      
      await this.procesarScreenshot(screenshotMasReciente.path);
      
    } catch (error) {
      console.error('❌ Error buscando screenshots:', error.message);
    }
  }
}

// Ejecutar el procesador
async function main() {
  const processor = new ScreenshotProcessor();
  
  // Buscar y procesar screenshots automáticamente
  await processor.buscarYProcesarScreenshots();
}

// También permitir procesar un screenshot específico si se proporciona como argumento
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Procesar screenshot específico
    const processor = new ScreenshotProcessor();
    processor.procesarScreenshot(args[0]).catch(console.error);
  } else {
    // Buscar y procesar automáticamente
    main().catch(console.error);
  }
}

module.exports = ScreenshotProcessor;