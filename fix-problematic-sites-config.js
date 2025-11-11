#!/usr/bin/env node

/**
 * Configuraciones específicas para arreglar los 10 sitios problemáticos
 * Se integran en scraping.service.js como PRIORIDAD ESPECIAL
 */

const fs = require('fs');

// Configuraciones específicas para sitios problemáticos
const problematicSitesConfig = {
  // 1. Tele13 Radio - Usar Puppeteer con scroll
  'tele13radio.cl': {
    name: 'Tele13 Radio',
    domain: 'tele13radio.cl',
    method: 'puppeteer',
    listingSelectors: {
      containerSelector: 'a[href*="/noticia/"], article, .noticia, [class*="news-item"]',
      linkSelector: 'a',
      titleSelector: '[title], .title, h2, h3'
    },
    scrollStrategy: 'aggressive',
    scrollIterations: 15,
    waitForSelector: 'a[href*="/noticia/"]',
    timeout: 30000
  },

  // 2-6. Diarios Regionales - Usar URLs alternativas o DNS
  'diariocoquimbo.cl': {
    name: 'Diario Coquimbo',
    domain: 'diariocoquimbo.cl',
    alternateUrls: [
      'https://diariocoquimbo.cl',
      'https://www.diariocoquimbo.cl',
      'https://diariocoquimbo.com'
    ],
    method: 'axios',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    retries: 5,
    timeout: 20000
  },

  'diariotemuco.cl': {
    name: 'Diario Temuco',
    domain: 'diariotemuco.cl',
    alternateUrls: [
      'https://diariotemuco.cl',
      'https://www.diariotemuco.cl',
      'https://diariotemuco.com'
    ],
    method: 'axios',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    retries: 5,
    timeout: 20000
  },

  'diariovaldivia.cl': {
    name: 'Diario Valdivia',
    domain: 'diariovaldivia.cl',
    alternateUrls: [
      'https://diariovaldivia.cl',
      'https://www.diariovaldivia.cl',
      'https://diariovaldivia.com'
    ],
    method: 'axios',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    retries: 5,
    timeout: 20000
  },

  'diariopuertomontt.cl': {
    name: 'Diario Puerto Montt',
    domain: 'diariopuertomontt.cl',
    alternateUrls: [
      'https://diariopuertomontt.cl',
      'https://www.diariopuertomontt.cl',
      'https://diariopuertomontt.com'
    ],
    method: 'axios',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    retries: 5,
    timeout: 20000
  },

  'diariopuntaarenas.cl': {
    name: 'Diario Punta Arenas',
    domain: 'diariopuntaarenas.cl',
    alternateUrls: [
      'https://diariopuntaarenas.cl',
      'https://www.diariopuntaarenas.cl',
      'https://diariopuntaarenas.com'
    ],
    method: 'axios',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    retries: 5,
    timeout: 20000
  },

  // 7. Orbe - Usar Puppeteer con reintentos
  'orbe.cl': {
    name: 'Orbe',
    domain: 'orbe.cl',
    method: 'puppeteer',
    listingSelectors: {
      containerSelector: 'article, .article, .post, [class*="noticia"]',
      linkSelector: 'a',
      titleSelector: 'h2, h3, .title'
    },
    retries: 5,
    backoffMultiplier: 2,
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },

  // 8. Reuters - Usar headers especiales y Puppeteer
  'reuters.com': {
    name: 'Reuters Chile',
    domain: 'reuters.com',
    method: 'puppeteer',
    listingSelectors: {
      containerSelector: 'a[data-testid*="Link"], article, [class*="article"]',
      linkSelector: 'a',
      titleSelector: 'h3, h2, [class*="title"]'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9'
    },
    retries: 3,
    timeout: 30000
  },

  // 9. France24 - Usar headers especiales
  'france24.com': {
    name: 'France24 Español',
    domain: 'france24.com',
    method: 'puppeteer',
    listingSelectors: {
      containerSelector: 'article, [class*="article"], [class*="news"]',
      linkSelector: 'a',
      titleSelector: 'h2, h3, .title'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9',
      'Referer': 'https://www.france24.com/'
    },
    retries: 3,
    timeout: 30000
  }
};

console.log('📋 CONFIGURACIONES PARA SITIOS PROBLEMÁTICOS\n');
console.log('═'.repeat(80));

// Mostrar configuraciones
Object.entries(problematicSitesConfig).forEach(([domain, config]) => {
  console.log(`\n✅ ${config.name}`);
  console.log(`   Dominio: ${domain}`);
  console.log(`   Método: ${config.method}`);
  console.log(`   Reintentos: ${config.retries || 'default'}`);
  console.log(`   Timeout: ${config.timeout}ms`);
  
  if (config.alternateUrls) {
    console.log(`   URLs alternativas: ${config.alternateUrls.length}`);
  }
  
  if (config.listingSelectors) {
    console.log(`   Selectores configurados: Sí`);
  }
});

console.log('\n' + '═'.repeat(80));
console.log('\n📝 INSTRUCCIONES DE INTEGRACIÓN:\n');
console.log('1. Agregar estas configuraciones a scraping.service.js');
console.log('2. Crear función checkProblematicSites() en PRIORIDAD ESPECIAL');
console.log('3. Implementar reintentos con exponential backoff');
console.log('4. Usar Puppeteer para sitios con problemas de conexión');
console.log('5. Usar URLs alternativas para sitios con DNS no resuelto\n');

// Guardar configuraciones en JSON
fs.writeFileSync('problematic-sites-config.json', JSON.stringify(problematicSitesConfig, null, 2));
console.log('✅ Configuraciones guardadas en: problematic-sites-config.json\n');

module.exports = problematicSitesConfig;