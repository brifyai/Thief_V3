// ========================================
// ARTICLE READER - Lógica
// ========================================

const API_URL = window.location.origin;
let currentArticleId = null;
let currentFontSize = 'normal';

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Obtener ID del artículo desde URL
    const urlParams = new URLSearchParams(window.location.search);
    currentArticleId = urlParams.get('id');

    if (!currentArticleId) {
        showError('No se especificó un artículo para leer');
        return;
    }

    // Cargar artículo
    await loadArticle(currentArticleId);

    // Configurar scroll progress
    window.addEventListener('scroll', updateReadingProgress);

    // Restaurar preferencias
    restorePreferences();
});

// ========================================
// CARGAR ARTÍCULO
// ========================================

async function loadArticle(id) {
    try {
        const response = await authenticatedFetch(`${API_URL}/api/scraping/content/${id}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Error al cargar contenido');
        }

        const data = result.data;
        displayArticle(data);

    } catch (error) {
        console.error('Error al cargar artículo:', error);
        showError(error.message || 'No se pudo cargar el artículo');
    }
}

// ========================================
// MOSTRAR ARTÍCULO
// ========================================

function displayArticle(data) {
    // Parsear contenido
    let parsedContent = data;
    if (typeof data.content === 'string') {
        try {
            parsedContent = JSON.parse(data.content);
        } catch (e) {
            parsedContent = { 
                titulo: data.title || 'Sin título',
                contenido: data.cleaned_content || data.content || 'No hay contenido disponible'
            };
        }
    }

    const titulo = parsedContent.titulo || data.title || 'Sin título';
    const contenidoRaw = parsedContent.contenido || data.cleaned_content || 'No hay contenido disponible';

    // Metadata tags
    const metaTags = document.getElementById('metaTags');
    metaTags.innerHTML = '';
    
    if (data.category) {
        metaTags.innerHTML += `<span class="tag-category">🏷️ ${data.category}</span>`;
    }
    if (data.region) {
        metaTags.innerHTML += `<span class="tag-region">📍 ${data.region}</span>`;
    }
    if (data.domain) {
        metaTags.innerHTML += `<span class="tag-domain">🌐 ${data.domain}</span>`;
    }

    // Metadata info
    const metaInfo = document.getElementById('metaInfo');
    const scrapedDate = new Date(data.scraped_at);
    metaInfo.textContent = `Scrapeado el ${scrapedDate.toLocaleDateString('es-CL', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })}`;

    // Título
    document.getElementById('articleTitle').textContent = titulo;
    document.title = titulo;

    // Info adicional
    const wordCount = contenidoRaw.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 palabras por minuto
    document.getElementById('readingTime').textContent = `⏱️ ${readingTime} min de lectura`;
    document.getElementById('articleDate').textContent = `📅 ${scrapedDate.toLocaleDateString('es-CL')}`;
    
    const originalLink = document.getElementById('originalLink');
    const url = data.url || data.saved_urls?.url || data.public_url?.url || '#';
    originalLink.href = url;
    if (url === '#') {
        originalLink.style.display = 'none';
    }

    // Contenido formateado
    const articleBody = document.getElementById('articleBody');
    articleBody.innerHTML = formatContent(contenidoRaw);

    // Mostrar artículo
    document.getElementById('loading').style.display = 'none';
    document.getElementById('articleContent').style.display = 'block';
}

// ========================================
// FORMATEAR CONTENIDO
// ========================================

function formatContent(content) {
    // Dividir por doble salto de línea
    const parrafos = content.split('\n\n').filter(p => p.trim().length > 0);
    
    return parrafos.map(parrafo => {
        const trimmed = parrafo.trim();
        
        // Detectar subtítulos (cortos, sin punto final, en mayúsculas o con formato especial)
        if (trimmed.length < 100 && !trimmed.endsWith('.') && !trimmed.endsWith(',')) {
            // Si está en mayúsculas o empieza con número
            if (trimmed === trimmed.toUpperCase() || /^\d+\./.test(trimmed)) {
                return `<h2>${trimmed}</h2>`;
            }
            // Si es relativamente corto y parece título
            if (trimmed.length < 60) {
                return `<h3>${trimmed}</h3>`;
            }
        }
        
        // Detectar listas
        if (/^[-•*]\s/.test(trimmed)) {
            const items = trimmed.split('\n').map(line => {
                const cleaned = line.replace(/^[-•*]\s/, '').trim();
                return cleaned ? `<li>${cleaned}</li>` : '';
            }).filter(Boolean).join('');
            return `<ul>${items}</ul>`;
        }
        
        // Detectar listas numeradas
        if (/^\d+\.\s/.test(trimmed)) {
            const items = trimmed.split('\n').map(line => {
                const cleaned = line.replace(/^\d+\.\s/, '').trim();
                return cleaned ? `<li>${cleaned}</li>` : '';
            }).filter(Boolean).join('');
            return `<ol>${items}</ol>`;
        }
        
        // Párrafo normal
        return `<p>${trimmed}</p>`;
    }).join('');
}

// ========================================
// BARRA DE PROGRESO
// ========================================

function updateReadingProgress() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = window.scrollY;
    const progress = (scrolled / documentHeight) * 100;
    
    document.getElementById('reading-progress').style.width = `${Math.min(progress, 100)}%`;
}

// ========================================
// AJUSTAR TAMAÑO DE FUENTE
// ========================================

function adjustFontSize(direction) {
    const sizes = ['small', 'normal', 'large'];
    let currentIndex = sizes.indexOf(currentFontSize);
    
    if (direction === -1 && currentIndex > 0) {
        currentIndex--;
    } else if (direction === 1 && currentIndex < sizes.length - 1) {
        currentIndex++;
    } else if (direction === 0) {
        currentIndex = 1; // normal
    }
    
    currentFontSize = sizes[currentIndex];
    document.body.setAttribute('data-font-size', currentFontSize);
    
    // Guardar preferencia
    localStorage.setItem('reader-font-size', currentFontSize);
}

// ========================================
// MODO OSCURO
// ========================================

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Actualizar botón
    const btn = document.getElementById('darkModeBtn');
    btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    
    // Guardar preferencia
    localStorage.setItem('reader-theme', newTheme);
}

// ========================================
// RESTAURAR PREFERENCIAS
// ========================================

function restorePreferences() {
    // Tamaño de fuente
    const savedFontSize = localStorage.getItem('reader-font-size');
    if (savedFontSize) {
        currentFontSize = savedFontSize;
        document.body.setAttribute('data-font-size', currentFontSize);
    }
    
    // Tema
    const savedTheme = localStorage.getItem('reader-theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        const btn = document.getElementById('darkModeBtn');
        btn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

// ========================================
// ACCIONES
// ========================================

function goBack() {
    // Volver a la página de búsqueda
    if (document.referrer && document.referrer.includes('ai-search')) {
        window.history.back();
    } else {
        window.location.href = '/ai-search.html';
    }
}

function printArticle() {
    window.print();
}

async function shareArticle() {
    const title = document.getElementById('articleTitle').textContent;
    const url = window.location.href;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                url: url
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                copyToClipboard(url);
            }
        }
    } else {
        copyToClipboard(url);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Enlace copiado al portapapeles');
    }).catch(() => {
        alert('❌ No se pudo copiar el enlace');
    });
}

async function saveArticle() {
    if (!currentArticleId) return;
    
    const notes = prompt('Agregar notas (opcional):');
    if (notes === null) return; // Usuario canceló
    
    const tags = prompt('Agregar etiquetas separadas por comas (opcional):');
    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    
    try {
        const response = await authenticatedFetch(`${API_URL}/api/saved-articles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scraping_result_id: parseInt(currentArticleId),
                notes: notes || '',
                tags: tagsArray
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('✅ Artículo guardado exitosamente');
        } else if (response.status === 409) {
            alert('ℹ️ Este artículo ya está guardado en tus favoritos');
        } else {
            throw new Error(result.error || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error al guardar artículo:', error);
        alert('❌ Error al guardar el artículo');
    }
}

// ========================================
// ERROR
// ========================================

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('errorText').textContent = message;
}

// ========================================
// AUTHENTICATED FETCH
// ========================================

async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/';
        throw new Error('No hay sesión activa');
    }
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        throw new Error('Sesión expirada');
    }
    
    return response;
}
