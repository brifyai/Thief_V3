import { API_BASE_URL, getAuthHeaders, apiRequest } from '@/lib/api-secure';
import type {
  Entity,
  EntityMention,
  EntityStats,
  EntityAlert,
  CreateEntityInput,
  EntityTimeline,
  AnalyzeResponse,
  EntityType,
  SentimentType,
  AlertSeverity
} from '@/types/entities';

// Interfaces para filtros y opciones
export interface EntitiesFilter {
  type?: EntityType | 'ALL';
  is_active?: boolean;
  search?: string;
}

export interface MentionsFilter {
  sentiment?: SentimentType | 'ALL';
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface AnalyzeOptions {
  days?: number;
  limit?: number;
}

export interface TimelineOptions {
  days?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Clase de servicio para entidades
class EntityService {
  private baseUrl = `${API_BASE_URL}/entities`;

  // Obtener todas las entidades con filtros opcionales
  async getEntities(filters?: EntitiesFilter): Promise<Entity[]> {
    const params = new URLSearchParams();
    
    if (filters?.type && filters.type !== 'ALL') {
      params.append('type', filters.type);
    }
    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }

    const url = params.toString() ? `${this.baseUrl}?${params.toString()}` : this.baseUrl;
    
    try {
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data || [] : [];
    } catch (error) {
      console.error('Error fetching entities:', error);
      throw error;
    }
  }

  // Obtener una entidad por ID
  async getEntity(id: string): Promise<Entity | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching entity:', error);
      throw error;
    }
  }

  // Crear una nueva entidad
  async createEntity(data: CreateEntityInput): Promise<Entity> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error al crear entidad');
      }

      return result.data;
    } catch (error) {
      console.error('Error creating entity:', error);
      throw error;
    }
  }

  // Actualizar una entidad existente
  async updateEntity(id: string, data: Partial<CreateEntityInput> & { is_active?: boolean }): Promise<Entity> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error al actualizar entidad');
      }

      return result.data;
    } catch (error) {
      console.error('Error updating entity:', error);
      throw error;
    }
  }

  // Eliminar una entidad
  async deleteEntity(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error al eliminar entidad');
      }
    } catch (error) {
      console.error('Error deleting entity:', error);
      throw error;
    }
  }

  // Activar/desactivar una entidad
  async toggleEntityStatus(id: string, isActive: boolean): Promise<Entity> {
    return this.updateEntity(id, { is_active: isActive });
  }

  // Obtener estadísticas de una entidad
  async getEntityStats(id: string): Promise<EntityStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/stats`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Retornar directamente la estructura del backend que ya coincide con EntityStats
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching entity stats:', error);
      throw error;
    }
  }

  // Obtener menciones de una entidad con filtros
  async getEntityMentions(id: string, filters?: MentionsFilter): Promise<PaginatedResponse<EntityMention>> {
    const params = new URLSearchParams();
    
    // Convertir offset a page (backend espera page, no offset)
    const page = filters?.offset ? Math.floor(filters.offset / (filters.limit || 20)) + 1 : 1;
    params.append('page', page.toString());
    params.append('limit', (filters?.limit || 20).toString());
    
    // Solo agregar sentiment si NO es 'ALL' o undefined
    if (filters?.sentiment && filters.sentiment !== 'ALL') {
      params.append('sentiment', filters.sentiment);
    }
    if (filters?.date_from) {
      params.append('date_from', filters.date_from);
    }
    if (filters?.date_to) {
      params.append('date_to', filters.date_to);
    }

    const url = params.toString() ? `${this.baseUrl}/${id}/mentions?${params.toString()}` : `${this.baseUrl}/${id}/mentions`;
    
    try {
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // El backend devuelve { mentions: [], pagination: {} }
        // Pero necesitamos { data: [], pagination: {} }
        return {
          data: result.data.mentions || [],
          pagination: result.data.pagination || { total: 0, page: 1, limit: 20, has_next: false, has_prev: false }
        };
      }
      
      return { data: [], pagination: { total: 0, page: 1, limit: 20, has_next: false, has_prev: false } };
    } catch (error) {
      console.error('❌ Error fetching entity mentions:', error);
      throw error;
    }
  }

  // Obtener alertas de una entidad
  async getEntityAlerts(id: string): Promise<EntityAlert[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/alerts`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data || [] : [];
    } catch (error) {
      console.error('Error fetching entity alerts:', error);
      throw error;
    }
  }

  // Analizar una entidad para buscar menciones nuevas
  async analyzeEntity(id: string, options?: AnalyzeOptions): Promise<AnalyzeResponse> {
    const params = new URLSearchParams();
    
    if (options?.days) {
      params.append('days', options.days.toString());
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }

    const url = params.toString() ? `${this.baseUrl}/${id}/analyze?${params.toString()}` : `${this.baseUrl}/${id}/analyze`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error al analizar entidad');
      }

      // Mapear la respuesta del backend V2 a nuestro formato
      const responseData = result.data;
      
      return {
        mentionsFound: responseData.mentions_found || 0,
        analyzed: responseData.processed || 0,
        domains: responseData.filters?.domains || 0,
        duration_ms: responseData.duration_ms || 0,
        // Estadísticas del analyzer V2
        analyzer_stats: responseData.analyzer_stats ? {
          totalAnalyzed: responseData.analyzer_stats.totalAnalyzed || 0,
          aiUsed: responseData.analyzer_stats.aiUsed || 0,
          fallbackUsed: responseData.analyzer_stats.fallbackUsed || 0,
          aiUsageRate: responseData.analyzer_stats.aiUsageRate || "0%",
          fallbackRate: responseData.analyzer_stats.fallbackRate || "0%",
        } : undefined,
        // Filtros aplicados
        filters: responseData.filters ? {
          days: responseData.filters.days || 30,
          limit: responseData.filters.limit || 100,
          domains: responseData.filters.domains || 0,
          articles_analyzed: responseData.filters.articles_analyzed || 0,
        } : undefined,
      };
    } catch (error) {
      console.error('Error analyzing entity:', error);
      throw error;
    }
  }

  // Obtener timeline de una entidad
  async getEntityTimeline(id: string, options?: TimelineOptions): Promise<EntityTimeline[]> {
    const params = new URLSearchParams();
    
    if (options?.days) {
      params.append('days', options.days.toString());
    }

    const url = params.toString() ? `${this.baseUrl}/${id}/timeline?${params.toString()}` : `${this.baseUrl}/${id}/timeline`;
    
    try {
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data || [] : [];
    } catch (error) {
      console.error('Error fetching entity timeline:', error);
      throw error;
    }
  }

  // Marcar alerta como leída
  async markAlertAsRead(alertId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/entities/alerts/${alertId}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error marking alert as read:', error);
      throw error;
    }
  }

  // Activar/desactivar entidad (endpoint específico según el prompt)
  async toggleEntity(id: string): Promise<{ id: number; is_active: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/toggle`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error al cambiar estado de entidad');
      }

      return result.data;
    } catch (error) {
      console.error('Error toggling entity:', error);
      throw error;
    }
  }
}

// Exportar una instancia única del servicio
export const entityService = new EntityService();
export default entityService;