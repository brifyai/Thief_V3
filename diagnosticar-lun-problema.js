const { getLunComScraperServiceV2 } = require('./server/backend/src/services/lunComScraper-v2.service');
const path = require('path');
const fs = require('fs');
const { loggers } = require('./server/backend/src/utils/logger');

const logger = loggers.scraping;

async function diagnosticarLun() {
  console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DE LUN.COM V2.0');
  console.log('====================================================\n');

  try {
    // 1. Verificar que el servicio V2.0 se inicializa correctamente
    console.log('📋 Paso 1: Verificando inicialización del servicio V2.0');
    const lunComScraper = getLunComScraperServiceV2();
    console.log('✅ Servicio V2.0 inicializado correctamente');
    console.log('   - URL:', lunComScraper.url);
    console.log('   - Directorio screenshots:', lunComScraper.screenshotDir);
    console.log('   - Scheduler activo:', lunComScraper.isScheduled);
    console.log('');

    // 2. Verificar directorio de screenshots
    console.log('📋 Paso 2: Verificando directorio de screenshots');
    if (fs.existsSync(lunComScraper.screenshotDir)) {
      const files = fs.readdirSync(lunComScraper.screenshotDir);
      console.log('✅ Directorio existe');
      console.log(`   - Archivos encontrados: ${files.length}`);
      if (files.length > 0) {
        console.log('   - Últimos 5 archivos:');
        files.slice(-5).forEach(file => {
          const filePath = path.join(lunComScraper.screenshotDir, file);
          const stats = fs.statSync(filePath);
          console.log(`     * ${file} (${Math.round(stats.size/1024)}KB, ${stats.mtime.toISOString()})`);
        });
      }
    } else {
      console.log('❌ Directorio no existe, creándolo...');
      fs.mkdirSync(lunComScraper.screenshotDir, { recursive: true });
      console.log('✅ Directorio creado');
    }
    console.log('');

    // 3. Verificar servicio OCR
    console.log('📋 Paso 3: Verificando servicio OCR Tesseract');
    if (lunComScraper.ocrService) {
      console.log('✅ Servicio OCR inicializado');
      console.log(`   - Idioma: ${lunComScraper.ocrService.language}`);
    } else {
      console.log('❌ Servicio OCR no inicializado');
    }
    console.log('');

    // 4. Ejecutar scraping con logging detallado
    console.log('📋 Paso 4: Ejecutando scraping manual con logging detallado');
    console.log('🔄 Iniciando captura de pantalla...');
    
    const startTime = Date.now();
    const noticias = await lunComScraper.scrapeManual();
    const endTime = Date.now();
    
    console.log(`⏱️ Tiempo total: ${(endTime - startTime)/1000} segundos`);
    console.log(`📊 Noticias extraídas: ${noticias.length}`);
    console.log('');

    // 5. Verificar archivos generados
    console.log('📋 Paso 5: Verificando archivos generados');
    if (fs.existsSync(lunComScraper.screenshotDir)) {
      const files = fs.readdirSync(lunComScraper.screenshotDir);
      const today = new Date().toISOString().split('T')[0];
      
      // Buscar archivos de hoy
      const todayFiles = files.filter(f => f.includes(today));
      console.log(`📅 Archivos de hoy: ${todayFiles.length}`);
      
      if (todayFiles.length > 0) {
        // Buscar archivo de resultados
        const resultsFile = todayFiles.find(f => f.includes('results') && f.includes('v2'));
        if (resultsFile) {
          console.log(`📄 Archivo de resultados: ${resultsFile}`);
          try {
            const resultsPath = path.join(lunComScraper.screenshotDir, resultsFile);
            const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
            console.log('✅ Resultados del archivo:');
            console.log(`   - Version: ${results.version}`);
            console.log(`   - Screenshots: ${results.screenshotPaths?.length || 0}`);
            console.log(`   - Total noticias: ${results.totalNoticias}`);
            console.log(`   - Timestamp: ${results.timestamp}`);
          } catch (error) {
            console.log('❌ Error leyendo archivo de resultados:', error.message);
          }
        }
        
        // Contar screenshots
        const screenshotFiles = todayFiles.filter(f => f.includes('lun-v2-multi'));
        console.log(`📸 Screenshots capturados: ${screenshotFiles.length}`);
        
        if (screenshotFiles.length > 0) {
          // Verificar tamaños de screenshots
          let totalSize = 0;
          for (const file of screenshotFiles) {
            const filePath = path.join(lunComScraper.screenshotDir, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
            if (stats.size < 10000) { // Menos de 10KB
              console.log(`⚠️ Screenshot pequeño: ${file} (${Math.round(stats.size/1024)}KB)`);
            }
          }
          console.log(`📊 Tamaño total screenshots: ${Math.round(totalSize/1024)}KB`);
          console.log(`📊 Promedio por screenshot: ${Math.round((totalSize/screenshotFiles.length)/1024)}KB`);
        }
      }
    }
    console.log('');

    // 6. Mostrar ejemplos de noticias extraídas
    console.log('📋 Paso 6: Mostrando ejemplos de noticias extraídas');
    if (noticias && noticias.length > 0) {
      console.log(`✅ ${noticias.length} noticias extraídas:`);
      noticias.slice(0, 5).forEach((noticia, i) => {
        console.log(`   ${i+1}. "${noticia.titulo}"`);
        if (noticia.descripcion) {
          console.log(`      -> "${noticia.descripcion.substring(0, 50)}..."`);
        }
      });
      if (noticias.length > 5) {
        console.log(`   ... y ${noticias.length - 5} más`);
      }
      
      // Verificar calidad de títulos
      const titulosValidos = noticias.filter(n => 
        n.titulo && 
        n.titulo.length > 10 && 
        !n.titulo.includes('=') &&
        !n.titulo.includes(']') &&
        !n.titulo.includes('+')
      ).length;
      
      const calidadPorcentaje = Math.round((titulosValidos / noticias.length) * 100);
      console.log(`📈 Calidad de títulos: ${calidadPorcentaje}% (${titulosValidos}/${noticias.length} válidos)`);
    } else {
      console.log('❌ No se extrajeron noticias');
    }
    console.log('');

    // 7. Diagnóstico final
    console.log('📋 DIAGNÓSTICO FINAL:');
    console.log('====================');
    
    if (noticias && noticias.length > 0) {
      if (noticias.length >= 40) {
        console.log('✅ EXCELENTE: LUN V2.0 funcionando correctamente (40+ noticias)');
      } else if (noticias.length >= 20) {
        console.log('⚠️ REGULAR: LUN V2.0 funcionando parcialmente (20+ noticias)');
      } else {
        console.log('❌ PROBLEMA: LUN V2.0 no está funcionando correctamente (<20 noticias)');
      }
    } else {
      console.log('❌ CRÍTICO: LUN V2.0 no está extrayendo noticias');
    }

  } catch (error) {
    console.log('❌ ERROR EN DIAGNÓSTICO:', error.message);
    console.log('Stack trace:', error.stack);
  }
}

// Ejecutar diagnóstico
diagnosticarLun().then(() => {
  console.log('\n🔍 Diagnóstico completado');
}).catch(error => {
  console.error('❌ Error en diagnóstico:', error);
});