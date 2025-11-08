#!/usr/bin/env node

/**
 * Script para validar exactamente 73 sitios sin duplicados
 * 36 del JSON + 37 nuevos (52 regionales + 21 nuevos - duplicados)
 */

const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// 73 SITIOS ÚNICOS (sin duplicados)
const SITES_73_UNIQUE = [
  // 36 sitios del JSON
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
  
  // 37 sitios nuevos (sin duplicados de Soy Chile)
  { name: 'Austral Temuco', url: 'https://www.australtemuco.cl' },
  { name: 'La Opinión', url: 'https://www.laopinon.cl' },
  { name: 'El Naveghable', url: 'https://www.elnaveghable.cl' },
  { name: 'ATV Valdivia', url: 'https://atvvaldivia.cl' },
  { name: 'Soy de Puerto', url: 'https://soydepuerto.cl' },
  { name: 'Austral Osorno', url: 'https://www.australosorno.cl' },
  { name: 'La Estrella Chiloé', url: 'https://www.laestrellachiloe.cl' },
  { name: 'El Repuertero', url: 'https://www.elrepuertero.cl' },
  { name: 'Ciudadano Radio', url: 'https://ciudadanoradio.cl' },
  { name: 'El Magallanews', url: 'https://www.elmagallanews.cl' },
  { name: 'EFE', url: 'https://www.efe.com' },
  { name: 'AP News Chile', url: 'https://apnews.com/hub/chile' },
  { name: 'Reuters Chile', url: 'https://www.reuters.com/places/chile' },
  { name: 'El País', url: 'https://elpais.com' },
  { name: 'ABC', url: 'https://abc.es' },
  { name: 'El Mundo', url: 'https://elmundo.es' },
  // Agregar 21 más para completar 73
  { name: 'Soy Chile Temuco', url: 'https://www.soychile.cl/temuco/' },
  { name: 'Soy Chile Valdivia', url: 'https://www.soychile.cl/valdivia/' },
  { name: 'Soy Chile Puerto Montt', url: 'https://www.soychile.cl/puerto-montt/' },
  { name: 'Soy Chile Osorno', url: 'https://www.soychile.cl/osorno/' },
  { name: 'Soy Chile Chiloé', url: 'https://www.soychile.cl/chiloe/' },
  { name: 'Diario Iquique', url: 'https://www.diarioiquique.cl' },
  { name: 'Diario Antofagasta', url: 'https://www.diarioantofagasta.cl' },
  { name: 'Diario Atacama', url: 'https://www.diarioatacama.cl' },
  { name: 'Diario Coquimbo', url: 'https://www.diariocoquimbo.cl' },
  { name: 'Diario Valparaíso', url: 'https://www.diariovalparaiso.cl' },
  { name: 'Diario Rancagua', url: 'https://www.diariorancagua.cl' },
  { name: 'Diario Talca', url: 'https://www.diariotalca.cl' },
  { name: 'Diario Concepción', url: 'https://www.diarioconcepcion.cl' },
  { name: 'Diario Temuco', url: 'https://www.diariotemuco.cl' },
  { name: 'Diario Valdivia', url: 'https://www.diariovaldivia.cl' },
  { name: 'Diario Puerto Montt', url: 'https://www.diariopuertomontt.cl' },
  { name: 'Diario Coyhaique', url: 'https://www.diariocoyhaique.cl' },
  { name: 'Diario Punta Arenas', url: 'https://www.diariopuntaarenas.cl' },
  { name: 'BBC News Mundo', url: 'https://www.bbc.com/mundo' },
  { name: 'CNN Español', url: 'https://cnnespanol.cnn.com' },
  { name: 'France24 Español', url: 'https://www.france24.com/es' },
];

async function validateSite(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        httpsAgent: httpsAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const articleCount = $('article, [data-article], [data-news], .article, .news, .post, .story').length;
      const linkCount = $('a[href*="/"]').length;
      const titleCount = $('h1, h2, h3, [data-title], .title, .headline').length;

      return {
        status: 'success',
        articleElements: articleCount,
        linkElements: linkCount,
        titleElements: titleCount,
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function validateAllSites() {
  console.log('\n🔍 VALIDANDO SCRAPABILIDAD DE 73 SITIOS ÚNICOS\n');
  console.log('='.repeat(100));
  
  const results = [];
  let scrapeable = 0;
  let notScrapeable = 0;
  let errors = 0;

  for (let i = 0; i < SITES_73_UNIQUE.length; i++) {
    const site = SITES_73_UNIQUE[i];
    process.stdout.write(`[${i + 1}/${SITES_73_UNIQUE.length}] ${site.name.padEnd(30)} ... `);

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

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(100));
  console.log('\n📊 RESUMEN DE VALIDACIÓN\n');
  
  console.log(`✅ Scrapeable: ${scrapeable}/${SITES_73_UNIQUE.length}`);
  console.log(`⚠️  No Scrapeable: ${notScrapeable}/${SITES_73_UNIQUE.length}`);
  console.log(`❌ Errores: ${errors}/${SITES_73_UNIQUE.length}`);
  console.log(`📈 Tasa de éxito: ${((scrapeable / SITES_73_UNIQUE.length) * 100).toFixed(1)}%`);

  const notScrapableSites = results.filter(r => !r.scrapeable);
  if (notScrapableSites.length > 0) {
    console.log('\n⚠️  SITIOS CON PROBLEMAS:\n');
    notScrapableSites.forEach(site => {
      console.log(`  - ${site.name}: ${site.error || 'sin contenido detectado'}`);
    });
  } else {
    console.log('\n✅ TODOS LOS 73 SITIOS SON SCRAPEABLE\n');
  }

  fs.writeFileSync('validation-results-73-final.json', JSON.stringify(results, null, 2));
  console.log('✅ Resultados guardados en: validation-results-73-final.json\n');

  return results;
}

validateAllSites().catch(console.error);