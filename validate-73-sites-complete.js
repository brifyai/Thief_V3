#!/usr/bin/env node

/**
 * Script para validar si los 73 sitios son scrapeable
 * 52 sitios regionales + 21 sitios nuevos
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

// 73 sitios: 52 regionales + 21 nuevos
const SITES_73 = [
  // 36 sitios del JSON existente
  { name: 'Emol', url: 'https://emol.com' },
  { name: 'PuroMarketing', url: 'https://puromarketing.com' },
  { name: 'La Tercera', url: 'https://latercera.com' },
  { name: 'La Tercera CL', url: 'https://latercera.cl' },
  { name: 'T13', url: 'https://t13.cl' },
  { name: 'La Cuarta', url: 'https://lacuarta.com' },
  { name: 'La Nación', url: 'https://lanacion.cl' },
  { name: '24 Horas', url: 'https://24horas.cl' },
  { name: 'Mega Noticias', url: 'https://meganoticias.cl' },
  { name: 'Chilevisión', url: 'https://chilevision.cl' },
  { name: 'Biobío Chile', url: 'https://biobiochile.cl' },
  { name: 'Cooperativa', url: 'https://cooperativa.cl' },
  { name: 'ADN Radio', url: 'https://adnradio.cl' },
  { name: 'Bloomberg Línea', url: 'https://bloomberglinea.com' },
  { name: 'Chocale', url: 'https://chocale.cl' },
  { name: 'Tele13 Radio', url: 'https://tele13radio.cl' },
  { name: 'RedGol', url: 'https://redgol.cl' },
  { name: 'AS Chile', url: 'https://chile.as.com' },
  { name: 'Al Aire Libre', url: 'https://alairelibre.cl' },
  { name: 'Prensa Fútbol', url: 'https://prensafutbol.cl' },
  { name: 'Ciper Chile', url: 'https://ciperchile.cl' },
  { name: 'El Mostrador', url: 'https://elmostrador.cl' },
  { name: 'Interferencia', url: 'https://interferencia.cl' },
  { name: 'El Desconcierto', url: 'https://eldesconcierto.cl' },
  { name: 'ANID', url: 'https://anid.cl' },
  { name: 'MinCiencia', url: 'https://minciencia.gob.cl' },
  { name: 'Chile Cultura', url: 'https://chilecultura.gob.cl' },
  { name: 'Orbe', url: 'https://orbe.cl' },
  { name: 'Mediabanco', url: 'https://mediabanco.com' },
  { name: 'En Prensa', url: 'https://enprensa.cl' },
  { name: 'Soy Chile', url: 'https://soychile.cl' },
  { name: 'Arica Aldia', url: 'https://aricaldia.cl' },
  { name: 'El Morro de Arica', url: 'https://elmorrodearica.cl' },
  { name: 'Arica 365', url: 'https://arica365.cl' },
  { name: 'El Morro Cotudo', url: 'https://elmorrocotudo.cl' },
  { name: 'Cappissima Multimedial', url: 'https://cappissimamultimedial.cl' },
  
  // 21 sitios nuevos (regionales e internacionales)
  // La Araucanía (3)
  { name: 'Soy Chile Temuco', url: 'https://www.soychile.cl/temuco/' },
  { name: 'Austral Temuco', url: 'https://www.australtemuco.cl' },
  { name: 'La Opinión', url: 'https://www.laopinon.cl' },
  
  // Los Ríos (3)
  { name: 'Soy Chile Valdivia', url: 'https://www.soychile.cl/valdivia/' },
  { name: 'El Naveghable', url: 'https://www.elnaveghable.cl' },
  { name: 'ATV Valdivia', url: 'https://atvvaldivia.cl' },
  
  // Los Lagos (6)
  { name: 'Soy Chile Puerto Montt', url: 'https://www.soychile.cl/puerto-montt/' },
  { name: 'Soy de Puerto', url: 'https://soydepuerto.cl' },
  { name: 'Soy Chile Osorno', url: 'https://www.soychile.cl/osorno/' },
  { name: 'Austral Osorno', url: 'https://www.australosorno.cl' },
  { name: 'Soy Chile Chiloé', url: 'https://www.soychile.cl/chiloe/' },
  { name: 'La Estrella Chiloé', url: 'https://www.laestrellachiloe.cl' },
  
  // Aysén (2)
  { name: 'El Repuertero', url: 'https://www.elrepuertero.cl' },
  { name: 'Ciudadano Radio', url: 'https://ciudadanoradio.cl' },
  
  // Magallanes (1)
  { name: 'El Magallanews', url: 'https://www.elmagallanews.cl' },
  
  // Internacional (6)
  { name: 'EFE', url: 'https://www.efe.com' },
  { name: 'AP News Chile', url: 'https://apnews.com/hub/chile' },
  { name: 'Reuters Chile', url: 'https://www.reuters.com/places/chile' },
  { name: 'El País', url: 'https://elpais.com' },
  { name: 'ABC', url: 'https://abc.es' },
  { name: 'El Mundo', url: 'https://elmundo.es' },
];

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
  console.log('\n🔍 VALIDANDO SCRAPABILIDAD DE 73 SITIOS\n');
  console.log('='.repeat(100));
  
  const results = [];
  let scrapeable = 0;
  let notScrapeable = 0;
  let errors = 0;

  for (let i = 0; i < SITES_73.length; i++) {
    const site = SITES_73[i];
    process.stdout.write(`[${i + 1}/${SITES_73.length}] ${site.name.padEnd(30)} ... `);

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
  
  console.log(`✅ Scrapeable: ${scrapeable}/${SITES_73.length}`);
  console.log(`⚠️  No Scrapeable: ${notScrapeable}/${SITES_73.length}`);
  console.log(`❌ Errores: ${errors}/${SITES_73.length}`);
  console.log(`📈 Tasa de éxito: ${((scrapeable / SITES_73.length) * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(100));

  const notScrapableSites = results.filter(r => !r.scrapeable);
  if (notScrapableSites.length > 0) {
    console.log('\n⚠️  SITIOS CON PROBLEMAS:\n');
    notScrapableSites.forEach(site => {
      console.log(`  - ${site.name}: ${site.error || 'sin contenido detectado'}`);
    });
  } else {
    console.log('\n✅ TODOS LOS 73 SITIOS SON SCRAPEABLE\n');
  }

  // Guardar resultados
  fs.writeFileSync('validation-results-73-sites.json', JSON.stringify(results, null, 2));
  console.log('✅ Resultados guardados en: validation-results-73-sites.json\n');

  return results;
}

// Ejecutar validación
validateAllSites().catch(console.error);