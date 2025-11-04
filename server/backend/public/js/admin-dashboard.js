/**
 * Admin Dashboard JavaScript
 * Panel de administración del sistema de scraping
 * Incluye sistema completo de health checks y métricas avanzadas
 */

const API_BASE = '';
let charts = {};
let healthCheckInterval = null;
let metricsUpdateInterval = null;
let systemAlerts = [];

// ========================================
// AUTENTICACIÓN Y VERIFICACIÓN
// ========================================

async function checkAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Token inválido');
        }

        const data = await response.json();
        
        // Verificar que sea admin
        if (data.role !== 'admin') {
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: 'Solo administradores pueden acceder a este panel',
                confirmButtonText: 'Volver'
            }).then(() => {
                window.location.href = '/my-sources.html';
            });
            return false;
        }

        document.getElementById('userName').textContent = data.name || data.email;
        return true;
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return false;
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// ========================================
// TABS
// ========================================

function switchTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Desactivar todos los botones
    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activar tab seleccionado
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
    
    // Cargar datos del tab
    switch(tabName) {
        case 'overview':
            loadOverview();
            break;
        case 'cache':
            loadCacheStats();
            break;
        case 'cleanup':
            loadCleanupStats();
            break;
        case 'metrics':
            loadMetrics();
            break;
        case 'system':
            loadSystemConfig();
            break;
    }
}

// ========================================
// OVERVIEW TAB
// ========================================

async function loadOverview() {
    await Promise.all([
        checkSystemHealth(),
        loadQuickStats(),
        loadRealTimeMetrics()
    ]);
}

// ========================================
// HEALTH CHECKS AVANZADOS
// ========================================

async function checkSystemHealth() {
    const token = localStorage.getItem('token');
    
    try {
        // Usar el nuevo endpoint de health checks completo
        const response = await fetch(`${API_BASE}/api/metrics/health`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.data) {
            updateHealthIndicators(data.data);
            checkSystemAlerts(data.data);
        }
    } catch (error) {
        console.error('Error verificando salud del sistema:', error);
        showSystemError();
    }
}

function updateHealthIndicators(healthData) {
    // Actualizar indicadores individuales
    updateServiceStatus('redis-status', healthData.checks?.redis);
    updateServiceStatus('db-status', healthData.checks?.database);
    updateServiceStatus('groq-status', healthData.checks?.groq_api);
    updateServiceStatus('filesystem-status', healthData.checks?.filesystem);
    
    // Actualizar estado general del sistema
    updateOverallSystemStatus(healthData.status, healthData.summary);
}

function updateServiceStatus(elementId, serviceData) {
    const element = document.getElementById(elementId);
    if (!element || !serviceData) return;
    
    const status = serviceData.status;
    const responseTime = serviceData.responseTime || 0;
    
    let statusClass, statusText, statusIcon;
    
    switch (status) {
        case 'healthy':
            statusClass = 'status-indicator healthy';
            statusText = `Operativo (${responseTime}ms)`;
            statusIcon = '✅';
            break;
        case 'unhealthy':
            statusClass = 'status-indicator error';
            statusText = `Error (${serviceData.error || 'Sin conexión'})`;
            statusIcon = '❌';
            break;
        case 'skipped':
            statusClass = 'status-indicator warning';
            statusText = 'No configurado';
            statusIcon = '⚠️';
            break;
        default:
            statusClass = 'status-indicator warning';
            statusText = 'Desconocido';
            statusIcon = '❓';
    }
    
    element.className = statusClass;
    element.innerHTML = `<span class="status-dot"></span> ${statusText}`;
}

function updateOverallSystemStatus(status, summary) {
    // Actualizar indicador general en el header si existe
    const overallStatus = document.getElementById('overall-system-status');
    if (overallStatus && summary) {
        const percentage = summary.percentage || 0;
        let statusClass, statusText;
        
        if (status === 'healthy') {
            statusClass = 'badge success';
            statusText = `Sistema Saludable (${percentage}%)`;
        } else if (status === 'degraded') {
            statusClass = 'badge warning';
            statusText = `Sistema Degradado (${percentage}%)`;
        } else {
            statusClass = 'badge error';
            statusText = `Sistema Crítico (${percentage}%)`;
        }
        
        overallStatus.className = statusClass;
        overallStatus.textContent = statusText;
    }
}

