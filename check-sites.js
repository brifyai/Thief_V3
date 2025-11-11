const configs = require('./server/backend/src/config/site-configs.json');

console.log(`📊 Sitios configurados: ${configs.sites.length}`);
console.log('');

const enabledSites = configs.sites.filter(site => site.enabled);
const disabledSites = configs.sites.filter(site => !site.enabled);

console.log(`✅ Sitios habilitados: ${enabledSites.length}`);
console.log(`❌ Sitios deshabilitados: ${disabledSites.length}`);
console.log('');

console.log('📋 Lista de sitios habilitados:');
enabledSites.forEach((site, i) => {
  console.log(`${i+1}. ${site.name} (${site.domain})`);
});

if (disabledSites.length > 0) {
  console.log('');
  console.log('📋 Lista de sitios deshabilitados:');
  disabledSites.forEach((site, i) => {
    console.log(`${i+1}. ${site.name} (${site.domain})`);
  });
}

console.log('');
console.log('🎯 Para scraper 100% funcional, todos los sitios deberían estar habilitados');