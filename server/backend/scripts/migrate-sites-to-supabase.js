'use strict';

/**
 * Migración de site-configs.json a Supabase (tabla site_configurations)
 * Requisitos:
 *  - Variables de entorno en server/backend/.env:
 *      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *  - Tabla creada en Supabase según el esquema en supabase-schema.sql (site_configurations)
 *
 * Ejecución:
 *  node server/backend/scripts/migrate-sites-to-supabase.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Cargar .env del backend
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados en server/backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CONFIG_JSON_PATH = path.resolve(__dirname, '../src/config/site-configs.json');

function normalizeDomain(urlOrDomain) {
  try {
    let domain = urlOrDomain;
    if (urlOrDomain.includes('://')) {
      const u = new URL(urlOrDomain);
      domain = u.hostname;
    }
    domain = domain.replace(/^www\./, '').toLowerCase().split(':')[0];
    return domain;
  } catch {
    return urlOrDomain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .toLowerCase();
  }
}

function pickFirst(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const s = String(arr[0] || '').trim();
  return s.length ? s : null;
}

async function upsertSiteConfig(site, nowISO) {
  const domain = normalizeDomain(site.domain || '');
  if (!domain) {
    return { status: 'skipped', reason: 'domain vacío' };
  }

  const selectors = site.selectors || {};
  const listing = selectors.listing || {};
  const article = selectors.article || {};

  // Campos requeridos por el esquema
  const titleSelector = pickFirst(article.title);
  const contentSelector = pickFirst(article.content);

  if (!titleSelector || !contentSelector) {
    return {
      status: 'skipped',
      reason: 'falta titleSelector o contentSelector',
      domain,
    };
  }

  const listingSelectors =
    pickFirst(listing.container) || pickFirst(listing.link) || pickFirst(listing.title)
      ? {
          containerSelector: pickFirst(listing.container),
          linkSelector: pickFirst(listing.link),
          titleSelector: pickFirst(listing.title),
        }
      : null;

  const recordBase = {
    domain,
    name: site.name || domain,
    titleSelector,
    contentSelector,
    dateSelector: pickFirst(article.date),
    authorSelector: pickFirst(article.author),
    imageSelector: pickFirst(article.images),
    cleaningRules: site.cleaningRules || null,
    createdBy: 'system',
    verifiedBy: [],
    usageCount: 0,
    successCount: 0,
    failureCount: 0,
    confidence: 0.5,
    isActive: site.enabled !== false,
    isVerified: false,
    listingSelectors,
    lastError: null,
    lastSuccess: null,
    lastUsedAt: null,
    updatedAt: nowISO,
  };

  // Verificar existencia previa por dominio
  const { data: existing, error: selectError } = await supabase
    .from('site_configurations')
    .select('id')
    .eq('domain', domain)
    .limit(1);

  if (selectError) {
    return { status: 'error', domain, error: selectError.message };
  }

  if (Array.isArray(existing) && existing.length > 0) {
    // Update
    const { error: updateError } = await supabase
      .from('site_configurations')
      .update(recordBase)
      .eq('id', existing[0].id);

    if (updateError) {
      return { status: 'error', domain, error: updateError.message };
    }
    return { status: 'updated', domain };
  } else {
    // Insert (debe incluir id y createdAt ya que updatedAt es NOT NULL y createdAt tiene default)
    const insertRecord = {
      id: crypto.randomUUID(),
      createdAt: nowISO,
      ...recordBase,
    };

    const { error: insertError } = await supabase
      .from('site_configurations')
      .insert(insertRecord);

    if (insertError) {
      return { status: 'error', domain, error: insertError.message };
    }
    return { status: 'inserted', domain };
  }
}

async function main() {
  console.log('🚀 Iniciando migración de sitios a Supabase (tabla site_configurations)');

  if (!fs.existsSync(CONFIG_JSON_PATH)) {
    console.error(`❌ No se encontró el archivo ${CONFIG_JSON_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CONFIG_JSON_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const sites = Array.isArray(parsed?.sites) ? parsed.sites : [];

  if (!sites.length) {
    console.warn('⚠️ No hay sitios para migrar (lista vacía)');
    process.exit(0);
  }

  console.log(`📦 Sitios a procesar: ${sites.length}`);
  const nowISO = new Date().toISOString();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const skippedReasons = [];
  let errors = 0;

  for (const site of sites) {
    try {
      const res = await upsertSiteConfig(site, nowISO);
      switch (res.status) {
        case 'inserted':
          inserted++;
          console.log(`✅ INSERT: ${res.domain}`);
          break;
        case 'updated':
          updated++;
          console.log(`🆙 UPDATE: ${res.domain}`);
          break;
        case 'skipped':
          skipped++;
          skippedReasons.push(`${res.domain || '(sin dominio)'} → ${res.reason}`);
          console.log(`⏭️  SKIP: ${res.domain || '(sin dominio)'} (${res.reason})`);
          break;
        case 'error':
          errors++;
          console.error(`❌ ERROR: ${res.domain} → ${res.error}`);
          break;
        default:
          errors++;
          console.error(`❌ Estado desconocido para ${res.domain}`);
      }
    } catch (e) {
      errors++;
      console.error(`❌ Excepción migrando sitio: ${e.message}`);
    }
  }

  console.log('📊 Resumen de migración:');
  console.log(`   Insertados: ${inserted}`);
  console.log(`   Actualizados: ${updated}`);
  console.log(`   Omitidos: ${skipped}`);
  if (skippedReasons.length) {
    console.log('   Motivos skip:');
    skippedReasons.forEach((r) => console.log(`   - ${r}`));
  }
  console.log(`   Errores: ${errors}`);

  if (errors > 0) {
    console.log('⚠️ Hubo errores en la migración. Verifica la salida para más detalles.');
    process.exit(1);
  } else {
    console.log('🎉 Migración completada sin errores.');
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('❌ Error fatal en migración:', e);
  process.exit(1);
});