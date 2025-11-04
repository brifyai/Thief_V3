/**
 * Script manual para limpiar noticias antiguas
 * 
 * Uso:
 *   node scripts/cleanup-old-news.js
 *   node scripts/cleanup-old-news.js --days=7
 *   node scripts/cleanup-old-news.js --dry-run
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parsear argumentos
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const daysArg = args.find(arg => arg.startsWith('--days='));
const retentionDays = daysArg 
  ? parseInt(daysArg.split('=')[1]) 
  : parseInt(process.env.CLEANUP_RETENTION_DAYS || '30');

async function cleanup() {
  console.log('🧹 Script de Limpieza de Noticias Antiguas\n');
  console.log(`📅 Retención configurada: ${retentionDays} días`);
  console.log(`🔍 Modo: ${dryRun ? 'DRY RUN (solo vista previa)' : 'EJECUCIÓN REAL'}\n`);
  
  try {
    // Calcular fecha límite
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    console.log(`📆 Eliminando noticias anteriores a: ${cutoffDate.toISOString()}\n`);
    
    // Contar noticias a eliminar
    const countToDelete = await prisma.scraping_results.count({
      where: {
        created_at: {
          lt: cutoffDate
        }
      }
    });
    
    if (countToDelete === 0) {
      console.log('✅ No hay noticias antiguas para eliminar');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`📊 Noticias a eliminar: ${countToDelete}\n`);
    
    // Obtener estadísticas detalladas
    console.log('📈 Estadísticas por dominio:');
    const byDomain = await prisma.scraping_results.groupBy({
      by: ['domain'],
      where: {
        created_at: { lt: cutoffDate },
        domain: { not: null }
      },
      _count: true
    });
    
    byDomain.forEach(item => {
      console.log(`   - ${item.domain}: ${item._count} noticias`);
    });
    
    console.log('\n📈 Estadísticas por categoría:');
    const byCategory = await prisma.scraping_results.groupBy({
      by: ['category'],
      where: {
        created_at: { lt: cutoffDate },
        category: { not: null }
      },
      _count: true
    });
    
    byCategory.forEach(item => {
      console.log(`   - ${item.category}: ${item._count} noticias`);
    });
    
    // Obtener ejemplos de noticias a eliminar
    console.log('\n📰 Ejemplos de noticias a eliminar:');
    const examples = await prisma.scraping_results.findMany({
      where: {
        created_at: { lt: cutoffDate }
      },
      select: {
        id: true,
        title: true,
        domain: true,
        created_at: true
      },
      orderBy: {
        created_at: 'asc'
      },
      take: 5
    });
    
    examples.forEach((news, index) => {
      console.log(`   ${index + 1}. [${news.domain}] ${news.title}`);
      console.log(`      Fecha: ${news.created_at.toISOString()}`);
    });
    
    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No se eliminó nada');
      console.log('💡 Para ejecutar la limpieza real, ejecuta sin --dry-run');
    } else {
      // Confirmar antes de eliminar
      console.log('\n⚠️  ¿Estás seguro de que deseas eliminar estas noticias?');
      console.log('   Esta acción NO se puede deshacer.');
      console.log('   Presiona Ctrl+C para cancelar o Enter para continuar...');
      
      // Esperar confirmación
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      console.log('\n🗑️  Eliminando noticias...');
      const startTime = Date.now();
      
      const result = await prisma.scraping_results.deleteMany({
        where: {
          created_at: {
            lt: cutoffDate
          }
        }
      });
      
      const executionTime = Date.now() - startTime;
      
      console.log(`\n✅ Limpieza completada exitosamente`);
      console.log(`   Noticias eliminadas: ${result.count}`);
      console.log(`   Tiempo de ejecución: ${executionTime}ms`);
      
      // Mostrar estadísticas finales
      const totalRemaining = await prisma.scraping_results.count();
      console.log(`\n📊 Estadísticas finales:`);
      console.log(`   Total de noticias restantes: ${totalRemaining}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
cleanup().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
