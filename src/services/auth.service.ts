import { User } from '@/stores/auth.store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${result.message || response.statusText || 'Error del servidor'}`);
    }

    // Verificar que la respuesta tenga token y usuario (en lugar de result.success)
    if (!result.token || !result.user) {
      throw new Error('Respuesta del servidor inválida: falta token o usuario');
    }

    // Guardar token en localStorage para persistencia
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', result.token);
    }

    // Estructurar la respuesta para compatibilidad
    return {
      success: true,
      token: result.token,
      user: result.user,
      message: result.message || 'Login exitoso'
    };
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${result.message || response.statusText || 'Error del servidor'}`);
    }

    // Verificar que la respuesta tenga token y usuario (en lugar de result.success)
    if (!result.token || !result.user) {
      throw new Error('Respuesta del servidor inválida: falta token o usuario');
    }

    // Guardar token en localStorage para persistencia
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', result.token);
    }

    // Estructurar la respuesta para compatibilidad
    return {
      success: true,
      token: result.token,
      user: result.user,
      message: result.message || 'Registro exitoso'
    };
  } catch (error) {
    console.error('Error en registro:', error);
    throw error;
  }
}

export async function verifyToken(token: string): Promise<{ valid: boolean; user?: User }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return { valid: false };
    }

    const result = await response.json();

    // Si la respuesta tiene un usuario, el token es válido
    if (result.user) {
      return { valid: true, user: result.user };
    }

    return { valid: false };
  } catch (error) {
    console.error('Error en verifyToken:', error);
    return { valid: false };
  }
}

export async function getCurrentUser(token: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    // Si la respuesta tiene un usuario, devolverlo
    if (result.user) {
      return result.user;
    }

    return null;
  } catch (error) {
    console.error('Error en getCurrentUser:', error);
    return null;
  }
}

// Eliminamos refreshToken ya que no está en los endpoints reales