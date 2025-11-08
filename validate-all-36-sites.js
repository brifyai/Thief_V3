#!/usr/bin/env node

/**
 * Script para validar si los 36 sitios son scrapeable
 * Con manejo de errores SSL y reintentos
 */

const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs');

// Crear agente HTTPS que ignora certificados inválidos
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Leer sitios del archivo de configuración
const config = JSON.parse(fs.readFileSync('server/backend/src/config/site-configs.json', 'utf8'));
const sites = config.sites.map(s => ({
  name: s.name,
  domain: s.domain,
  url: `https://${s.domain}`
}));

async function validateSite(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        httpsAgent: httpsAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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
        scrapeable: articleCount > 0 || linkCount > 5 || titleCount > 5,
        attempts: attempt
      };
    } catch (error) {
      if (attempt === retries) {
        return {
          status: 'error',
          error: error.message,
          scrapeable: false,
          attempts: attempt
        };
      }
      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function validateAllSites() {
  console.log('\n🔍 VALIDANDO SCRAPABILIDAD DE 36 SITIOS\n');
  console.log('='.repeat(100));
  
  const results = [];
  let scrapeable = 0;
  let notScrapeable = 0;
  let errors = 0;

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    process.stdout.write(`[${i + 1}/${sites.length}] ${site.name.padEnd(30)} ... `);

    const result = await validateSite(site.url);
    results.push({ ...site, ...result });

    if (result.scrapeable) {
      console.log(`✅ SCRAPEABLE (${result.articleElements} articles, ${result.linkElements} links)${result.attempts > 1 ? ` [Intento ${result.attempts}]` : ''}`);
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
  
  console.log(`✅ Scrapeable: ${scrapeable}/${sites.length}`);
  console.log(`⚠️  No Scrapeable: ${notScrapeable}/${sites.length}`);
  console.log(`❌ Errores: ${errors}/${sites.length}`);
  console.log(`📈 Tasa de éxito: ${((scrapeable / sites.length) * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(100));
  console.log('\n📋 DETALLES POR SITIO\n');

  results.forEach((site, index) => {
    const status = site.scrapeable ? '✅' : site.status === 'error' ? '❌' : '⚠️ ';
    const details = site.scrapeable ? `(${site.articleElements} articles, ${site.linkElements} links)` : `(${site.error || 'no content'})`;
    console.log(`${status} ${site.name}: ${details}`);
  });

  console.log('\n' + '='.repeat(100));
  console.log('\n🎯 RECOMENDACIONES\n');

  const notScrapableSites = results.filter(r => !r.scrapeable);
  if (notScrapableSites.length > 0) {
    console.log('Sitios que NO son scrapeable o tienen errores:');
    notScrapableSites.forEach(site => {
      console.log(`  - ${site.name} (${site.domain}): ${site.error || 'sin contenido detectado'}`);
    });
    console.log('\n⚠️  RECOMENDACIÓN: Estos sitios deben ser reemplazados o investigados manualmente');
  } else {
    console.log('✅ TODOS LOS 36 SITIOS SON SCRAPEABLE');
  }

  // Guardar resultados
  fs.writeFileSync('validation-results-36-sites.json', JSON.stringify(results, null, 2));
  console.log('\n✅ Resultados guardados en: validation-results-36-sites.json\n');

  return results;
}

// Ejecutar validación
validateAllSites().catch(console.error);