import { apiRequest, getAuthHeaders, API_BASE_URL } from '../lib/api-secure';
import axios from 'axios';

// Crear cliente axios seguro similar al resto de la aplicación
const apiSecure = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Interceptor para agregar headers de autenticación
apiSecure.interceptors.request.use((config) => {
  const headers = getAuthHeaders();
  Object.assign(config.headers || {}, headers);
  return config;
});

// Interceptor para manejar errores de autenticación
apiSecure.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpiar token y redirigir a login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface News {
  id: number;
  title: string;
  content: string;
  url: string;
  source: string;
  domain: string;
  author?: string;
  published_at: string;
  scraped_at: string;
  category?: string;
  tags?: string[];
  image_url?: string;
  summary?: string;
  word_count?: number;
  reading_time?: number;
  language?: string;
  status?: string;
  priority?: number;
  is_selected?: boolean;
  selected_by?: string[];
  selection_date?: string;
  humanized_content?: string;
  humanization_tone?: string;
  humanization_style?: string;
  humanization_complexity?: string;
  humanization_date?: string;
  humanization_cost?: number;
  humanization_tokens?: number;
  version?: number;
  parent_id?: number;
  created_at: string;
  updated_at: string;
  categories?: Array<{
    category: {
      id: number;
      name: string;
      slug: string;
      color: string;
    };
  }>;
  selection_count?: number;
  is_selected_by_user?: boolean;
  selected_at?: string;
}

