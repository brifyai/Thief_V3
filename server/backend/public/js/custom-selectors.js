/**
 * Sistema de Selectores Personalizados
 * Funciones para probar y usar selectores CSS personalizados
 */

// Toggle de opciones avanzadas
function toggleAdvancedOptions() {
  const options = document.getElementById('advancedOptions');
  const icon = document.getElementById('advancedToggleIcon');
  
  if (options.style.display === 'none') {
    options.style.display = 'block';
    icon.textContent = '▼';
  } else {
    options.style.display = 'none';
    icon.textContent = '▶';
  }
}

// Limpiar TODOS los selectores (listado + artículo)
function clearCustomSelectors() {
  // Selectores de listado
  document.getElementById('listingContainerSelector').value = '';
  document.getElementById('listingLinkSelector').value = '';
  document.getElementById('listingTitleSelector').value = '';
  
  // Selectores de artículo
  document.getElementById('customTitleSelector').value = '';
  document.getElementById('customContentSelector').value = '';
  document.getElementById('customDateSelector').value = '';
  document.getElementById('customAuthorSelector').value = '';
  document.getElementById('customImageSelector').value = '';
  
  // Limpiar preview
  document.getElementById('selectorPreview').style.display = 'none';
}

// Obtener selectores personalizados
function getCustomSelectors() {
  const title = document.getElementById('customTitleSelector')?.value?.trim();
  const content = document.getElementById('customContentSelector')?.value?.trim();
  const date = document.getElementById('customDateSelector')?.value?.trim();
  const author = document.getElementById('customAuthorSelector')?.value?.trim();
  const image = document.getElementById('customImageSelector')?.value?.trim();
  
  // Solo retornar si al menos título O contenido están presentes
  if (!title && !content) return null;
  
  return {
    titleSelector: title || null,
    contentSelector: content || null,
    dateSelector: date || null,
    authorSelector: author || null,
    imageSelector: image || null
  };
}

