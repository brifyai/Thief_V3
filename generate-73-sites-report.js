#!/usr/bin/env node

/**
 * Genera un reporte detallado de las 73 URLs con su estado de scrapabilidad
 */

const fs = require('fs');

// Leer el archivo de resultados de validación
const resultsFile = 'validation-results-73-final.json';

if (!fs.existsSync(resultsFile)) {
  console.error(`❌ Archivo no encontrado: ${resultsFile}`);
  console.error('Ejecuta primero: node validate-73-sites-final.js');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

console.log('\n📊 REPORTE DETALLADO DE 73 SITIOS\n');
console.log('═'.repeat(100));

// Separar por estado
const scrapeable = results.sites.filter(s => s.status === 'scrapeable');
const noScrapeable = results.sites.filter(s => s.status === 'no_scrapeable');
const errors = results.sites.filter(s => s.status === 'error');

// Mostrar scrapeable
console.log('\n✅ SITIOS SCRAPEABLE (' + scrapeable.length + ')\n');
scrapeable.forEach((site, idx) => {
  console.log(`${String(idx + 1).padStart(2, '0')}. ${site.name.padEnd(30)} | ${site.url}`);
  if (site.articles > 0) {
    console.log(`    📰 ${site.articles} artículos encontrados`);
  }
});

// Mostrar no scrapeable
if (noScrapeable.length > 0) {
  console.log('\n\n⚠️  SITIOS NO SCRAPEABLE (' + noScrapeable.length + ')\n');
  noScrapeable.forEach((site, idx) => {
    console.log(`${String(scrapeable.length + idx + 1).padStart(2, '0')}. ${site.name.padEnd(30)} | ${site.url}`);
    console.log(`    Razón: ${site.reason}`);
  });
}

// Mostrar errores
if (errors.length > 0) {
  console.log('\n\n❌ SITIOS CON ERROR (' + errors.length + ')\n');
  errors.forEach((site, idx) => {
    console.log(`${String(scrapeable.length + noScrapeable.length + idx + 1).padStart(2, '0')}. ${site.name.padEnd(30)} | ${site.url}`);
    console.log(`    Error: ${site.error}`);
  });
}

// Resumen
console.log('\n\n' + '═'.repeat(100));
console.log('\n📈 RESUMEN FINAL\n');
console.log(`Total de sitios: ${results.sites.length}`);
console.log(`✅ Scrapeable: ${scrapeable.length} (${((scrapeable.length / results.sites.length) * 100).toFixed(1)}%)`);
console.log(`⚠️  No Scrapeable: ${noScrapeable.length} (${((noScrapeable.length / results.sites.length) * 100).toFixed(1)}%)`);
console.log(`❌ Con Error: ${errors.length} (${((errors.length / results.sites.length) * 100).toFixed(1)}%)`);
console.log(`\n📰 Total de artículos encontrados: ${results.totalArticles}`);
console.log(`⏱️  Tiempo de validación: ${results.duration}ms\n`);

// Guardar reporte en archivo
const reportContent = `
📊 REPORTE DETALLADO DE 73 SITIOS
${'═'.repeat(100)}

✅ SITIOS SCRAPEABLE (${scrapeable.length})

${scrapeable.map((site, idx) => 
  `${String(idx + 1).padStart(2, '0')}. ${site.name.padEnd(30)} | ${site.url}${site.articles > 0 ? `\n    📰 ${site.articles} artículos` : ''}`
).join('\n')}

${noScrapeable.length > 0 ? `

⚠️  SITIOS NO SCRAPEABLE (${noScrapeable.length})

${noScrapeable.map((site, idx) => 
  `${String(scrapeable.length + idx + 1).padStart(2, '0')}. ${site.name.padEnd(30)} | ${site.url}\n    Razón: ${site.reason}`
).join('\n')}
` : ''}

${errors.length > 0 ? `

❌ SITIOS CON ERROR (${errors.length})

${errors.map((site, idx) => 
  `${String(scrapeable.length + noScrapeable.length + idx + 1).padStart(2, '0')}. ${site.name.padEnd(30)} | ${site.url}\n    Error: ${site.error}`
).join('\n')}
` : ''}

${'═'.repeat(100)}

📈 RESUMEN FINAL

Total de sitios: ${results.sites.length}
✅ Scrapeable: ${scrapeable.length} (${((scrapeable.length / results.sites.length) * 100).toFixed(1)}%)
⚠️  No Scrapeable: ${noScrapeable.length} (${((noScrapeable.length / results.sites.length) * 100).toFixed(1)}%)
❌ Con Error: ${errors.length} (${((errors.length / results.sites.length) * 100).toFixed(1)}%)

📰 Total de artículos encontrados: ${results.totalArticles}
⏱️  Tiempo de validación: ${results.duration}ms
`;

fs.writeFileSync('REPORTE-73-SITIOS.txt', reportContent);
console.log('✅ Reporte guardado en: REPORTE-73-SITIOS.txt\n');