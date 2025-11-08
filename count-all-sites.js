#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Leer el archivo de configuración
const configPath = path.join(__dirname, 'server/backend/src/config/site-configs.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('\n📊 ANÁLISIS DE SITIOS CONFIGURADOS\n');
console.log('='.repeat(80));

const sites = config.sites;
console.log(`\n✅ Total de sitios configurados: ${sites.length}\n`);

// Agrupar por dominio
const domains = sites.map(s => s.domain);
console.log('Dominios configurados:');
domains.forEach((domain, index) => {
  console.log(`  ${index + 1}. ${domain}`);
});

console.log('\n' + '='.repeat(80));
console.log(`\n📋 RESUMEN: ${sites.length} sitios totales\n`);

// Exportar lista para validación
const urlsToValidate = sites.map(s => ({
  domain: s.domain,
  name: s.name,
  url: `https://${s.domain}`
}));

console.log('URLs a validar:');
urlsToValidate.forEach((item, index) => {
  console.log(`  ${index + 1}. ${item.name} (${item.url})`);
});

// Guardar en archivo
fs.writeFileSync('sites-to-validate.json', JSON.stringify(urlsToValidate, null, 2));
console.log(`\n✅ Lista guardada en: sites-to-validate.json\n`);