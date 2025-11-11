const configLoader = require('./server/backend/src/services/configLoader.service');

console.log('🔧 VERIFICACIÓN DE CONFIGURACIONES CARGADAS');
console.log('='.repeat(60));

// Verificar estado del configLoader
const status = configLoader.getStatus();
console.log(`📊 Estado del loader:`);
console.log(`   Configs cargados: ${status.configsLoaded}`);
console.log(`   Total sitios: ${status.totalSites}`);
console.log(`   Sitios activos: ${status.enabledSites}`);
console.log(`   Última carga: ${status.lastLoadTime}`);
console.log(`   Archivo: ${status.configPath}`);

console.log(`\n🔍 Verificando dominios específicos:`);

// Probar dominios específicos
const testDomains = [
  't13.cl',
  'www.t13.cl',
  'lacuarta.com', 
  'www.lacuarta.com',
  'meganoticias.cl',
  'www.meganoticias.cl',
  'biobiochile.cl',
  'www.biobiochile.cl'
];

testDomains.forEach(domain => {
  const config = configLoader.getConfigForDomain(domain);
  console.log(`   ${domain}: ${config ? config.name : 'No encontrado'}`);
});

console.log(`\n📋 Todas las configuraciones cargadas:`);
const allConfigs = configLoader.getAllConfigs(false);
allConfigs.forEach(config => {
  console.log(`   - ${config.domain} (${config.name}) - ${config.enabled ? 'Activo' : 'Inactivo'}`);
});

console.log('\n🎉 Verificación completada');