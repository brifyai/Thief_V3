const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
export const API_BASE_URL = BASE_URL;

// Clase de error personalizada para autenticación
export class AuthenticationError extends Error {
  constructor(message: string = 'No authentication token found') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Función segura para obtener headers de autenticación
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {
      'Content-Type': 'application/json',
    };
  }

  let token = null;
  
  // Intentar obtener token desde localStorage primero
  token = localStorage.getItem('token');
  
  // Si no hay token en localStorage, intentar desde el Zustand store
  if (!token) {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed.state?.token;
      }
    } catch (e) {
      console.warn('Error parsing auth-storage:', e);
    }
  }
  
  console.log('🔐 getAuthHeaders - Token found:', !!token, 'Token preview:', token ? token.substring(0, 20) + '...' : 'none');
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

// Función segura para hacer peticiones autenticadas
export async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  try {
    const headers = getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token inválido o expirado
        secureLogout();
        throw new AuthenticationError('Session expired. Please login again.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    console.error('API Request failed:', error);
    throw error;
  }
}

// Función segura para logout
export function secureLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    // Limpiar otros datos sensibles del store de Zustand
    localStorage.removeItem('auth-storage');
    sessionStorage.clear();
  }
}

// Función para verificar si hay token válido
export function hasValidToken(): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('token');
  return !!token && token.length > 0;
}