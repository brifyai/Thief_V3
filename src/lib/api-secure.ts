// Configuración segura de API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

  // Intentar obtener token desde localStorage
  const token = localStorage.getItem('token');
  
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