function checkSystemAlerts(healthData) {
    systemAlerts = [];
    
    // Verificar servicios críticos
    if (healthData.checks?.database?.status === 'unhealthy') {
        systemAlerts.push({
            type: 'error',
            title: 'Base de Datos Caída',
            message: 'La base de datos no está disponible. El sistema puede no funcionar correctamente.',
            action: 'Verificar conexión a BD'
        });
    }
    
    if (healthData.checks?.redis?.status === 'unhealthy') {
        systemAlerts.push({
            type: 'warning',
            title: 'Redis No Disponible',
            message: 'El caché de Redis no está disponible. El rendimiento puede verse afectado.',
            action: 'Verificar servicio Redis'
        });
    }
    
    if (healthData.checks?.groq_api?.status === 'unhealthy') {
        systemAlerts.push({
            type: 'warning',
            title: 'API de IA No Disponible',
            message: 'La API de Groq no responde. Las funciones de IA estarán deshabilitadas.',
            action: 'Verificar API key y conexión'
        });
    }
    
    // Mostrar alertas si existen
    if (systemAlerts.length > 0) {
        showSystemAlerts();
    }
}

function showSystemAlerts() {
    // Ocultar alertas anteriores
    const existingAlerts = document.querySelectorAll('.system-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Mostrar nuevas alertas
    const header = document.querySelector('.app-header');
    systemAlerts.forEach((alert, index) => {
        const alertElement = document.createElement('div');
        alertElement.className = `system-alert alert alert-${alert.type}`;
        alertElement.style.cssText = `
            position: fixed;
            top: ${80 + (index * 60)}px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: var(--shadow-lg);
        `;
        
        alertElement.innerHTML = `
            <div class="alert-icon">${alert.type === 'error' ? '🚨' : '⚠️'}</div>
            <div class="alert-content">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-message">${alert.message}</div>
                <button class="btn btn-sm btn-ghost" onclick="dismissAlert(this)">
                    ${alert.action}
                </button>
            </div>
        `;
        
        document.body.appendChild(alertElement);
        
        // Auto-eliminar después de 10 segundos
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.remove();
            }
        }, 10000);
    });
}

function dismissAlert(button) {
    const alert = button.closest('.system-alert');
    if (alert) {
        alert.remove();
    }
}

function showSystemError() {
    // Mostrar estado de error para todos los servicios
    const services = ['redis-status', 'db-status', 'cleanup-status'];
    services.forEach(serviceId => {
        const element = document.getElementById(serviceId);
        if (element) {
            element.className = 'status-indicator error';
            element.innerHTML = '<span class="status-dot"></span> Error de conexión';
        }
    });
}

// ========================================
// MÉTRICAS EN TIEMPO REAL
// ========================================