export interface NewsListResponse {
  news: News[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface NewsStats {
  total_news: number;
  published_news: number;
  pending_news: number;
  selected_by_user: number;
  categories: Array<{
    name: string;
    count: number;
    color: string;
  }>;
  sources: Array<{
    domain: string;
    count: number;
  }>;
  recent_activity: {
    today: number;
    this_week: number;
    this_month: number;
  };
}

export interface HumanizationOptions {
  tone?: 'formal' | 'informal' | 'professional' | 'casual';
  style?: 'simple' | 'detailed' | 'technical' | 'narrative';
  complexity?: 'basic' | 'intermediate' | 'advanced';
}

export interface HumanizationResult {
  humanization: {
    id: string;
    news_id: number;
    user_id: string;
    original_content: string;
    humanized_content: string;
    tone: string;
    style: string;
    complexity: string;
    tokens_used: number;
    cost: number;
    processing_time: number;
    ai_model: string;
    created_at: string;
  };
  original_news: News;
  ai_usage: {
    tokens_used: number;
    cost: number;
    processing_time: number;
  };
}

export interface NewsFilters {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  domain?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  is_selected?: boolean;
}

class NewsService {
  /**
   * Obtener lista de noticias con paginación y filtros
   */
  async getNews(filters: NewsFilters = {}): Promise<NewsListResponse> {
    // FORCE RECOMPILATION - Updated to use /api/news endpoint
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    console.log('🔍 NewsService: Requesting news with params:', params.toString());
    const response = await apiSecure.get(`/api/news?${params.toString()}`);
    console.log('🔍 NewsService: Raw response:', response);
    console.log('🔍 NewsService: response.data:', response.data);
    console.log('🔍 NewsService: response.data.data:', response.data?.data);

    // El backend Express devuelve: { success: true, data: { news: [...], pagination: {...} }, message: "..." }
    const result = response.data?.data;
    console.log('🔍 NewsService: Final result:', result);

    if (!result || !result.news || !result.pagination) {
      console.error('❌ NewsService: Invalid response structure:', result);
      throw new Error('Invalid response structure from backend');
    }

    return result;
  }

  /**
   * Obtener noticia por ID
   */
  async getNewsById(id: number): Promise<News> {
    const response = await apiSecure.get(`/api/news/${id}`);
    return response.data.data;
  }

  /**
   * Seleccionar o deseleccionar noticia
   */
  async toggleNewsSelection(newsId: number, selectionType: string = 'manual'): Promise<{
    selected: boolean;
    message: string;
  }> {
    const response = await apiSecure.post(`/api/news/${newsId}/select`, {
      selection_type: selectionType
    });
    return response.data.data;
  }

  /**
   * Obtener noticias seleccionadas por el usuario
   */
  async getUserSelectedNews(filters: NewsFilters = {}): Promise<NewsListResponse> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await apiSecure.get(`/api/news/selected?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Seleccionar múltiples noticias
   */
  async batchSelectNews(
    newsIds: number[],
    selectionType: string = 'manual',
    batchId?: string
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: Array<{
      news_id: number;
      selected: boolean;
      message: string;
    }>;
    errors: Array<{
      news_id: number;
      error: string;
    }>;
  }> {
    const response = await apiSecure.post('/api/news/batch-select', {
      news_ids: newsIds,
      selection_type: selectionType,
      batch_id: batchId
    });
    return response.data.data;
  }

  /**
   * Limpiar todas las selecciones del usuario
   */
  async clearAllSelections(): Promise<{ cleared_count: number }> {
    const response = await apiSecure.delete('/api/news/selected');
    return response.data.data;
  }

  /**
   * Humanizar noticia
   */
  async humanizeNews(newsId: number, options: HumanizationOptions = {}): Promise<HumanizationResult> {
    const response = await apiSecure.post(`/api/news/${newsId}/humanize`, options);
    return response.data.data;
  }

  /**
   * Obtener estadísticas de noticias
   */
  async getNewsStats(): Promise<NewsStats> {
    const response = await apiSecure.get('/api/news/stats');
    return response.data.data;
  }

  /**
   * Exportar noticias seleccionadas
   */
  async exportNews(
    format: 'json' | 'csv' | 'markdown' = 'json',
    includeHumanized: boolean = false,
    batchId?: string
  ): Promise<Blob> {
    const params = new URLSearchParams({
      format,
      include_humanized: includeHumanized.toString()
    });

    if (batchId) {
      params.append('batch_id', batchId);
    }

    const response = await apiSecure.get(`/api/news/export?${params.toString()}`, {
      responseType: 'blob'
    });

    return response.data;
  }

  /**
   * Descargar archivo exportado
   */
  async downloadExport(
    format: 'json' | 'csv' | 'markdown' = 'json',
    includeHumanized: boolean = false,
    batchId?: string
  ): Promise<void> {
    try {
      const blob = await this.exportNews(format, includeHumanized, batchId);
      
      // Crear URL para el blob
      const url = window.URL.createObjectURL(blob);
      
      // Crear elemento de enlace temporal
      const link = document.createElement('a');
      link.href = url;
      
      // Generar nombre de archivo
      const date = new Date().toISOString().split('T')[0];
      const filename = `news_export_${date}.${format}`;
      link.download = filename;
      
      // Simular clic para descargar
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading export:', error);
      throw error;
    }
  }

  /**
   * Obtener URL para compartir noticia
   */
  getShareUrl(newsId: number): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/news/${newsId}`;
  }

  /**
   * Formatear tiempo de lectura
   */
  formatReadingTime(minutes?: number): string {
    if (!minutes) return 'N/A';
    if (minutes < 1) return '< 1 min';
    return `${Math.round(minutes)} min`;
  }

  /**
   * Formatear fecha de publicación
   */
  formatPublishDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `Hace ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)} h`;
    } else if (diffInHours < 48) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  /**
   * Obtener color de categoría
   */
  getCategoryColor(category?: string): string {
    const colors: Record<string, string> = {
      política: '#f44336',
      economia: '#4caf50',
      economía: '#4caf50',
      deportes: '#2196f3',
      tecnología: '#9c27b0',
      entretenimiento: '#e91e63',
      salud: '#4caf50',
      educación: '#ff9800',
      ciencia: '#3f51b5',
      internacional: '#795548',
      sociedad: '#607d8b'
    };

    return colors[category?.toLowerCase() || ''] || '#6366f1';
  }

  /**
   * Truncar texto
   */
  truncateText(text: string, maxLength: number = 150): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
}

export const newsService = new NewsService();
export default newsService;