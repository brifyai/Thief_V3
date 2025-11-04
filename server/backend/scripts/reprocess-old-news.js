/**
 * Script para reprocesar noticias antiguas
 * Agrega títulos y resúmenes a noticias que no los tienen
 */

const { PrismaClient } = require('@prisma/client');
const { cleanContent, generateSummary, extractTitleFromContent, isValidTitle } = require('../src/utils/contentCleaner');
const aiEnhancer = require('../src/services/aiEnhancer.service');

const prisma = new PrismaClient();

async function reprocessOldNews() {
  console.log('🔄 REPROCESANDO NOTICIAS ANTIGUAS\n');
  
  try {
    // Buscar noticias sin título o con título inválido
    const oldNews = await prisma.scraping_results.findMany({
      where: {
        OR: [
          { title: null },
          { title: '' }
        ],
        success: true  // Solo noticias exitosas
      },
      orderBy: {
        id: 'desc'
      },
      take: 100  // Procesar de a 100 para no saturar
    });
    
    console.log(`📊 Encontradas ${oldNews.length} noticias sin título\n`);
    
    if (oldNews.length === 0) {
      console.log('✅ No hay noticias para reprocesar');
      return;
    }
    
    let processed = 0;
    let withAI = 0;
    let withFallback = 0;
    let errors = 0;
    
    for (const news of oldNews) {
      try {
        console.log(`\n📰 Procesando noticia #${news.id}...`);
        
        // Parsear contenido
        let contenido = news.content;
        let tituloOriginal = null;
        
        try {
          const parsed = JSON.parse(news.content);
          contenido = parsed.contenido || news.content;
          tituloOriginal = parsed.titulo;
        } catch (e) {
          // Si no es JSON, usar como está
        }
        
        // Limpiar contenido
        const cleanedContent = cleanContent(contenido);
        
        let finalTitle = tituloOriginal;
        let summary = null;
        
        // Si no hay título válido, generarlo
        if (!finalTitle || !isValidTitle(finalTitle)) {
          console.log('  🤖 Generando título con IA...');
          
          try {
            const aiResult = await aiEnhancer.generateTitleAndSummary(cleanedContent);
            
            if (aiResult.title) {
              finalTitle = aiResult.title;
              summary = aiResult.summary;
              withAI++;
              console.log(`  ✅ IA: "${finalTitle}"`);
            } else {
              // Fallback
              finalTitle = extractTitleFromContent(cleanedContent);
              summary = generateSummary(cleanedContent, 200);
              withFallback++;
              console.log(`  ⚠️ Fallback: "${finalTitle}"`);
            }
            
            // Esperar 1 segundo entre llamadas a IA para no saturar
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            console.log(`  ❌ Error con IA: ${error.message}`);
            finalTitle = extractTitleFromContent(cleanedContent);
            summary = generateSummary(cleanedContent, 200);
            withFallback++;
            console.log(`  ⚠️ Fallback: "${finalTitle}"`);
          }
        } else {
          // Título válido, solo generar resumen
          summary = generateSummary(cleanedContent, 200);
          console.log(`  ✅ Título válido: "${finalTitle}"`);
        }
        
        // Actualizar en BD
        await prisma.scraping_results.update({
          where: { id: news.id },
          data: {
            title: finalTitle,
            summary: summary,
            cleaned_content: cleanedContent
          }
        });
        
        processed++;
        console.log(`  ✅ Actualizado #${news.id}`);
        
      } catch (error) {
        console.error(`  ❌ Error procesando #${news.id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n\n📊 RESUMEN:');
    console.log(`  Total procesadas: ${processed}/${oldNews.length}`);
    console.log(`  Con IA: ${withAI}`);
    console.log(`  Con fallback: ${withFallback}`);
    console.log(`  Errores: ${errors}`);
    
    if (oldNews.length === 100) {
      console.log('\n💡 Hay más noticias por procesar. Ejecuta el script nuevamente.');
    } else {
      console.log('\n✅ Todas las noticias han sido procesadas');
    }
    
  } catch (error) {
    console.error('\n❌ Error general:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
reprocessOldNews();
