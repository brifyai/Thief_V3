import { API_BASE_URL } from '../lib/api-secure';

export interface PublicUrl {
  id: number;
  url: string;
  name: string;
  domain: string;
  region?: string;
  is_active: boolean;
  max_news_limit?: number | null;
  available_news_count?: number | null;
  last_tested_at?: string | null;
  created_at: string;
  updated_at: string;
  _count?: {
    selections: number;
  };
}

export interface MyUrl {
  id: number;
  user_id: number;
  public_url_id: number;
  public_url: PublicUrl;
  created_at: string;
}

export interface CreatePublicUrlData {
  url: string;
  name: string;
  domain: string;
  region?: string;
}

export interface UpdatePublicUrlData {
  url?: string;
  name?: string;
  domain?: string;
  region?: string;
  is_active?: boolean;
  max_news_limit?: number | null;
}

export interface SelectUrlData {
  public_url_id: number;
}

// Función auxiliar para obtener headers
function getHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

class UrlsService {

  // ==================== URLs Públicas ====================

  // Obtener todas las URLs públicas
  async getPublicUrls(): Promise<PublicUrl[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/public-urls`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getPublicUrls:', error);
      return [];
    }
  }

  // Obtener URL pública por ID
  async getPublicUrlById(id: number): Promise<PublicUrl | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/public-urls/${id}`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.error('Error en getPublicUrlById:', error);
      return null;
    }
  }

  // Crear nueva URL pública (solo admin)
  async createPublicUrl(data: CreatePublicUrlData): Promise<PublicUrl> {
    try {
      const response = await fetch(`${API_BASE_URL}/public-urls`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error al crear URL pública');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error en createPublicUrl:', error);
      throw error;
    }
  }

  // Actualizar URL pública (solo admin)
  async updatePublicUrl(id: number, data: UpdatePublicUrlData): Promise<PublicUrl> {
    try {
      const response = await fetch(`${API_BASE_URL}/public-urls/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error al actualizar URL pública');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error en updatePublicUrl:', error);
      throw error;
    }
  }

  // Eliminar URL pública (solo admin)
  async deletePublicUrl(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/public-urls/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error al eliminar URL pública');
      }
    } catch (error) {
      console.error('Error en deletePublicUrl:', error);
      throw error;
    }
  }

  // ==================== Selecciones de Usuario ====================

  // Seleccionar URL para el usuario
  async selectUrl(data: SelectUrlData): Promise<MyUrl> {
    try {
      const response = await fetch(`${API_BASE_URL}/my-urls/select`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error al seleccionar URL');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error en selectUrl:', error);
      throw error;
    }
  }

  // Deseleccionar URL
  async deselectUrl(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/my-urls/select/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error al deseleccionar URL');
      }
    } catch (error) {
      console.error('Error en deselectUrl:', error);
      throw error;
    }
  }

  // Obtener URLs seleccionadas por el usuario
  async getMySelectedUrls(): Promise<MyUrl[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/my-urls`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getMySelectedUrls:', error);
      return [];
    }
  }

  // Obtener dominios seleccionados por el usuario
  async getMySelectedDomains(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/my-urls/domains`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getMySelectedDomains:', error);
      return [];
    }
  }

  // ==================== URLs Legacy (Mantenimiento) ====================

  // Mantener compatibilidad con el código existente
  async getSavedUrls(): Promise<PublicUrl[]> {
    return this.getPublicUrls();
  }

  async saveUrl(data: CreatePublicUrlData): Promise<PublicUrl> {
    return this.createPublicUrl(data);
  }

  async deleteUrl(id: number): Promise<void> {
    try {
      await this.deselectUrl(id);
    } catch {
      await this.deletePublicUrl(id);
    }
  }

  // Método utilitario para verificar si una URL está seleccionada
  async isUrlSelected(publicUrlId: number): Promise<boolean> {
    try {
      const myUrls = await this.getMySelectedUrls();
      return myUrls.some(myUrl => myUrl.public_url_id === publicUrlId);
    } catch (error) {
      console.error('Error en isUrlSelected:', error);
      return false;
    }
  }

  // Método utilitario para obtener URLs con estado de selección
  async getPublicUrlsWithSelectionStatus(): Promise<Array<PublicUrl & { isSelected: boolean }>> {
    try {
      const [publicUrls, mySelectedUrls] = await Promise.all([
        this.getPublicUrls(),
        this.getMySelectedUrls()
      ]);

      const selectedIds = new Set(mySelectedUrls.map(myUrl => myUrl.public_url_id));

      return publicUrls.map(url => ({
        ...url,
        isSelected: selectedIds.has(url.id)
      }));
    } catch (error) {
      console.error('Error en getPublicUrlsWithSelectionStatus:', error);
      return [];
    }
  }
}

export const urlsService = new UrlsService();