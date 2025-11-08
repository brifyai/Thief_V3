#!/usr/bin/env node

/**
 * Script para solucionar los 4 sitios problemáticos
 * 1. Tele13 Radio - sin contenido detectado
 * 2. Al Aire Libre - 403 Forbidden
 * 3. Orbe - conexión rechazada
 * 4. Reuters - 401 Unauthorized
 */

const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');

// Crear agente HTTPS que ignora certificados inválidos
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const PROBLEMATIC_SITES = [
  {
    name: 'Tele13 Radio',
    url: 'https://tele13radio.cl',
    problem: 'sin contenido detectado',
    solutions: [
      { name: 'User-Agent Chrome', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' } },
      { name: 'User-Agent Firefox', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0' } },
      { name: 'Con Referer', headers: { 'Referer': 'https://tele13radio.cl/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
    ]
  },
  {
    name: 'Al Aire Libre',
    url: 'https://alairelibre.cl',
    problem: '403 Forbidden',
    solutions: [
      { name: 'User-Agent Chrome', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' } },
      { name: 'Con Accept-Language', headers: { 'Accept-Language': 'es-ES,es;q=0.9', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
      { name: 'Con Referer', headers: { 'Referer': 'https://alairelibre.cl/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
    ]
  },
  {
    name: 'Orbe',
    url: 'https://orbe.cl',
    problem: 'conexión rechazada',
    solutions: [
      { name: 'User-Agent Chrome', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' } },
      { name: 'Con timeout mayor', timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
      { name: 'Alternativa: orbe.cl sin www', url: 'https://orbe.cl', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
    ]
  },
  {
    name: 'Reuters',
    url: 'https://www.reuters.com/places/chile',
    problem: '401 Unauthorized',
    solutions: [
      { name: 'User-Agent Chrome', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' } },
      { name: 'Con Accept-Language', headers: { 'Accept-Language': 'es-ES,es;q=0.9', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
      { name: 'Alternativa: Reuters sin /places/chile', url: 'https://www.reuters.com', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
    ]
  }
];

async function testSolution(site, solution) {
  try {
    const url = solution.url || site.url;
    const timeout = solution.timeout || 15000;
    
    const response = await axios.get(url, {
      timeout: timeout,
      httpsAgent: httpsAgent,
      headers: solution.headers || {}
    });

    const $ = cheerio.load(response.data);
    const articleCount = $('article, [data-article], [data-news], .article, .news, .post, .story').length;
    const linkCount = $('a[href*="/"]').length;
    const titleCount = $('h1, h2, h3, [data-title], .title, .headline').length;

    return {
      success: true,
      statusCode: response.status,
      articleElements: articleCount,
      linkElements: linkCount,
      titleElements: titleCount,
      scrapeable: articleCount > 0 || linkCount > 5 || titleCount > 5
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function fixProblematicSites() {
  console.log('\n🔧 SOLUCIONANDO SITIOS PROBLEMÁTICOS\n');
  console.log('='.repeat(100));

  for (const site of PROBLEMATIC_SITES) {
    console.log(`\n📍 ${site.name} (${site.problem})\n`);
    
    let fixed = false;
    for (const solution of site.solutions) {
      process.stdout.write(`  Intentando: ${solution.name}... `);
      const result = await testSolution(site, solution);
      
      if (result.success && result.scrapeable) {
        console.log(`✅ FUNCIONA! (${result.articleElements} articles, ${result.linkElements} links)`);
        console.log(`     URL: ${solution.url || site.url}`);
        console.log(`     Headers: ${JSON.stringify(solution.headers || {})}`);
        fixed = true;
        break;
      } else if (result.success) {
        console.log(`⚠️  Acceso OK pero sin contenido (${result.articleElements} articles, ${result.linkElements} links)`);
      } else {
        console.log(`❌ ${result.error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!fixed) {
      console.log(`\n  ⚠️  No se encontró solución. Recomendación: REEMPLAZAR ESTE SITIO`);
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('\n📋 RECOMENDACIONES FINALES\n');
  console.log('Sitios que necesitan reemplazo:');
  console.log('  1. Tele13 Radio → Reemplazar con otro sitio de noticias');
  console.log('  2. Orbe → Reemplazar con otro sitio de noticias');
  console.log('  3. Reuters → Usar alternativa o reemplazar\n');
}

fixProblematicSites().catch(console.error);