const prisma = require('../src/config/database');
const entityStatsService = require('../src/services/entityStats.service');
const entityAlertsService = require('../src/services/entityAlerts.service');

/**
 * 📊 SCRIPT: Calcular Snapshots Diarios
 * Ejecutar diariamente (ej: 1:00 AM)
 * Calcula estadísticas y genera alertas
 */

async function calculateDailySnapshots() {
  console.log('📊 Iniciando cálculo de snapshots diarios...');
  const startTime = Date.now();
  
  try {
    // Obtener todas las entidades activas
    const entities = await prisma.entity.findMany({
      where: { is_active: true }
    });
    
    console.log(`📋 Procesando ${entities.length} entidades activas`);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    let successCount = 0;
    let errorCount = 0;
    let alertsGenerated = 0;
    
    for (const entity of entities) {
      try {
        console.log(`\n🔍 Procesando: ${entity.name}`);
        
        // Calcular snapshot del día anterior
        const snapshot = await entityStatsService.calculateDailySnapshot(entity.id, yesterday);
        
        if (snapshot) {
          console.log(`  ✅ Snapshot calculado: ${snapshot.total_mentions} menciones`);
          successCount++;
          
          // Verificar alertas
          const alerts = await entityAlertsService.checkForAlerts(entity.id);
          if (alerts.length > 0) {
            console.log(`  🚨 ${alerts.length} alertas generadas`);
            alertsGenerated += alerts.length;
          }
        } else {
          console.log(`  ⚠️  Sin menciones para este día`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error procesando ${entity.name}:`, error.message);
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DEL PROCESO');
    console.log('='.repeat(50));
    console.log(`✅ Exitosos: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`🚨 Alertas generadas: ${alertsGenerated}`);
    console.log(`⏱️  Duración: ${Math.round(duration / 1000)}s`);
    console.log('='.repeat(50));
    
    return {
      success: true,
      processed: entities.length,
      successful: successCount,
      errors: errorCount,
      alerts: alertsGenerated,
      duration_ms: duration
    };
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  calculateDailySnapshots()
    .then(result => {
      console.log('\n✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Proceso falló:', error);
      process.exit(1);
    });
}

module.exports = { calculateDailySnapshots };
