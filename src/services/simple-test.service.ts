// Servicio simplificado para test de URLs usando el endpoint /api/simple-test del backend
import { API_BASE_URL } from '../lib/api-secure';

export interface SimpleTestRequest {
  url: string;
}

export interface SimpleTestResponse {
  success: boolean;
  url: string;
  news_count: number;
  preview?: Array<{
    title: string;
    url: string;
    excerpt: string;
  }>;
  method?: string;
  confidence?: number;
  message?: string;
  error?: string;
  suggestions?: string[];
}

class SimpleTestService {
  private getAuthHeaders(): Record<string, string> {
    if (typeof window === 'undefined') {
      return {};
    }

    const token = localStorage.getItem('token');
    
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async testUrl(url: string): Promise<SimpleTestResponse> {
    try {
      // Validar URL
      if (!url || !url.trim()) {
        throw new Error('Por favor ingresa una URL válida');
      }

      // Validar formato de URL
      try {
        new URL(url);
      } catch {
        throw new Error('Por favor ingresa una URL válida (ej: https://ejemplo.com)');
      }

      console.log('🧪 Enviando simple-test para URL:', url);

      const response = await fetch(`${API_BASE_URL}/api/simple-test`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ url: url.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 Respuesta de simple-test:', result);

      return result;
    } catch (error) {
      console.error('Error en simpleTest:', error);
      throw error;
    }
  }

  async testUrlWithSelectors(url: string, selectors: {
    title?: string;
    content?: string;
    date?: string;
    author?: string;
    image?: string;
  }): Promise<SimpleTestResponse> {
    try {
      // Validar URL
      if (!url || !url.trim()) {
        throw new Error('Por favor ingresa una URL válida');
      }

      // Validar selectores requeridos
      if (!selectors.title || !selectors.content) {
        throw new Error('Los selectores de título y contenido son requeridos');
      }

      console.log('🧪 Enviando simple-test con selectores para URL:', url);

      const response = await fetch(`${API_BASE_URL}/api/simple-test/with-selectors`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          url: url.trim(),
          selectors: {
            title: selectors.title,
            content: selectors.content,
            date: selectors.date,
            author: selectors.author,
            image: selectors.image
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 Respuesta de simple-test con selectores:', result);

      return result;
    } catch (error) {
      console.error('Error en testUrlWithSelectors:', error);
      throw error;
    }
  }
}

export const simpleTestService = new SimpleTestService();