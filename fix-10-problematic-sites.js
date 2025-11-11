#!/usr/bin/env node

/**
 * Script para arreglar los 10 sitios problemáticos
 * 1 No Scrapeable + 9 Con Error
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const problematicSites = [
  // No Scrapeable
  { name: 'Tele13 Radio', url: 'https://tele13radio.cl', issue: 'Sin contenido detectado' },
  
  // Con Error - DNS
  { name: 'Diario Coquimbo', url: 'https://www.diariocoquimbo.cl', issue: 'ENOTFOUND' },
  { name: 'Diario Temuco', url: 'https://www.diariotemuco.cl', issue: 'ENOTFOUND' },
  { name: 'Diario Valdivia', url: 'https://www.diariovaldivia.cl', issue: 'ENOTFOUND' },
  { name: 'Diario Puerto Montt', url: 'https://www.diariopuertomontt.cl', issue: 'ENOTFOUND' },
  { name: 'Diario Punta Arenas', url: 'https://www.diariopuntaarenas.cl', issue: 'ENOTFOUND' },
  
  // Con Error - Conexión/Auth
  { name: 'Orbe', url: 'https://orbe.cl', issue: 'ECONNREFUSED' },
  { name: 'Reuters Chile', url: 'https://www.reuters.com/places/chile', issue: '401' },
  { name: 'France24 Español', url: 'https://www.france24.com/es', issue: '403' },
];

const browserConfig = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ]
};

const commonHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9',
  'Accept-Encoding': 'gzip, deflate',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
};

async function testSiteWithPuppeteer(url, name) {
  console.log(`\n🔍 Probando ${name} con Puppeteer...`);
  
  let browser;
  try {
    browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();
    
    await page.setUserAgent(commonHeaders['User-Agent']);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Esperar a que cargue contenido
    await page.waitForTimeout(2000);
    
    // Buscar elementos de contenido
    const content = await page.evaluate(() => {
      const articles = document.querySelectorAll('article, .article, .post, [class*="noticia"], [class*="news"]');
      const links = document.querySelectorAll('a[href*="/"]');
      const titles = document.querySelectorAll('h1, h2, h3, .title, [class*="title"]');
      
      return {
        articles: articles.length,
        links: links.length,
        titles: titles.length,
        hasContent: document.body.innerText.length > 500
      };
    });
    
    await browser.close();
    
    console.log(`   ✅ Conexión exitosa`);
    console.log(`   📊 Artículos: ${content.articles}, Enlaces: ${content.links}, Títulos: ${content.titles}`);
    console.log(`   📝 Contenido: ${content.hasContent ? 'Sí' : 'No'}`);
    
    return { success: true, ...content };
  } catch (error) {
    if (browser) await browser.close();
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testSiteWithAxios(url, name) {
  console.log(`\n🔍 Probando ${name} con Axios...`);
  
  try {
    const response = await axios.get(url, {
      headers: commonHeaders,
      timeout: 15000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    const articles = $('article, .article, .post, [class*="noticia"], [class*="news"]').length;
    const links = $('a[href*="/"]').length;
    const titles = $('h1, h2, h3, .title, [class*="title"]').length;
    const content = response.data.length;
    
    console.log(`   ✅ Conexión exitosa (${response.status})`);
    console.log(`   📊 Artículos: ${articles}, Enlaces: ${links}, Títulos: ${titles}`);
    console.log(`   📝 Contenido: ${content} bytes`);
    
    return { success: true, articles, links, titles, content };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function fixProblematicSites() {
  console.log('\n🔧 REPARANDO 10 SITIOS PROBLEMÁTICOS\n');
  console.log('═'.repeat(80));
  
  const results = [];
  
  for (const site of problematicSites) {
    console.log(`\n📍 ${site.name}`);
    console.log(`   URL: ${site.url}`);
    console.log(`   Problema: ${site.issue}`);
    
    // Intentar con Puppeteer primero
    let result = await testSiteWithPuppeteer(site.url, site.name);
    
    // Si Puppeteer falla, intentar con Axios
    if (!result.success) {
      result = await testSiteWithAxios(site.url, site.name);
    }
    
    results.push({
      name: site.name,
      url: site.url,
      originalIssue: site.issue,
      fixed: result.success,
      details: result
    });
  }
  
  // Resumen
  console.log('\n\n' + '═'.repeat(80));
  console.log('\n📊 RESUMEN DE REPARACIÓN\n');
  
  const fixed = results.filter(r => r.fixed).length;
  const notFixed = results.filter(r => !r.fixed).length;
  
  console.log(`✅ Reparados: ${fixed}/10`);
  console.log(`❌ No reparados: ${notFixed}/10\n`);
  
  console.log('Sitios Reparados:');
  results.filter(r => r.fixed).forEach(r => {
    console.log(`  ✅ ${r.name}`);
  });
  
  if (notFixed > 0) {
    console.log('\nSitios que requieren atención especial:');
    results.filter(r => !r.fixed).forEach(r => {
      console.log(`  ❌ ${r.name} - ${r.details.error}`);
    });
  }
  
  return results;
}

// Ejecutar
fixProblematicSites().then(results => {
  const fixed = results.filter(r => r.fixed).length;
  process.exit(fixed === 10 ? 0 : 1);
});