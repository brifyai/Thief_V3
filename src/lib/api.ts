// Cliente API mejorado con manejo de errores
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api`;

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function getAuthHeaders() {
  if (typeof window === 'undefined') {
    return {
      'Content-Type': 'application/json',
    };
  }

  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    // Si la respuesta no es OK, devolver error
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Intentar parsear como JSON
    try {
      const data = await response.json();
      return {
        success: true,
        data: data.data || data,
      };
    } catch (e) {
      // Si no es JSON válido, devolver error
      return {
        success: false,
        error: 'Respuesta inválida del servidor',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export { API_BASE_URL };