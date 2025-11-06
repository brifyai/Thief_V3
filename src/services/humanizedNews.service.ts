import { apiCall } from '../lib/api';

export interface HumanizedNews {
  id: number;
  original_news_id: number;
  title: string;
  content: string;
  humanized_content: string;
  url: string;
  source: string;
  domain: string;
  humanized_at: string;
  tone: string;
  style: string;
  complexity: string;
  target_audience?: string;
  readability_improvement: number;
  word_count_humanized?: number;
  status: string;
  is_ready_for_use: boolean;
}

export interface HumanizedNewsFilters {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
  tone?: string;
  style?: string;
  status?: string;
}

export interface HumanizedNewsResponse {
  success: boolean;
  data: HumanizedNews[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: {
    total_humanized: number;
    ready_for_use: number;
    by_tone: Record<string, number>;
    by_style: Record<string, number>;
    top_sources: string[];
    recent_activity: {
      today: number;
      this_week: number;
    };
  };
}

class HumanizedNewsService {
  /**
   * Obtener noticias humanizadas con filtros y paginación
   */
  async getHumanizedNews(filters: HumanizedNewsFilters = {}): Promise<HumanizedNewsResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiCall<HumanizedNewsResponse>(`/news/humanized?${params.toString()}`);
    return response.data || response;
  }

  /**
   * Obtener noticia humanizada por ID
   */
  async getHumanizedNewsById(id: number): Promise<{ success: boolean; data: HumanizedNews }> {
    return await apiCall<{ success: boolean; data: HumanizedNews }>(`/news/humanized/${id}`);
  }

  /**
   * Obtener estadísticas de noticias humanizadas
   */
  async getHumanizedStats(): Promise<{ success: boolean; data: any }> {
    return await apiCall<{ success: boolean; data: any }>('/news/humanized/stats');
  }

  /**
   * Obtener categorías de noticias humanizadas
   */
  async getCategories(): Promise<{ success: boolean; data: any[] }> {
    return await apiCall<{ success: boolean; data: any[] }>('/news/humanized/categories');
  }

  /**
   * Crear noticia humanizada (para el servicio de humanización)
   */
  async createHumanizedNews(data: Partial<HumanizedNews>): Promise<{ success: boolean; data: HumanizedNews }> {
    return await apiCall<{ success: boolean; data: HumanizedNews }>('/news/humanized', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Actualizar noticia humanizada
   */
  async updateHumanizedNews(id: number, data: Partial<HumanizedNews>): Promise<{ success: boolean; data: HumanizedNews }> {
    return await apiCall<{ success: boolean; data: HumanizedNews }>(`/news/humanized/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Eliminar noticia humanizada
   */
  async deleteHumanizedNews(id: number): Promise<{ success: boolean; data: { message: string } }> {
    return await apiCall<{ success: boolean; data: { message: string } }>(`/news/humanized/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Humanizar noticia (wrapper para el servicio principal)
   */
  async humanizeNews(newsId: number, options: {
    tone?: string;
    style?: string;
    complexity?: string;
    target_audience?: string;
    preserve_facts?: boolean;
    max_length?: number;
  } = {}): Promise<{ success: boolean; data: any }> {
    return await apiCall<{ success: boolean; data: any }>(`/news/${newsId}/humanize`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  /**
   * Reprocessar/rehacer noticia
   */
  async reprocessNews(newsId: number, options: {
    force_rescrape?: boolean;
    humanize_again?: boolean;
  } = {}): Promise<{ success: boolean; data: any }> {
    return await apiCall<{ success: boolean; data: any }>(`/news/${newsId}/reprocess`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  /**
   * Obtener versiones de humanización
   */
  async getHumanizationVersions(humanizedNewsId: number): Promise<{ success: boolean; data: any[] }> {
    return await apiCall<{ success: boolean; data: any[] }>(`/news/humanized/${humanizedNewsId}/versions`);
  }

  /**
   * Exportar noticias humanizadas
   */
  async exportHumanizedNews(format: 'json' | 'csv' | 'markdown' = 'json', includeMetrics = true): Promise<Blob> {
    const url = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')}/api/news/humanized/export?format=${format}&metrics=${includeMetrics}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('token') && { 'Authorization': `Bearer ${localStorage.getItem('token')}` })
      }
    });
    return await response.blob();
  }
}

// Instancia singleton
export const humanizedNewsService = new HumanizedNewsService();
export default humanizedNewsService;