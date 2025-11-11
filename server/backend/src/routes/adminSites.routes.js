const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { supabase } = require('../config/database');
const crypto = require('crypto');

// Mapea una fila de la BD a la forma esperada por el UI
function rowToSite(row) {
  return {
    domain: row.domain,
    name: row.name,
    enabled: row.isActive,
    priority: 1, // No manejamos prioridad en BD; valor por defecto para ordenar
    selectors: {
      listing: {
        container: row.listingSelectors?.containerSelector ? [row.listingSelectors.containerSelector] : [],
        title: row.listingSelectors?.titleSelector ? [row.listingSelectors.titleSelector] : [],
        link: row.listingSelectors?.linkSelector ? [row.listingSelectors.linkSelector] : [],
        description: []
      },
      article: {
        title: row.titleSelector ? [row.titleSelector] : [],
        content: row.contentSelector ? [row.contentSelector] : [],
        date: row.dateSelector ? [row.dateSelector] : [],
        author: row.authorSelector ? [row.authorSelector] : [],
        images: row.imageSelector ? [row.imageSelector] : []
      }
    },
    cleaningRules: row.cleaningRules || [],
    metadata: {
      encoding: 'utf-8',
      language: 'es'
    }
  };
}

// Helper para tomar el primer selector de un array (o null)
const first = (arr) => (Array.isArray(arr) && arr.length > 0 ? String(arr[0]).trim() || null : null);

// GET /api/admin/sites - Obtener todos los sitios (desde Supabase)
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
 try {
   const { data, error } = await supabase
     .from('site_configurations')
     .select('*')
     .order('domain', { ascending: true });

   if (error) {
     console.error('Error leyendo configuraciones desde Supabase:', error);
     return res.status(500).json({ error: 'Error al leer configuraciones' });
   }

   const sites = (data || []).map(rowToSite);
   res.json({ success: true, sites });
 } catch (error) {
   console.error('Error obteniendo sitios:', error);
   res.status(500).json({ error: 'Error al obtener los sitios' });
 }
});

// PUT /api/admin/sites - Actualizar sitios (Supabase, admin override)
router.put('/', authenticateToken, requireRole('admin'), async (req, res) => {
 try {
   const { sites } = req.body;

   if (!Array.isArray(sites)) {
     return res.status(400).json({ error: 'Los sitios deben ser un array' });
   }

   // Obtener existentes para distinguir insert/update
   const { data: existingRows, error: existingErr } = await supabase
     .from('site_configurations')
     .select('id, domain');

   if (existingErr) {
     console.error('Error consultando existentes:', existingErr);
     return res.status(500).json({ error: 'Error consultando configuraciones existentes' });
   }

   const existingSet = new Set((existingRows || []).map(r => r.domain));
   const nowISO = new Date().toISOString();

   const inserts = [];
   const updates = [];
   const skipped = [];

   for (const site of sites) {
     if (!site || !site.domain || !site.name) {
       skipped.push({ domain: site?.domain || '(sin dominio)', reason: 'domain/name inválidos' });
       continue;
     }

     const titleSelector = first(site.selectors?.article?.title);
     const contentSelector = first(site.selectors?.article?.content);

     if (!titleSelector || !contentSelector) {
       skipped.push({ domain: site.domain, reason: 'faltan selectores title/content' });
       continue;
     }

     const listingSelectors = {
       containerSelector: first(site.selectors?.listing?.container),
       linkSelector: first(site.selectors?.listing?.link),
       titleSelector: first(site.selectors?.listing?.title)
     };

     const record = {
       domain: site.domain,
       name: site.name,
       titleSelector,
       contentSelector,
       dateSelector: first(site.selectors?.article?.date),
       authorSelector: first(site.selectors?.article?.author),
       imageSelector: first(site.selectors?.article?.images),
       cleaningRules: site.cleaningRules || null,
       listingSelectors: listingSelectors.containerSelector || listingSelectors.linkSelector || listingSelectors.titleSelector ? listingSelectors : null,
       isActive: site.enabled !== false,
       updatedAt: nowISO
     };

     if (existingSet.has(site.domain)) {
       updates.push(record);
     } else {
       inserts.push({
         id: crypto.randomUUID(),
         createdAt: nowISO,
         verifiedBy: [],
         usageCount: 0,
         successCount: 0,
         failureCount: 0,
         confidence: 0.5,
         isVerified: false,
         createdBy: 'admin',
         lastError: null,
         lastSuccess: null,
         lastUsedAt: null,
         ...record
       });
     }
   }

   // Insertar nuevos
   if (inserts.length > 0) {
     const { error: insertErr } = await supabase.from('site_configurations').insert(inserts);
     if (insertErr) {
       console.error('Error insertando configuraciones:', insertErr);
       return res.status(500).json({ error: 'Error insertando configuraciones' });
     }
   }

   // Actualizar existentes (uno por uno por distintos valores)
   for (const upd of updates) {
     const { error: updErr } = await supabase
       .from('site_configurations')
       .update(upd)
       .eq('domain', upd.domain);
     if (updErr) {
       console.error(`Error actualizando ${upd.domain}:`, updErr);
       return res.status(500).json({ error: `Error actualizando ${upd.domain}` });
     }
   }

   // Devolver lista final
   const { data: finalRows, error: finalErr } = await supabase
     .from('site_configurations')
     .select('*')
     .order('domain', { ascending: true });

   if (finalErr) {
     console.error('Error leyendo configuraciones finales:', finalErr);
     return res.status(500).json({ error: 'Error leyendo configuraciones' });
   }

   res.json({
     success: true,
     message: 'Sitios guardados exitosamente',
     sites: (finalRows || []).map(rowToSite),
     summary: {
       inserted: inserts.length,
       updated: updates.length,
       skipped
     }
   });
 } catch (error) {
   console.error('Error actualizando sitios:', error);
   res.status(500).json({ error: 'Error al actualizar los sitios' });
 }
});

module.exports = router;