async function loadRealTimeMetrics() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE}/api/metrics/realtime`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.data) {
            updateRealTimeMetrics(data.data);
        }
    } catch (error) {
        console.error('Error cargando métricas en tiempo real:', error);
    }
}

function updateRealTimeMetrics(metrics) {
    // Actualizar uptime del sistema
    const uptimeElement = document.getElementById('system-uptime');
    if (uptimeElement && metrics.uptime) {
        uptimeElement.textContent = metrics.uptime;
    }
    
    // Actualizar métricas del detector de duplicados
    if (metrics.duplicateDetector) {
        updateDuplicateDetectorMetrics(metrics.duplicateDetector);
    }
}

function updateDuplicateDetectorMetrics(detectorMetrics) {
    const checkedElement = document.getElementById('duplicate-checked');
    const duplicatesElement = document.getElementById('duplicate-found');
    const rateElement = document.getElementById('duplicate-rate');
    
    if (checkedElement) checkedElement.textContent = detectorMetrics.checked || 0;
    if (duplicatesElement) duplicatesElement.textContent = detectorMetrics.duplicatesFound || 0;
    if (rateElement) rateElement.textContent = `${detectorMetrics.duplicateRate || 0}%`;
}

async function loadQuickStats() {
    const token = localStorage.getItem('token');
    
    try {
        // Stats de limpieza (tiene info de BD)
        const cleanupResponse = await fetch(`${API_BASE}/api/cleanup/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cleanupData = await cleanupResponse.json();
        
        const totalNewsEl = document.getElementById('total-news');
        if (totalNewsEl && cleanupData.data && cleanupData.data.totalNews !== undefined) {
            totalNewsEl.textContent = cleanupData.data.totalNews.toLocaleString();
        } else if (totalNewsEl) {
            totalNewsEl.textContent = '0';
        }
        
        // URLs públicas
        const urlsResponse = await fetch(`${API_BASE}/api/public-urls`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const urlsData = await urlsResponse.json();
        
        const totalUrlsEl = document.getElementById('total-urls');
        if (totalUrlsEl && urlsData.data && Array.isArray(urlsData.data)) {
            totalUrlsEl.textContent = urlsData.data.length.toLocaleString();
        } else if (totalUrlsEl) {
            totalUrlsEl.textContent = '0';
        }
        
        // Configuraciones CSS
        try {
            const configsResponse = await fetch(`${API_BASE}/api/site-configs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const configsData = await configsResponse.json();
            const totalConfigsEl = document.getElementById('total-configs');
            if (totalConfigsEl && configsData.data && Array.isArray(configsData.data)) {
                totalConfigsEl.textContent = configsData.data.length.toLocaleString();
            } else if (totalConfigsEl) {
                totalConfigsEl.textContent = '0';
            }
        } catch (error) {
            const totalConfigsEl = document.getElementById('total-configs');
            if (totalConfigsEl) totalConfigsEl.textContent = '0';
        }
        
        // Artículos guardados (total del sistema)
        try {
            const savedResponse = await fetch(`${API_BASE}/api/saved-articles/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const savedData = await savedResponse.json();
            const totalSavedEl = document.getElementById('total-saved');
            if (totalSavedEl && savedData.total !== undefined) {
                totalSavedEl.textContent = savedData.total.toLocaleString();
            } else if (totalSavedEl) {
                totalSavedEl.textContent = '0';
            }
        } catch (error) {
            const totalSavedEl = document.getElementById('total-saved');
            if (totalSavedEl) totalSavedEl.textContent = '0';
        }
        
        // Cache hit rate
        const cacheResponse = await fetch(`${API_BASE}/api/cache/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cacheData = await cacheResponse.json();
        
        const cacheHitrateEl = document.getElementById('cache-hitrate');
        if (cacheHitrateEl && cacheData.data) {
            cacheHitrateEl.textContent = cacheData.data.hitRate || '0%';
        } else if (cacheHitrateEl) {
            cacheHitrateEl.textContent = '0%';
        }
        
    } catch (error) {
        console.error('Error cargando estadísticas rápidas:', error);
        // Setear valores por defecto
        const elements = ['total-news', 'total-urls', 'total-configs', 'total-saved'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
        const cacheEl = document.getElementById('cache-hitrate');
        if (cacheEl) cacheEl.textContent = '0%';
    }
}


// ========================================
// CACHE TAB
// ========================================

async function loadCacheStats() {
    await refreshCacheStats();
}

async function refreshCacheStats() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE}/api/cache/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        const stats = data.data;
        
        document.getElementById('cache-total-keys').textContent = 
            (stats.totalKeys || 0).toLocaleString();
        document.getElementById('cache-hits').textContent = 
            (stats.hits || 0).toLocaleString();
        document.getElementById('cache-misses').textContent = 
            (stats.misses || 0).toLocaleString();
        document.getElementById('cache-hit-rate').textContent = 
            stats.hitRate || '0%';
        
        // Cargar tabla de keys
        await loadCacheKeysTable();
        
    } catch (error) {
        console.error('Error cargando estadísticas de caché:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar las estadísticas de caché'
        });
    }
}

async function loadCacheKeysTable() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('cache-keys-table');
    
    try {
        const response = await fetch(`${API_BASE}/api/cache/keys?pattern=*`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        const patterns = {
            'search:*': 'Búsquedas',
            'scrape:*': 'Scraping',
            'stats:*': 'Estadísticas',
            'filters:*': 'Filtros',
            'results:*': 'Resultados'
        };
        
        tbody.innerHTML = '';
        
        for (const [pattern, name] of Object.entries(patterns)) {
            const count = data.data.keys.filter(k => {
                const p = pattern.replace('*', '');
                return k.startsWith(p);
            }).length;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${name}</td>
                <td><span class="badge info">${count} keys</span></td>
                <td>
                    <button onclick="clearCachePattern('${pattern}')" class="btn btn-sm btn-danger">
                        🗑️ Limpiar
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
        
    } catch (error) {
        console.error('Error cargando tabla de keys:', error);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #dc2626;">Error cargando datos</td></tr>';
    }
}

async function clearAllCache() {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esto eliminará TODO el caché del sistema',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, limpiar todo',
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE}/api/cache/clear`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Caché Limpiado',
                text: 'Todo el caché ha sido eliminado exitosamente',
                timer: 2000
            });
            await refreshCacheStats();
        } else {
            throw new Error('Error limpiando caché');
        }
    } catch (error) {
        console.error('Error limpiando caché:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo limpiar el caché'
        });
    }
}

