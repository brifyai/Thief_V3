/**
 * Utilidades de Autenticación JWT
 * Archivo compartido para evitar duplicación de código
 */

/**
 * Realiza un fetch con autenticación JWT
 * @param {string} url - URL del endpoint
 * @param {object} options - Opciones de fetch
 * @returns {Promise<Response>}
 */
function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/';
        return Promise.reject(new Error('No token'));
    }

    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    return fetch(url, options).then(res => {
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
            throw new Error('Sesión expirada');
        }
        return res;
    });
}

/**
 * Cierra sesión del usuario
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

/**
 * Obtiene el usuario actual del localStorage
 * @returns {object|null}
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean}
 */
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

/**
 * Obtiene el rol del usuario actual
 * @returns {string|null}
 */
function getUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}
