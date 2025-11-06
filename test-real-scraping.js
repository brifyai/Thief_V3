const axios = require('axios');
const cheerio = require('cheerio');

// Importar el configLoader real
const configLoader = require('./server/backend/src/services/configLoader.service');

const sites = [
  'https://www.t13.cl',
  'https://www.lacuarta.com', 
  'https://www.meganoticias.cl',
  'https://www.biobiochile.cl',
  'https://www.cooperativa.cl'
];

async function testRealScrapingLogic(siteUrl) {
  try {
    console.log(`\n🧪 Probando lógica real de scraping: ${siteUrl}`);
    
    // Simular la lógica del sistema real
    const response = await axios.get(siteUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const baseUrl = new URL(siteUrl).origin;
    
    // Buscar configuración igual que el sistema real
    const siteConfig = configLoader.getConfigForDomain(siteUrl);
    
    if (!siteConfig) {
      console.log(`❌ No se encontró configuración para ${siteUrl}`);
      return;
    }
    
    console.log(`📋 Configuración encontrada: ${siteConfig.name}`);
    console.log(`🔍 Selectores del sistema:`);
    console.log(`   Container: ${JSON.stringify(siteConfig.selectors.listing.container)}`);
    console.log(`   Title: ${JSON.stringify(siteConfig.selectors.listing.title)}`);
    console.log(`   Link: ${JSON.stringify(siteConfig.selectors.listing.link)}`);
    
    // Usar la misma lógica que extractNewsWithCheerio
    const listingSelectors = siteConfig.selectors.listing;
    
    if (listingSelectors.container) {
      const containerSelector = Array.isArray(listingSelectors.container) 
        ? listingSelectors.container.join(", ") 
        : listingSelectors.container;
      
      console.log(`\n🔍 Buscando contenedores con: "${containerSelector}"`);
      
      const containers = $(containerSelector);
      console.log(`   Encontrados: ${containers.length} contenedores`);
      
      if (containers.length > 0) {
        console.log(`\n📰 Primeros 3 contenedores encontrados:`);
        containers.slice(0, 3).each((i, element) => {
          const $element = $(element);
          
          // Extraer título
          let titulo = "";
          if (listingSelectors.title) {
            const titleSelector = Array.isArray(listingSelectors.title) 
              ? listingSelectors.title.join(", ") 
              : listingSelectors.title;
            titulo = $element.find(titleSelector).first().text().trim();
          }
          
          // Extraer enlace
          let enlace = "";
          if (listingSelectors.link) {
            const linkSelector = Array.isArray(listingSelectors.link) 
              ? listingSelectors.link.join(", ") 
              : listingSelectors.link;
            enlace = $element.find(linkSelector).first().attr("href");
          }
          
          console.log(`   ${i+1}. Título: "${titulo.substring(0, 60)}..."`);
          console.log(`      Enlace: ${enlace || 'No encontrado'}`);
        });
      }
    }
    
  } catch (error) {
    console.log(`❌ Error con ${siteUrl}: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 TEST DE LÓGICA REAL DE SCRAPING');
  console.log('='.repeat(60));
  
  for (const site of sites) {
    await testRealScrapingLogic(site);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Test completado');
}

main();