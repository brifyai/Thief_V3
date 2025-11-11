#!/usr/bin/env node

/**
 * Script para validar extracción de descripciones directamente desde la BD
 * Verifica que las mejoras de descripción funcionan correctamente
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateDescriptions() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  VALIDACIÓN DE DESCRIPCIONES EN BASE DE DATOS                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Obtener todas las noticias
    const { data: noticias, error } = await supabase
      .from('news')
      .select('id, title, description, domain, published_at')
      .order('published_at', { ascending: false })
      .limit(500);
    
    if (error) {
      console.error('❌ Error al consultar BD:', error.message);
      process.exit(1);
    }
    
    if (!noticias || noticias.length === 0) {
      console.log('⚠️ No hay noticias en la base de datos');
      process.exit(1);
    }
    
    // Estadísticas
    const stats = {
      total: noticias.length,
      conDescripcion: 0,
      sinDescripcion: 0,
      descripcionesVacias: 0,
      descripcionesCortas: 0,
      descripcionesValidas: 0,
      porDominio: {}
    };
    
    // Analizar noticias
    noticias.forEach(noticia => {
      const domain = noticia.domain || 'unknown';
      
      if (!stats.porDominio[domain]) {
        stats.porDominio[domain] = {
          total: 0,
          conDesc: 0,
          sinDesc: 0,
          validas: 0
        };
      }
      
      stats.porDominio[domain].total++;
      
      if (noticia.description && noticia.description.trim() !== '' && noticia.description !== 'No hay descripción disponible') {
        stats.conDescripcion++;
        stats.porDominio[domain].conDesc++;
        
        if (noticia.description.length < 20) {
          stats.descripcionesCortas++;
        } else {
          stats.descripcionesValidas++;
          stats.porDominio[domain].validas++;
        }
      } else {
        stats.sinDescripcion++;
        stats.porDominio[domain].sinDesc++;
        
        if (!noticia.description || noticia.description.trim() === '') {
          stats.descripcionesVacias++;
        }
      }
    });
    
    // Mostrar resumen general
    const porcentajeConDesc = ((stats.conDescripcion / stats.total) * 100).toFixed(1);
    const porcentajeValidas = ((stats.descripcionesValidas / stats.total) * 100).toFixed(1);
    
    console.log(`📊 ESTADÍSTICAS GENERALES:`);
    console.log(`   Total de noticias: ${stats.total}`);
    console.log(`   Con descripción: ${stats.conDescripcion} (${porcentajeConDesc}%)`);
    console.log(`   Sin descripción: ${stats.sinDescripcion}`);
    console.log(`   Descripciones vacías: ${stats.descripcionesVacias}`);
    console.log(`   Descripciones válidas: ${stats.descripcionesValidas} (${porcentajeValidas}%)`);
    console.log(`   Descripciones cortas: ${stats.descripcionesCortas}`);
    
    // Mostrar detalles por dominio
    console.log(`\n📋 DETALLES POR DOMINIO:\n`);
    
    const dominios = Object.keys(stats.porDominio).sort();
    dominios.forEach(dominio => {
      const d = stats.porDominio[dominio];
      const porcentaje = ((d.conDesc / d.total) * 100).toFixed(1);
      console.log(`${dominio}`);
      console.log(`   Total: ${d.total} | Con desc: ${d.conDesc} (${porcentaje}%) | Válidas: ${d.validas}`);
    });
    
    console.log(`\n`);
    
    // Validación final
    if (porcentajeConDesc >= 80) {
      console.log(`✅ VALIDACIÓN EXITOSA: ${porcentajeConDesc}% de noticias tienen descripción`);
      console.log(`✅ Las mejoras de extracción de descripciones están funcionando correctamente\n`);
      process.exit(0);
    } else if (porcentajeConDesc >= 60) {
      console.log(`⚠️ VALIDACIÓN PARCIAL: ${porcentajeConDesc}% de noticias tienen descripción`);
      console.log(`⚠️ Se recomienda revisar sitios con bajo porcentaje\n`);
      process.exit(1);
    } else {
      console.log(`❌ VALIDACIÓN FALLIDA: ${porcentajeConDesc}% de noticias tienen descripción`);
      console.log(`❌ Las mejoras no están funcionando correctamente\n`);
      process.exit(2);
    }
    
  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(3);
  }
}

validateDescriptions();