async function clearScrapingCache() {
    const result = await Swal.fire({
        title: '¿Limpiar caché de scraping?',
        text: 'Esto eliminará el caché de todos los scrapings',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d97706',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, limpiar',
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    await clearCachePattern('scrape:*');
}

async function clearCachePattern(pattern) {
    const token = localStorage.getItem('token');
    
    try {
        // Obtener keys que coincidan con el patrón
        const keysResponse = await fetch(`${API_BASE}/api/cache/keys?pattern=${pattern}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const keysData = await keysResponse.json();
        
        // Eliminar cada key
        for (const key of keysData.data.keys) {
            await fetch(`${API_BASE}/api/cache/key/${encodeURIComponent(key)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
        
        Swal.fire({
            icon: 'success',
            title: 'Caché Limpiado',
            text: `${keysData.data.keys.length} keys eliminadas`,
            timer: 2000
        });
        
        await refreshCacheStats();
    } catch (error) {
        console.error('Error limpiando patrón de caché:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo limpiar el caché'
        });
    }
}

// ========================================
// CLEANUP TAB
// ========================================

async function loadCleanupStats() {
    await refreshCleanupStats();
}

async function refreshCleanupStats() {
    const token = localStorage.getItem('token');
    
    try {
        // Config
        const configResponse = await fetch(`${API_BASE}/api/cleanup/config`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const configData = await configResponse.json();
        
        if (configData.data) {
            const config = configData.data;
            const enabledEl = document.getElementById('cleanup-enabled');
            if (enabledEl) {
                enabledEl.textContent = config.enabled ? 'Habilitado' : 'Deshabilitado';
                enabledEl.className = config.enabled ? 'badge success' : 'badge warning';
            }
            const retentionEl = document.getElementById('cleanup-retention');
            if (retentionEl) retentionEl.textContent = `${config.retentionDays || 30} días`;
            
            const scheduleEl = document.getElementById('cleanup-schedule');
            if (scheduleEl) scheduleEl.textContent = config.schedule || 'N/A';
            
            const timezoneEl = document.getElementById('cleanup-timezone');
            if (timezoneEl) timezoneEl.textContent = config.timezone || 'UTC';
        }
        
        // Stats
        const statsResponse = await fetch(`${API_BASE}/api/cleanup/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData = await statsResponse.json();
        
        if (statsData.data) {
            const stats = statsData.data;
            const totalNewsEl = document.getElementById('cleanup-total-news');
            if (totalNewsEl && stats.totalNews !== undefined) {
                totalNewsEl.textContent = stats.totalNews.toLocaleString();
            } else if (totalNewsEl) {
                totalNewsEl.textContent = '0';
            }
        }
        
        // Expiring
        const expiringResponse = await fetch(`${API_BASE}/api/cleanup/expiring?days=7`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const expiringData = await expiringResponse.json();
        
        const expiringEl = document.getElementById('cleanup-expiring');
        if (expiringEl && expiringData.data && expiringData.data.count !== undefined) {
            expiringEl.textContent = expiringData.data.count.toLocaleString();
        } else if (expiringEl) {
            expiringEl.textContent = '0';
        }
        
        // Placeholder para última limpieza y espacio
        const lastRunEl = document.getElementById('cleanup-last-run');
        if (lastRunEl) lastRunEl.textContent = 'N/A';
        
        const spaceSavedEl = document.getElementById('cleanup-space-saved');
        if (spaceSavedEl) spaceSavedEl.textContent = 'N/A';
        
    } catch (error) {
        console.error('Error cargando estadísticas de limpieza:', error);
        // Setear valores por defecto
        const elements = {
            'cleanup-total-news': '0',
            'cleanup-expiring': '0',
            'cleanup-last-run': 'N/A',
            'cleanup-space-saved': 'N/A',
            'cleanup-retention': '30 días',
            'cleanup-schedule': 'N/A',
            'cleanup-timezone': 'UTC'
        };
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }
}

async function runCleanup() {
    const result = await Swal.fire({
        title: '¿Ejecutar limpieza?',
        text: 'Esto eliminará noticias antiguas según la configuración',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, ejecutar',
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    const token = localStorage.getItem('token');
    
    try {
        Swal.fire({
            title: 'Ejecutando limpieza...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        const response = await fetch(`${API_BASE}/api/cleanup/run`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Limpieza Completada',
                html: `
                    <p><strong>${data.data.deleted}</strong> noticias eliminadas</p>
                    <p>Tiempo: ${(data.data.duration / 1000).toFixed(2)}s</p>
                `
            });
            await refreshCleanupStats();
        } else {
            throw new Error(data.error || 'Error en la limpieza');
        }
    } catch (error) {
        console.error('Error ejecutando limpieza:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo ejecutar la limpieza'
        });
    }
}

// ========================================
// METRICS TAB
// ========================================

async function loadMetrics() {
    await refreshAdvancedMetrics();
}

async function refreshAdvancedMetrics() {
    const token = localStorage.getItem('token');
    const days = document.getElementById('metrics-days').value;
    
    try {
        const response = await fetch(`${API_BASE}/api/metrics/all?days=${days}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.data) {
            const metrics = data.data;
            
            // Actualizar todas las secciones de métricas
            updateGeneralMetrics(metrics.general);
            updateAIMetrics(metrics.ai);
            updateDuplicateMetrics(metrics.duplicates);
            updateTitleMetrics(metrics.titles);
            updateCategorizationMetrics(metrics.categorization);
            updateDomainMetrics(metrics.domains);
            
            // Actualizar gráficos
            updateMetricsCharts(metrics);
        }
    } catch (error) {
        console.error('Error cargando métricas avanzadas:', error);
        showMetricsError();
    }
}

function updateGeneralMetrics(general) {
    if (!general) return;
    
    // Tasa de éxito
    const successRate = general.successRate || '0%';
    document.getElementById('metrics-success-rate').textContent = successRate;
    document.getElementById('metrics-success-count').textContent =
        `${general.successCount || 0} exitosos de ${general.totalArticles || 0} totales`;
    
    // Promedio diario
    const dailyAvg = general.avgPerDay || 0;
    document.getElementById('metrics-daily-avg').textContent = dailyAvg.toLocaleString();
    
    // Estadísticas de fallos
    const failureRate = general.failureCount ?
        ((general.failureCount / general.totalArticles) * 100).toFixed(1) : '0';
    document.getElementById('metrics-failure-rate').textContent = `${failureRate}%`;
}

function updateAIMetrics(ai) {
    if (!ai) return;
    
    document.getElementById('metrics-ai-calls').textContent =
        (ai.aiUsedCount || 0).toLocaleString();
    document.getElementById('metrics-ai-tokens').textContent =
        `${(ai.totalTokens || 0).toLocaleString()} tokens`;
    document.getElementById('metrics-ai-cost').textContent = ai.estimatedCost || '$0';
    document.getElementById('metrics-ai-usage-rate').textContent = ai.aiUsageRate || '0%';
}

function updateDuplicateMetrics(duplicates) {
    if (!duplicates) return;
    
    document.getElementById('duplicate-checked').textContent =
        (duplicates.articlesWithHash || 0).toLocaleString();
    document.getElementById('duplicate-found').textContent =
        duplicates.detectorStats?.duplicatesFound || 0;
    document.getElementById('duplicate-rate').textContent =
        duplicates.detectorStats?.duplicateRate || '0%';
    document.getElementById('duplicate-coverage').textContent = duplicates.hashCoverage || '0%';
}

function updateTitleMetrics(titles) {
    if (!titles) return;
    
    document.getElementById('title-ai-usage').textContent = titles.aiUsageRate || '0%';
    document.getElementById('title-total').textContent = (titles.totalArticles || 0).toLocaleString();
    
    // Actualizar distribución de fuentes de títulos
    if (titles.distribution && titles.distribution.length > 0) {
        updateTitleSourceChart(titles.distribution);
    }
}

function updateCategorizationMetrics(categorization) {
    if (!categorization) return;
    
    document.getElementById('cat-ai-usage').textContent = categorization.aiUsageRate || '0%';
    document.getElementById('cat-total').textContent = (categorization.totalArticles || 0).toLocaleString();
    
    // Actualizar gráfico de categorías
    if (categorization.categoryDistribution && categorization.categoryDistribution.length > 0) {
        updateCategoryChart(categorization.categoryDistribution);
    }
}

function updateDomainMetrics(domains) {
    if (!domains) return;
    
    document.getElementById('metrics-domains').textContent =
        (domains.totalDomains || 0).toLocaleString();
    document.getElementById('metrics-domain-articles').textContent =
        (domains.totalArticles || 0).toLocaleString();
    
    // Actualizar gráfico de dominios
    if (domains.distribution && domains.distribution.length > 0) {
        updateDomainChart(domains.distribution);
    }
}

function updateMetricsCharts(metrics) {
    // Destruir gráficos existentes
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    // Crear nuevos gráficos
    if (metrics.titles?.distribution) {
        createTitleSourceChart(metrics.titles.distribution);
    }
    
    if (metrics.categorization?.categoryDistribution) {
        createCategoryChart(metrics.categorization.categoryDistribution);
    }
    
    if (metrics.domains?.distribution) {
        createDomainChart(metrics.domains.distribution);
    }
    
    if (metrics.general) {
        createSuccessRateChart(metrics.general);
    }
}

function createTitleSourceChart(distribution) {
    const ctx = document.getElementById('titleSourceChart');
    if (!ctx) return;
    
    charts.titleSource = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: distribution.map(d => d.source),
            datasets: [{
                data: distribution.map(d => d.count),
                backgroundColor: [
                    '#2563eb',
                    '#059669',
                    '#d97706',
                    '#dc2626',
                    '#7c3aed'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createCategoryChart(categoryDistribution) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    charts.category = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categoryDistribution.map(c => c.category),
            datasets: [{
                label: 'Artículos por Categoría',
                data: categoryDistribution.map(c => c.count),
                backgroundColor: '#059669'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createDomainChart(domainDistribution) {
    const ctx = document.getElementById('domainMetricsChart');
    if (!ctx) return;
    
    charts.domains = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: domainDistribution.map(d => d.domain),
            datasets: [{
                label: 'Artículos por Dominio',
                data: domainDistribution.map(d => d.count),
                backgroundColor: '#2563eb'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createSuccessRateChart(general) {
    const ctx = document.getElementById('successRateChart');
    if (!ctx) return;
    
    charts.successRate = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Exitosos', 'Fallidos'],
            datasets: [{
                data: [general.successCount || 0, general.failureCount || 0],
                backgroundColor: ['#059669', '#dc2626']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function showMetricsError() {
    const errorElements = [
        'metrics-success-rate', 'metrics-success-count', 'metrics-daily-avg',
        'metrics-ai-calls', 'metrics-ai-tokens', 'metrics-domains'
    ];
    
    errorElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = 'Error';
    });
}

function loadDomainChart(domainData) {
    const ctx = document.getElementById('domainMetricsChart');
    
    if (charts.domains) {
        charts.domains.destroy();
    }
    
    const labels = domainData.map(d => d.domain);
    const data = domainData.map(d => d.count);
    
    charts.domains = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Artículos por Dominio',
                data: data,
                backgroundColor: '#2563eb'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// ========================================
// SYSTEM TAB
// ========================================

async function loadSystemConfig() {
    const token = localStorage.getItem('token');
    
    try {
        // Configuración de limpieza
        const cleanupResponse = await fetch(`${API_BASE}/api/cleanup/config`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cleanupData = await cleanupResponse.json();
        
        const cleanup = cleanupData.data;
        document.getElementById('cleanup-enabled-sys').textContent = cleanup.enabled ? 'Habilitado' : 'Deshabilitado';
        document.getElementById('cleanup-enabled-sys').className = cleanup.enabled ? 'badge success' : 'badge warning';
        document.getElementById('cleanup-retention-sys').textContent = cleanup.retentionDays;
        document.getElementById('cleanup-schedule-sys').textContent = cleanup.schedule;
        document.getElementById('cleanup-timezone-sys').textContent = cleanup.timezone;
        
        // Configuración de scraping (desde .env - hardcoded por ahora)
        document.getElementById('scraping-enabled').textContent = 'Habilitado';
        document.getElementById('scraping-enabled').className = 'badge success';
        document.getElementById('scraping-concurrency').textContent = '5';
        document.getElementById('scraping-cache-ttl').textContent = '3600';
        document.getElementById('paywall-detection').textContent = 'Habilitado';
        document.getElementById('paywall-detection').className = 'badge success';
        
        // Stats de caché
        const cacheResponse = await fetch(`${API_BASE}/api/cache/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cacheData = await cacheResponse.json();
        
        const cache = cacheData.data;
        document.getElementById('sys-cache-keys').textContent = (cache.totalKeys || 0).toLocaleString();
        document.getElementById('sys-cache-hitrate').textContent = cache.hitRate || '0%';
        document.getElementById('sys-cache-hits').textContent = (cache.hits || 0).toLocaleString();
        document.getElementById('sys-cache-misses').textContent = (cache.misses || 0).toLocaleString();
        
    } catch (error) {
        console.error('Error cargando configuración del sistema:', error);
    }
}

// ========================================
// ACTUALIZACIÓN AUTOMÁTICA
// ========================================

function startAutoRefresh() {
    // Limpiar intervalos existentes
    stopAutoRefresh();
    
    // Health checks cada 30 segundos
    healthCheckInterval = setInterval(() => {
        checkSystemHealth();
    }, 30000);
    
    // Métricas cada 60 segundos
    metricsUpdateInterval = setInterval(() => {
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            const tabName = activeTab.textContent.toLowerCase();
            if (tabName.includes('resumen')) {
                loadOverview();
            } else if (tabName.includes('estadísticas')) {
                refreshAdvancedMetrics();
            } else if (tabName.includes('caché')) {
                refreshCacheStats();
            }
        }
    }, 60000);
}

function stopAutoRefresh() {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
    }
    
    if (metricsUpdateInterval) {
        clearInterval(metricsUpdateInterval);
        metricsUpdateInterval = null;
    }
}

// ========================================
// UTILIDADES ADICIONALES
// ========================================

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function showLoadingState(elementIds) {
    elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '<span class="loading-spinner"></span>';
        }
    });
}

function hideLoadingState(elementIds) {
    elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const spinner = element.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    });
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;
    
    // Cargar tab inicial
    await loadOverview();
    
    // Iniciar actualización automática
    startAutoRefresh();
    
    // Limpiar intervalos al salir de la página
    window.addEventListener('beforeunload', () => {
        stopAutoRefresh();
    });
    
    // Pausar actualización cuando la pestaña no está visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoRefresh();
        } else {
            startAutoRefresh();
        }
    });
});

// Exportar funciones para uso global
window.adminDashboard = {
    checkSystemHealth,
    refreshAdvancedMetrics,
    startAutoRefresh,
    stopAutoRefresh,
    dismissAlert,
    formatBytes,
    formatDuration
};
