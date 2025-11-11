#!/usr/bin/env node

/**
 * Script para solucionar sitios problemáticos usando Puppeteer
 * Puppeteer ejecuta JavaScript y puede manejar sitios dinámicos
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const PROBLEMATIC_SITES = [
  {
    name: 'Tele13 Radio',
    url: 'https://tele13radio.cl',
    problem: 'sin contenido detectado'
  },
  {
    name: 'Orbe',
    url: 'https://orbe.cl',
    problem: 'conexión rechazada'
  },
  {
    name: 'Reuters',
    url: 'https://www.reuters.com/places/chile',
    problem: '401 Unauthorized'
  }
];

async function testWithPuppeteer(site) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    
    // Configurar headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
    });

    // Navegar a la página
    await page.goto(site.url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Esperar a que se cargue contenido dinámico
    await page.waitForTimeout(3000);

    // Scroll para cargar más contenido
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(2000);

    // Obtener HTML
    const html = await page.content();
    const $ = cheerio.load(html);

    // Contar elementos
    const articleCount = $('article, [data-article], [data-news], .article, .news, .post, .story').length;
    const linkCount = $('a[href*="/"]').length;
    const titleCount = $('h1, h2, h3, [data-title], .title, .headline').length;

    await browser.close();

    return {
      success: true,
      articleElements: articleCount,
      linkElements: linkCount,
      titleElements: titleCount,
      scrapeable: articleCount > 0 || linkCount > 5 || titleCount > 5,
      method: 'Puppeteer'
    };
  } catch (error) {
    if (browser) await browser.close();
    return {
      success: false,
      error: error.message,
      method: 'Puppeteer'
    };
  }
}

async function fixProblematicSites() {
  console.log('\n🔧 SOLUCIONANDO SITIOS PROBLEMÁTICOS CON PUPPETEER\n');
  console.log('='.repeat(100));

  for (const site of PROBLEMATIC_SITES) {
    console.log(`\n📍 ${site.name} (${site.problem})\n`);
    process.stdout.write(`  Intentando con Puppeteer... `);

    const result = await testWithPuppeteer(site);

    if (result.success && result.scrapeable) {
      console.log(`✅ FUNCIONA! (${result.articleElements} articles, ${result.linkElements} links)`);
      console.log(`     Método: ${result.method}`);
      console.log(`     Recomendación: Usar Puppeteer para este sitio`);
    } else if (result.success) {
      console.log(`⚠️  Acceso OK pero sin contenido (${result.articleElements} articles, ${result.linkElements} links)`);
      console.log(`     Método: ${result.method}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('\n📋 RECOMENDACIONES\n');
  console.log('Para sitios que requieren JavaScript o tienen protección:');
  console.log('  1. Usar Puppeteer en lugar de Axios');
  console.log('  2. Configurar headers apropiados');
  console.log('  3. Esperar a que se cargue contenido dinámico');
  console.log('  4. Hacer scroll para cargar más contenido\n');
}

fixProblematicSites().catch(console.error);