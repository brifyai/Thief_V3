/**
 * Sistema de Scraping de Listados
 * Funciones para scrapear múltiples noticias de páginas principales
 */

// Obtener selectores de listado
function getListingSelectors() {
  const container = document.getElementById('listingContainerSelector')?.value?.trim();
  const link = document.getElementById('listingLinkSelector')?.value?.trim();
  const title = document.getElementById('listingTitleSelector')?.value?.trim();
  
  if (!container || !link) return null;
  
  return {
    containerSelector: container,
    linkSelector: link,
    titleSelector: title || null
  };
}

// Limpiar selectores de listado
function clearListingSelectors() {
  document.getElementById('listingContainerSelector').value = '';
  document.getElementById('listingLinkSelector').value = '';
  document.getElementById('listingTitleSelector').value = '';
  document.getElementById('selectorPreview').style.display = 'none';
}

// Probar selectores de listado
async function testListingSelectors() {
  const url = document.getElementById('urlToSave').value.trim();
  
  if (!url) {
    Swal.fire('Error', 'Por favor ingresa una URL primero', 'error');
    return;
  }
  
  const listingSelectors = getListingSelectors();
  
  if (!listingSelectors) {
    Swal.fire('Error', 'Debes ingresar al menos el contenedor y el link de las noticias', 'warning');
    return;
  }
  
  // Loading
  Swal.fire({
    title: '🧪 Probando selectores de listado...',
    text: 'Buscando noticias en la página',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
  
  try {
    // Crear un endpoint temporal para probar solo el listado
    const response = await authenticatedFetch('/api/scraping/test-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, listingSelectors })
    });
    
    const data = await response.json();
    
    if (data.success && data.newsUrls && data.newsUrls.length > 0) {
      // Mostrar preview de noticias encontradas
      showListingPreview(data.newsUrls);
      
      Swal.fire({
        icon: 'success',
        title: `✅ Encontradas ${data.newsUrls.length} noticias!`,
        html: `
          <div style="text-align: left;">
            <p><strong>Total de noticias:</strong> ${data.newsUrls.length}</p>
            <p style="margin-top: 1rem;"><strong>Primeras 5 noticias:</strong></p>
            <ul style="max-height: 200px; overflow-y: auto;">
              ${data.newsUrls.slice(0, 5).map(n => `<li>${n.previewTitle}</li>`).join('')}
            </ul>
          </div>
        `,
        confirmButtonText: 'Continuar'
      });
    } else {
      Swal.fire('Error', data.error || 'No se encontraron noticias con los selectores proporcionados', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    Swal.fire('Error', 'Error al probar selectores de listado: ' + error.message, 'error');
  }
}

// Mostrar preview de noticias encontradas
function showListingPreview(newsUrls) {
  const preview = document.getElementById('selectorPreview');
  
  preview.innerHTML = `
    <div class="alert alert-success">
      <h4>✅ Noticias Encontradas (${newsUrls.length})</h4>
      <div style="max-height: 300px; overflow-y: auto; margin-top: 1rem;">
        <ol>
          ${newsUrls.map(news => `
            <li style="margin-bottom: 0.5rem;">
              <strong>${news.previewTitle}</strong><br>
              <small style="color: var(--gray-600);">${news.url}</small>
            </li>
          `).join('')}
        </ol>
      </div>
    </div>
  `;
  
  preview.style.display = 'block';
}

// Scrapear listado completo y guardar
async function scrapeListingAndSave() {
  const url = document.getElementById('urlToSave').value.trim();
  
  if (!url) {
    Swal.fire('Error', 'Por favor ingresa una URL', 'error');
    return;
  }
  
  const listingSelectors = getListingSelectors();
  const articleSelectors = getCustomSelectors();
  
  if (!listingSelectors) {
    Swal.fire('Error', 'Debes ingresar los selectores de listado (contenedor y link)', 'warning');
    return;
  }
  
  if (!articleSelectors) {
    Swal.fire('Error', 'Debes ingresar los selectores de artículo (título o contenido)', 'warning');
    return;
  }
  
  // Confirmar antes de scrapear
  const { isConfirmed } = await Swal.fire({
    icon: 'question',
    title: '🕷️ ¿Scrapear listado completo?',
    html: `
      <p>Esto puede tomar varios minutos dependiendo de la cantidad de noticias.</p>
      <p style="color: var(--warning); font-size: 0.9rem;">
        ⚠️ Se scrapeará cada noticia individualmente y se guardará en la base de datos.
      </p>
    `,
    showCancelButton: true,
    confirmButtonText: 'Sí, scrapear',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#059669'
  });
  
  if (!isConfirmed) return;
  
  // Mostrar loading con progreso
  let progressHtml = `
    <div style="text-align: left;">
      <p><strong>Estado:</strong> <span id="scraping-status">Iniciando...</span></p>
      <p><strong>Progreso:</strong> <span id="scraping-progress">0/0</span></p>
      <div style="background: var(--gray-200); height: 20px; border-radius: 10px; margin-top: 0.5rem; overflow: hidden;">
        <div id="progress-bar" style="background: var(--success); height: 100%; width: 0%; transition: width 0.3s;"></div>
      </div>
      <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--gray-600);">
        <span id="current-article">Preparando...</span>
      </p>
    </div>
  `;
  
  Swal.fire({
    title: '🕷️ Scrapeando listado...',
    html: progressHtml,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
  
  try {
    const response = await authenticatedFetch('/api/scraping/scrape-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url, 
        listingSelectors,
        articleSelectors 
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const result = data.data;
      
      // Guardar TODOS los artículos en una sola llamada usando el nuevo endpoint
      let savedCount = 0;
      let saveErrors = [];
      
      try {
        const saveResponse = await authenticatedFetch('/api/scraping/save-listing-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingUrl: url,
            articles: result.articles
          })
        });
        
        const saveData = await saveResponse.json();
        
        if (saveData.success) {
          savedCount = saveData.savedCount;
          saveErrors = saveData.errors || [];
        }
      } catch (error) {
        console.error('Error guardando artículos:', error);
        saveErrors.push({ error: error.message });
      }
      
      // Mostrar resultado final con lista de noticias
      Swal.fire({
        icon: 'success',
        title: '✅ ¡Scraping completado!',
        html: `
          <div style="text-align: left;">
            <p><strong>📊 Estadísticas:</strong></p>
            <ul>
              <li>Noticias encontradas: <strong>${result.totalFound}</strong></li>
              <li>Scrapeadas exitosamente: <strong>${result.totalScraped}</strong></li>
              <li>Guardadas en BD: <strong>${savedCount}</strong></li>
              <li>Fallidas: <strong>${result.totalFailed}</strong></li>
              <li>Tasa de éxito: <strong>${result.successRate}%</strong></li>
            </ul>
            
            ${result.articles && result.articles.length > 0 ? `
              <div style="margin-top: 1.5rem;">
                <p><strong>📰 Noticias Scrapeadas:</strong></p>
                <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.5rem;">
                  ${result.articles.slice(0, 10).map((article, idx) => `
                    <div style="padding: 0.75rem; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background 0.2s;"
                         onmouseover="this.style.background='#f9fafb'" 
                         onmouseout="this.style.background='white'"
                         onclick="showArticleInModal(${JSON.stringify(article).replace(/"/g, '&quot;')})">
                      <div style="display: flex; align-items: start; gap: 0.5rem;">
                        <span style="background: #059669; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0;">${idx + 1}</span>
                        <div style="flex: 1;">
                          <strong style="color: #111827; font-size: 0.9rem;">${article.titulo}</strong>
                          <p style="color: #6b7280; font-size: 0.8rem; margin: 0.25rem 0 0 0;">
                            ${article.fecha || 'Sin fecha'} • ${article.contenido.substring(0, 80)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                  ${result.articles.length > 10 ? `
                    <p style="text-align: center; color: #6b7280; font-size: 0.85rem; padding: 0.5rem;">
                      Y ${result.articles.length - 10} noticias más...
                    </p>
                  ` : ''}
                </div>
              </div>
            ` : ''}
            
            ${result.errors && result.errors.length > 0 ? `
              <details style="margin-top: 1rem;">
                <summary style="color: var(--warning); cursor: pointer;"><strong>⚠️ Ver Errores (${result.errors.length})</strong></summary>
                <ul style="max-height: 150px; overflow-y: auto; font-size: 0.85rem; margin-top: 0.5rem;">
                  ${result.errors.slice(0, 5).map(e => `<li>${e.title}: ${e.error}</li>`).join('')}
                </ul>
              </details>
            ` : ''}
          </div>
        `,
        width: '700px',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '✅ Cerrar',
        denyButtonText: '💾 Guardar Config',
        cancelButtonText: '🔄 Ver en Historial',
        confirmButtonColor: '#059669',
        denyButtonColor: '#2563eb',
        cancelButtonColor: '#6b7280'
      }).then((modalResult) => {
        if (modalResult.isDenied) {
          // Guardar configuración para uso futuro
          saveListingConfiguration(url, listingSelectors, articleSelectors);
        } else if (modalResult.dismiss === Swal.DismissReason.cancel) {
          // Ir al historial
          window.location.href = '/scraper.html#historial';
        }
      });
    } else {
      Swal.fire('Error', data.error || 'No se pudo scrapear el listado', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    Swal.fire('Error', 'Error al scrapear listado: ' + error.message, 'error');
  }
}

// Mostrar artículo individual en modal
function showArticleInModal(article) {
  Swal.fire({
    title: article.titulo,
    html: `
      <div style="text-align: left;">
        <div style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">
          ${article.fecha ? `<span>📅 ${article.fecha}</span>` : ''}
          ${article.autor ? `<span>✍️ ${article.autor}</span>` : ''}
          <a href="${article.sourceUrl}" target="_blank" style="color: #2563eb;">🔗 Ver original</a>
        </div>
        
        ${article.imagenes && article.imagenes.length > 0 ? `
          <div style="margin-bottom: 1rem;">
            <img src="${article.imagenes[0]}" alt="Imagen del artículo" 
                 style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px;"
                 onerror="this.style.display='none'">
          </div>
        ` : ''}
        
        <div style="line-height: 1.8; color: #374151;">
          ${article.contenido.split('\n\n').map(p => `<p style="margin-bottom: 1rem;">${p}</p>`).join('')}
        </div>
      </div>
    `,
    width: '800px',
    confirmButtonText: 'Cerrar',
    confirmButtonColor: '#059669'
  });
}

// Guardar configuración de listado en BD
async function saveListingConfiguration(url, listingSelectors, articleSelectors) {
  const domain = new URL(url).hostname.replace('www.', '');
  
  const { value: name } = await Swal.fire({
    title: '💾 Guardar Configuración',
    input: 'text',
    inputLabel: 'Nombre para esta configuración',
    inputValue: domain,
    inputPlaceholder: 'Ej: La Cuarta, BioBioChile',
    showCancelButton: true,
    inputValidator: (value) => {
      if (!value) return 'Debes ingresar un nombre';
    }
  });
  
  if (!name) return;
  
  try {
    console.log('📤 Guardando configuración:', {
      domain,
      name,
      articleSelectors,
      listingSelectors
    });
    
    const response = await authenticatedFetch('/api/site-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: domain,
        name: name,
        selectors: {
          titleSelector: articleSelectors.titleSelector,
          contentSelector: articleSelectors.contentSelector,
          dateSelector: articleSelectors.dateSelector || null,
          authorSelector: articleSelectors.authorSelector || null,
          imageSelector: articleSelectors.imageSelector || null
        },
        listingSelectors: listingSelectors
      })
    });
    
    console.log('📥 Response status:', response.status);
    
    const data = await response.json();
    console.log('📥 Response data:', data);
    
    if (data.success || response.ok) {
      Swal.fire({
        icon: 'success',
        title: '✅ Configuración Guardada',
        html: `
          <p>La configuración se guardó exitosamente en la base de datos.</p>
          <p style="margin-top: 0.5rem;"><strong>Dominio:</strong> ${domain}</p>
          <p><strong>Nombre:</strong> ${name}</p>
          <p style="margin-top: 1rem; color: var(--gray-600); font-size: 0.9rem;">
            Se usará automáticamente la próxima vez que scrapes este dominio.
          </p>
        `,
        confirmButtonText: 'Entendido'
      });
    } else {
      // Verificar si es error de duplicado
      if (data.error && data.error.includes('Ya existe')) {
        Swal.fire({
          icon: 'info',
          title: '⚠️ Configuración Ya Existe',
          html: `
            <p>Ya existe una configuración guardada para <strong>${domain}</strong>.</p>
            <p style="margin-top: 1rem; color: var(--gray-600); font-size: 0.9rem;">
              Se usará automáticamente cuando scrapes este dominio.
            </p>
          `,
          confirmButtonText: 'Entendido'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al Guardar',
          html: `<p>${data.error || 'No se pudo guardar la configuración'}</p>`,
          confirmButtonText: 'Cerrar'
        });
      }
    }
  } catch (error) {
    console.error('❌ Error guardando configuración:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error de Conexión',
      html: `
        <p>No se pudo conectar con el servidor.</p>
        <p style="margin-top: 0.5rem; color: var(--gray-600); font-size: 0.85rem;">
          ${error.message}
        </p>
      `,
      confirmButtonText: 'Cerrar'
    });
  }
}
