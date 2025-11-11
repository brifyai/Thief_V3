/**
 * Test para validar que extractNewsWithCheerio detecta correctamente
 * selectores de atributo como a[title] para T13
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { limpiarTexto } = require('./server/backend/src/utils/scraperHelpers');

// Función helper para extraer noticias con Cheerio (copiada del servicio)
const extractNewsWithCheerio = ($, containerSelector, selectors, baseUrl, keyword = null) => {
  const noticias = [];
  
  $(containerSelector).each((_, element) => {
    const $element = $(element);
    
    // Extraer título - LÓGICA MEJORADA para detectar títulos en atributos
    let titulo = "";
    if (selectors.title) {
      const titleSelectors = Array.isArray(selectors.title) ? selectors.title : [selectors.title];
      
      let titleFound = false;
      for (const titleSel of titleSelectors) {
        // Detectar si es un selector de atributo (ej: a[title], div[data-title])
        const isAttributeSelector = titleSel && titleSel.includes('[') && titleSel.includes(']');
        
        if (titleSel === containerSelector || $element.is(titleSel)) {
          const titleAttr = $element.attr('title') ||
                           $element.attr('data-title') ||
                           $element.attr('alt') ||
                           $element.text();
          titulo = limpiarTexto(titleAttr);
          console.log(`✅ Título extraído desde atributo directo (selector: "${titleSel}"): "${titulo}"`);
          titleFound = true;
          break;
        } else if (isAttributeSelector) {
          // Manejar selectores de atributo: extraer el atributo del selector
          const attrMatch = titleSel.match(/\[([^\]]+)\]/);
          if (attrMatch) {
            const attrName = attrMatch[1].replace(/^["']|["']$/g, '');
            const $titleEl = $element.find(titleSel).first();
            if ($titleEl.length > 0) {
              const titleAttr = $titleEl.attr(attrName) || $titleEl.text();
              titulo = limpiarTexto(titleAttr);
              console.log(`✅ Título extraído desde atributo selector (selector: "${titleSel}", attr: "${attrName}"): "${titulo}"`);
              titleFound = true;
              break;
            }
          }
        }
      }
      
      if (!titleFound) {
        for (const titleSel of titleSelectors) {
          const foundTitle = limpiarTexto($element.find(titleSel).first().text());
          if (foundTitle && foundTitle.length > 0) {
            titulo = foundTitle;
            console.log(`✅ Título extraído desde hijos (selector: "${titleSel}"): "${titulo}"`);
            break;
          }
        }
      }
    }
    
    // Extraer enlace
    let enlace = "";
    if (selectors.link) {
      const linkSelectors = Array.isArray(selectors.link) ? selectors.link : [selectors.link];
      
      let linkFound = false;
      for (const linkSel of linkSelectors) {
        const isAttributeSelector = linkSel && linkSel.includes('[') && linkSel.includes(']');
        
        if (linkSel === containerSelector || $element.is(linkSel)) {
          enlace = $element.attr("href");
          console.log(`✅ Enlace extraído desde atributo directo (selector: "${linkSel}"): "${enlace}"`);
          linkFound = true;
          break;
        } else if (isAttributeSelector) {
          const attrMatch = linkSel.match(/\[([^\]]+)\]/);
          if (attrMatch) {
            const attrName = attrMatch[1].replace(/^["']|["']$/g, '');
            const $linkEl = $element.find(linkSel).first();
            if ($linkEl.length > 0) {
              enlace = $linkEl.attr(attrName) || $linkEl.attr('href');
              console.log(`✅ Enlace extraído desde atributo selector (selector: "${linkSel}", attr: "${attrName}"): "${enlace}"`);
              linkFound = true;
              break;
            }
          }
        }
      }
      
      if (!linkFound) {
        for (const linkSel of linkSelectors) {
          const foundLink = $element.find(linkSel).first().attr("href");
          if (foundLink && foundLink.length > 0) {
            enlace = foundLink;
            console.log(`✅ Enlace extraído desde hijos (selector: "${linkSel}"): "${enlace}"`);
            break;
          }
        }
      }
    }
    
    // Normalizar enlace
    if (enlace) {
      try {
        enlace = enlace.split("#")[0].split("?")[0];
        if (!enlace.startsWith("http")) {
          enlace = new URL(enlace, baseUrl).href;
        }
      } catch (e) {
        console.warn("Error al procesar URL:", e.message);
        return;
      }
    }
    
    // Validar y agregar noticia
    if (
      titulo &&
      titulo.length > 10 &&
      !titulo.match(/menu|navegacion|search|newsletter/i) &&
      enlace
    ) {
      noticias.push({
        titulo,
        descripcion: "No hay descripción disponible",
        enlace,
      });
    }
  });
  
  return noticias;
};

async function testT13AttributeSelector() {
  console.log('🧪 Iniciando test de selectores de atributo para T13...\n');
  
  try {
    // Descargar HTML de T13
    console.log('📡 Descargando HTML de T13...');
    const response = await axios.get('https://www.t13.cl/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Configuración de T13 con selectores de atributo
    const t13Config = {
      containerSelector: 'a[title]',
      titleSelector: 'a[title]',
      linkSelector: 'a[title]'
    };
    
    console.log('\n📋 Configuración de T13:');
    console.log(`   Container: ${t13Config.containerSelector}`);
    console.log(`   Title: ${t13Config.titleSelector}`);
    console.log(`   Link: ${t13Config.linkSelector}\n`);
    
    // Extraer noticias
    console.log('🔍 Extrayendo noticias...\n');
    const noticias = extractNewsWithCheerio(
      $,
      t13Config.containerSelector,
      {
        title: t13Config.titleSelector,
        link: t13Config.linkSelector
      },
      'https://www.t13.cl/',
      null
    );
    
    // Resultados
    console.log(`\n✅ Total de noticias extraídas: ${noticias.length}`);
    
    if (noticias.length > 0) {
      console.log('\n📰 Primeras 5 noticias:');
      noticias.slice(0, 5).forEach((noticia, idx) => {
        console.log(`\n${idx + 1}. ${noticia.titulo}`);
        console.log(`   URL: ${noticia.enlace}`);
      });
    }
    
    // Validación
    if (noticias.length >= 50) {
      console.log('\n✅ ¡ÉXITO! Se extrajeron suficientes noticias (>= 50)');
      console.log(`   Esperado: ~57 noticias`);
      console.log(`   Obtenido: ${noticias.length} noticias`);
      process.exit(0);
    } else {
      console.log('\n❌ FALLO: No se extrajeron suficientes noticias');
      console.log(`   Esperado: ~57 noticias`);
      console.log(`   Obtenido: ${noticias.length} noticias`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error durante el test:', error.message);
    process.exit(1);
  }
}

testT13AttributeSelector();
