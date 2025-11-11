#!/usr/bin/env node

/**
 * Script para validar si los 21 nuevos sitios son scrapeable
 * Prueba cada sitio y reporta si tiene estructura HTML válida para extraer noticias
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Nuevos 21 sitios a validar
const NEW_SITES = [
  // La Araucanía (3)
  { name: 'Soy Chile Temuco', url: 'https://www.soychile.cl/temuco/', region: 'La Araucanía' },
  { name: 'Austral Temuco', url: 'https://www.australtemuco.cl', region: 'La Araucanía' },
  { name: 'La Opinión', url: 'https://www.laopinon.cl', region: 'La Araucanía' },
  
  // Los Ríos (3)
  { name: 'Soy Chile Valdivia', url: 'https://www.soychile.cl/valdivia/', region: 'Los Ríos' },
  { name: 'El Naveghable', url: 'https://www.elnaveghable.cl', region: 'Los Ríos' },
  { name: 'ATV Valdivia', url: 'https://atvvaldivia.cl', region: 'Los Ríos' },
  
  // Los Lagos (6)
  { name: 'Soy Chile Puerto Montt', url: 'https://www.soychile.cl/puerto-montt/', region: 'Los Lagos' },
  { name: 'Soy de Puerto', url: 'https://soydepuerto.cl', region: 'Los Lagos' },
  { name: 'Soy Chile Osorno', url: 'https://www.soychile.cl/osorno/', region: 'Los Lagos' },
  { name: 'Austral Osorno', url: 'https://www.australosorno.cl', region: 'Los Lagos' },
  { name: 'Soy Chile Chiloé', url: 'https://www.soychile.cl/chiloe/', region: 'Los Lagos' },
  { name: 'La Estrella Chiloé', url: 'https://www.laestrellachiloe.cl', region: 'Los Lagos' },
  
  // Aysén (2)
  { name: 'El Repuertero', url: 'https://www.elrepuertero.cl', region: 'Aysén' },
  { name: 'Ciudadano Radio', url: 'https://ciudadanoradio.cl', region: 'Aysén' },
  
  // Magallanes (1)
  { name: 'El Magallanews', url: 'https://www.elmagallanews.cl', region: 'Magallanes' },
  
  // Internacional (6)
  { name: 'EFE', url: 'https://www.efe.com', region: 'Internacional - España' },
  { name: 'AP News Chile', url: 'https://apnews.com/hub/chile', region: 'Internacional - USA' },
  { name: 'Reuters Chile', url: 'https://www.reuters.com/places/chile', region: 'Internacional - USA' },
  { name: 'El País', url: 'https://elpais.com', region: 'Internacional - España' },
  { name: 'ABC', url: 'https://abc.es', region: 'Internacional - España' },
  { name: 'El Mundo', url: 'https://elmundo.es', region: 'Internacional - España' },
];

async function validateSite(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Contar elementos potenciales de noticias
    const articleCount = $('article, [data-article], [data-news], .article, .news, .post, .story').length;
    const linkCount = $('a[href*="/"]').length;
    const titleCount = $('h1, h2, h3, [data-title], .title, .headline').length;

    return {
      status: 'success',
      statusCode: response.status,
      articleElements: articleCount,
      linkElements: linkCount,
      titleElements: titleCount,
      contentLength: response.data.length,
      scrapeable: articleCount > 0 || linkCount > 5 || titleCount > 5
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      scrapeable: false
    };
  }
}

async function validateAllSites() {
  console.log('\n🔍 VALIDANDO SCRAPABILIDAD DE 21 NUEVOS SITIOS\n');
  console.log('='.repeat(100));
  
  const results = [];
  let scrapeable = 0;
  let notScrapeable = 0;
  let errors = 0;

  for (let i = 0; i < NEW_SITES.length; i++) {
    const site = NEW_SITES[i];
    process.stdout.write(`[${i + 1}/${NEW_SITES.length}] ${site.name.padEnd(30)} ... `);

    const result = await validateSite(site.url);
    results.push({ ...site, ...result });

    if (result.scrapeable) {
      console.log(`✅ SCRAPEABLE (${result.articleElements} articles, ${result.linkElements} links)`);
      scrapeable++;
    } else if (result.status === 'error') {
      console.log(`❌ ERROR: ${result.error}`);
      errors++;
    } else {
      console.log(`⚠️  NO SCRAPEABLE (${result.articleElements} articles, ${result.linkElements} links)`);
      notScrapeable++;
    }

    // Pequeña pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(100));
  console.log('\n📊 RESUMEN DE VALIDACIÓN\n');
  
  console.log(`✅ Scrapeable: ${scrapeable}/${NEW_SITES.length}`);
  console.log(`⚠️  No Scrapeable: ${notScrapeable}/${NEW_SITES.length}`);
  console.log(`❌ Errores: ${errors}/${NEW_SITES.length}`);
  console.log(`📈 Tasa de éxito: ${((scrapeable / NEW_SITES.length) * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(100));
  console.log('\n📋 DETALLES POR REGIÓN\n');

  const byRegion = {};
  results.forEach(r => {
    if (!byRegion[r.region]) byRegion[r.region] = [];
    byRegion[r.region].push(r);
  });

  Object.entries(byRegion).forEach(([region, sites]) => {
    const regionScrapeable = sites.filter(s => s.scrapeable).length;
    console.log(`\n${region}: ${regionScrapeable}/${sites.length} scrapeable`);
    sites.forEach(site => {
      const status = site.scrapeable ? '✅' : site.status === 'error' ? '❌' : '⚠️ ';
      const details = site.scrapeable ? `(${site.articleElements} articles, ${site.linkElements} links)` : `(${site.error || 'no content'})`;
      console.log(`  ${status} ${site.name}: ${details}`);
    });
  });

  console.log('\n' + '='.repeat(100));
  console.log('\n🎯 RECOMENDACIONES\n');

  const notScrapableSites = results.filter(r => !r.scrapeable);
  if (notScrapableSites.length > 0) {
    console.log('Sitios que NO son scrapeable o tienen errores:');
    notScrapableSites.forEach(site => {
      console.log(`  - ${site.name} (${site.region}): ${site.error || 'sin contenido detectado'}`);
    });
    console.log('\n⚠️  RECOMENDACIÓN: Estos sitios deben ser reemplazados o investigados manualmente');
  } else {
    console.log('✅ TODOS LOS SITIOS SON SCRAPEABLE');
  }

  console.log('\n');
  return results;
}

// Ejecutar validación
validateAllSites().catch(console.error);