// Probar selectores personalizados
async function testCustomSelectors() {
  const url = document.getElementById('urlToSave').value.trim();
  
  if (!url) {
    Swal.fire('Error', 'Por favor ingresa una URL primero', 'error');
    return;
  }
  
  const customSelectors = getCustomSelectors();
  
  if (!customSelectors) {
    Swal.fire('Error', 'Debes ingresar al menos el selector de título o contenido', 'warning');
    return;
  }
  
  // Validar que al menos título o contenido estén presentes
  if (!customSelectors.titleSelector && !customSelectors.contentSelector) {
    Swal.fire('Error', 'Debes ingresar al menos el selector de título o contenido', 'warning');
    return;
  }
  
  // Loading
  Swal.fire({
    title: '🧪 Probando selectores...',
    text: 'Extrayendo contenido con los selectores proporcionados',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
  
  try {
    console.log('🧪 Probando selectores:', { url, customSelectors });
    
    const response = await authenticatedFetch('/api/scraping/test-selectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, customSelectors })
    });
    
    const data = await response.json();
    console.log('📥 Respuesta del test:', data);
    
    if (data.success && data.data) {
      // Mostrar preview
      showSelectorPreview(data.data);
      
      const result = await Swal.fire({
        icon: 'success',
        title: '✅ Selectores funcionan!',
        html: `
          <div style="text-align: left;">
            <p><strong>Título:</strong> ${data.data.titulo ? '✅ Encontrado' : '❌ No encontrado'}</p>
            <p><strong>Contenido:</strong> ${data.data.contenido ? '✅ ' + data.data.contenido.length + ' caracteres' : '❌ No encontrado'}</p>
            ${data.data.fecha ? '<p><strong>Fecha:</strong> ✅ ' + data.data.fecha + '</p>' : ''}
            ${data.data.autor ? '<p><strong>Autor:</strong> ✅ ' + data.data.autor + '</p>' : ''}
            ${data.data.imagenes?.length ? '<p><strong>Imágenes:</strong> ✅ ' + data.data.imagenes.length + ' encontradas</p>' : ''}
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '💾 Guardar Configuración',
        cancelButtonText: '✅ Solo Scrapear',
        confirmButtonColor: '#059669',
        cancelButtonColor: '#6b7280'
      });
      
      if (result.isConfirmed) {
        await saveConfiguration(url, customSelectors);
      }
    } else {
      throw new Error(data.error || 'No se pudo probar los selectores');
    }
  } catch (error) {
    console.error('❌ Error al probar selectores:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error al Probar Selectores',
      html: `
        <p>${error.message || 'No se pudo probar los selectores'}</p>
        <p style="color: #666; font-size: 0.85rem; margin-top: 8px;">
          Verifica que los selectores CSS sean correctos y que la URL sea accesible.
        </p>
      `,
      confirmButtonColor: '#dc2626'
    });
  }
}

// Mostrar preview de selectores
function showSelectorPreview(data) {
  const preview = document.getElementById('selectorPreview');
  
  preview.innerHTML = `
    <div class="alert alert-success">
      <h4>✅ Preview del Contenido Extraído</h4>
      
      ${data.titulo ? `
        <div style="margin-top: 1rem;">
          <strong>Título:</strong>
          <p style="background: white; padding: 0.5rem; border-radius: 4px; margin-top: 0.25rem;">
            ${data.titulo}
          </p>
        </div>
      ` : '<p style="color: var(--error);">❌ Título no encontrado</p>'}
      
      ${data.contenido ? `
        <div style="margin-top: 1rem;">
          <strong>Contenido:</strong>
          <p style="background: white; padding: 0.5rem; border-radius: 4px; margin-top: 0.25rem; max-height: 200px; overflow-y: auto;">
            ${data.contenido.substring(0, 500)}${data.contenido.length > 500 ? '...' : ''}
          </p>
          <small>${data.contenido.length} caracteres</small>
        </div>
      ` : '<p style="color: var(--error);">❌ Contenido no encontrado</p>'}
      
      ${data.fecha ? `<p style="margin-top: 0.5rem;"><strong>Fecha:</strong> ${data.fecha}</p>` : ''}
      ${data.autor ? `<p><strong>Autor:</strong> ${data.autor}</p>` : ''}
      ${data.imagenes?.length ? `<p><strong>Imágenes:</strong> ${data.imagenes.length} encontradas</p>` : ''}
    </div>
  `;
  
  preview.style.display = 'block';
}

// Guardar configuración en BD
async function saveConfiguration(url, customSelectors) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    const listingSelectors = getListingSelectors();
    
    const { value: name } = await Swal.fire({
      title: 'Guardar Configuración',
      input: 'text',
      inputLabel: 'Nombre para esta configuración',
      inputValue: domain,
      inputPlaceholder: 'Ej: El Mercurio, BioBioChile',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return 'Debes ingresar un nombre';
      }
    });
    
    if (!name) return;
    
    // Preparar datos en el formato correcto para el backend
    const configData = {
      domain: domain,
      name: name,
      selectors: {
        titleSelector: customSelectors.titleSelector,
        contentSelector: customSelectors.contentSelector,
        dateSelector: customSelectors.dateSelector || null,
        authorSelector: customSelectors.authorSelector || null,
        imageSelector: customSelectors.imageSelector || null
      },
      testUrl: url  // Incluir URL de prueba
    };
    
    // Agregar selectores de listado si existen
    if (listingSelectors) {
      configData.listingSelectors = listingSelectors;
      console.log('📋 Incluyendo selectores de listado');
    }
    
    console.log('📤 Enviando configuración:', configData);
    
    const response = await authenticatedFetch('/api/site-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData)
    });
    
    const data = await response.json();
    
    if (data.success || response.ok) {
      await Swal.fire({
        icon: 'success',
        title: '✅ Configuración Guardada',
        html: `
          <p>La configuración se guardó exitosamente para <strong>${domain}</strong></p>
          ${listingSelectors ? '<p style="color: #059669; font-size: 0.9rem;">✅ Incluye selectores de listado</p>' : ''}
          <p style="color: #666; font-size: 0.9rem; margin-top: 8px;">
            Se usará automáticamente en futuros scrapings de este dominio.
          </p>
        `,
        confirmButtonColor: '#059669'
      });
    } else {
      throw new Error(data.error || 'No se pudo guardar la configuración');
    }
  } catch (error) {
    console.error('❌ Error al guardar configuración:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error al Guardar',
      text: error.message || 'No se pudo guardar la configuración',
      confirmButtonColor: '#dc2626'
    });
  }
}

// Probar scraping de cualquier URL (sin agregar a lista)
async function testAnyUrl() {
  const url = document.getElementById('urlToSave').value.trim();
  
  if (!url) {
    Swal.fire('Error', 'Por favor ingresa una URL', 'error');
    return;
  }
  
  const customSelectors = getCustomSelectors();
  
  Swal.fire({
    title: '🧪 Probando scraping...',
    text: 'Extrayendo contenido de la URL',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
  
  try {
    const response = await authenticatedFetch('/scrape-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, customSelectors })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Mostrar popup con contenido usando la función existente
      const popup = document.getElementById("articlePopup");
      const popupContent = document.getElementById("popupContent");
      
      popup.style.display = "flex";
      popupContent.innerHTML = `
        <h2 style="margin-bottom: 16px;">${data.data.titulo || 'Sin título'}</h2>
        <div style="color: var(--gray-600); font-size: 0.9rem; margin-bottom: 16px; display: flex; gap: 16px; flex-wrap: wrap;">
          ${data.data.fecha ? `<span>📅 ${data.data.fecha}</span>` : ""}
          ${data.data.autor ? `<span>✍️ ${data.data.autor}</span>` : ""}
          <span>🔗 <a href="${url}" target="_blank" style="color: var(--primary);">Ver original</a></span>
        </div>
        <div style="margin-top: 24px; line-height: 1.8;">
          ${data.data.contenido ? data.data.contenido.split("\n\n").map((p) => `<p style="margin-bottom: 16px;">${p}</p>`).join("") : 'Sin contenido'}
        </div>
        ${data.data.imagenes && data.data.imagenes.length > 0 ? `
          <div style="margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            ${data.data.imagenes.map((src) => `
              <img src="${src}" alt="Imagen del artículo" 
                   style="width: 100%; border-radius: 8px; box-shadow: var(--shadow-sm);"
                   onerror="this.style.display='none'" loading="lazy">
            `).join("")}
          </div>
        ` : ""}
      `;
      
      // Preguntar si quiere guardar
      Swal.fire({
        icon: 'success',
        title: '✅ Scraping exitoso',
        text: '¿Deseas agregar esta URL a tu lista y guardar el contenido?',
        showCancelButton: true,
        confirmButtonText: '💾 Sí, guardar',
        cancelButtonText: 'No, solo ver'
      }).then(async (result) => {
        if (result.isConfirmed) {
          await agregarUrl();
          await guardarContenido(url, data.data);
          Swal.fire('✅ Guardado', 'URL agregada y contenido guardado exitosamente', 'success');
        }
      });
    } else {
      Swal.fire('Error', data.error || 'No se pudo scrapear la URL', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    Swal.fire('Error', 'Error al probar scraping: ' + error.message, 'error');
  }
}

// Helper: Guardar contenido en BD
async function guardarContenido(url, scrapedData) {
  const response = await authenticatedFetch('/api/scraping/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: url,
      titulo: scrapedData.titulo,
      contenido: scrapedData.contenido,
      fecha: scrapedData.fecha,
      autor: scrapedData.autor,
      imagenes: scrapedData.imagenes,
      metadata: scrapedData.metadata
    })
  });
  
  return await response.json();
}

// Guardar configuración silenciosamente (sin pedir nombre)
async function saveConfigurationSilent(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    const customSelectors = getCustomSelectors();
    const listingSelectors = getListingSelectors();
    
    if (!customSelectors) {
      console.log('⚠️ No hay selectores para guardar');
      return false;
    }
    
    // Preparar datos
    const configData = {
      domain: domain,
      name: domain, // Usar dominio como nombre por defecto
      selectors: {
        titleSelector: customSelectors.titleSelector,
        contentSelector: customSelectors.contentSelector,
        dateSelector: customSelectors.dateSelector || null,
        authorSelector: customSelectors.authorSelector || null,
        imageSelector: customSelectors.imageSelector || null
      },
      testUrl: url
    };
    
    // Agregar selectores de listado si existen
    if (listingSelectors) {
      configData.listingSelectors = listingSelectors;
      console.log('📋 Incluyendo selectores de listado');
    }
    
    console.log('📤 Guardando configuración automáticamente:', configData);
    
    const response = await authenticatedFetch('/api/site-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData)
    });
    
    const data = await response.json();
    
    if (data.success || response.ok) {
      console.log('✅ Configuración guardada exitosamente');
      return true;
    } else {
      console.warn('⚠️ No se pudo guardar configuración:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error guardando configuración:', error);
    return false;
  }
}

// Probar y guardar configuración (SIMPLIFICADO - sin validación compleja)
async function testAndSaveConfig() {
  const url = document.getElementById('urlToSave').value.trim();
  
  if (!url) {
    Swal.fire('Error', 'Por favor ingresa una URL primero', 'error');
    return;
  }
  
  const customSelectors = getCustomSelectors();
  const listingSelectors = getListingSelectors();
  
  // Validar que haya al menos selectores de artículo
  if (!customSelectors || (!customSelectors.titleSelector && !customSelectors.contentSelector)) {
    Swal.fire({
      icon: 'warning',
      title: 'Selectores Requeridos',
      html: `
        <p>Debes ingresar al menos:</p>
        <ul style="text-align: left; margin-top: 1rem;">
          <li><strong>Título</strong> Y <strong>Contenido</strong> del artículo</li>
        </ul>
        <p style="margin-top: 1rem; color: #666; font-size: 0.9rem;">
          Los selectores de listado son opcionales.
        </p>
      `
    });
    return;
  }
  
  // Confirmar guardado directo
  const result = await Swal.fire({
    icon: 'question',
    title: '💾 Guardar Configuración',
    html: `
      <div style="text-align: left;">
        <p><strong>Selectores a guardar:</strong></p>
        <ul style="margin-top: 1rem; font-size: 0.9rem;">
          <li><strong>Título:</strong> <code>${customSelectors.titleSelector}</code></li>
          <li><strong>Contenido:</strong> <code>${customSelectors.contentSelector}</code></li>
          ${customSelectors.dateSelector ? '<li><strong>Fecha:</strong> <code>' + customSelectors.dateSelector + '</code></li>' : ''}
          ${customSelectors.authorSelector ? '<li><strong>Autor:</strong> <code>' + customSelectors.authorSelector + '</code></li>' : ''}
          ${customSelectors.imageSelector ? '<li><strong>Imagen:</strong> <code>' + customSelectors.imageSelector + '</code></li>' : ''}
          ${listingSelectors ? '<li style="color: #059669;"><strong>✅ Incluye selectores de listado</strong></li>' : ''}
        </ul>
        <p style="margin-top: 1.5rem; color: #666; font-size: 0.9rem;">
          Se guardará para usar automáticamente en este dominio.
        </p>
      </div>
    `,
    width: 600,
    showCancelButton: true,
    confirmButtonText: '💾 Sí, Guardar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#059669',
    cancelButtonColor: '#6b7280'
  });
  
  if (result.isConfirmed) {
    await saveConfiguration(url, customSelectors);
  }
}

// Mostrar ayuda de selectores
function showSelectorHelp() {
  Swal.fire({
    title: '🎯 ¿Cómo encontrar selectores CSS?',
    html: `
      <div style="text-align: left;">
        <h4>Paso 1: Abrir DevTools</h4>
        <p>Click derecho en el elemento → "Inspeccionar" (F12)</p>
        
        <h4>Paso 2: Encontrar el selector</h4>
        <p>Click derecho en el elemento HTML → Copy → Copy selector</p>
        
        <h4>Ejemplos comunes:</h4>
        <ul>
          <li><code>h1.title</code> - Título con clase "title"</li>
          <li><code>.article-body</code> - Elemento con clase "article-body"</li>
          <li><code>article p</code> - Párrafos dentro de &lt;article&gt;</li>
          <li><code>[datetime]</code> - Elementos con atributo datetime</li>
        </ul>
        
        <h4>💡 Tips:</h4>
        <ul>
          <li>Usa selectores simples y específicos</li>
          <li>Prueba los selectores antes de scrapear</li>
          <li>Si falla, intenta con un selector más general</li>
        </ul>
      </div>
    `,
    width: 600,
    confirmButtonText: 'Entendido'
  });
}
