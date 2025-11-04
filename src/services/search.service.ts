import { API_BASE_URL, getAuthHeaders } from '../lib/api-secure';

export interface SearchFilters {
  domain?: string;
  date_from?: string;
  date_to?: string;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  author?: string;
  keywords?: string[];
}

export interface SearchResult {
  id: number;
  title?: string;
  titulo?: string;
  content?: string;
  contenido?: string;
  url?: string;
  domain: string;
  scraped_at: string;
  autor?: string;
  sentiment?: string;
  sentiment_score?: number;
  category?: string;
  relevance_score?: number;
}

export interface SearchResponse {
  success: boolean;
  data: {
    results: SearchResult[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters?: SearchFilters;
    query?: string;
  };
  error?: string;
}

export interface AISearchRequest {
  query: string;
  page?: number;
  limit?: number;
  filters?: SearchFilters;
}

export interface AISearchResponse {
  success: boolean;
  data: {
    results: SearchResult[];
    sentimentAnalysis: {
      stats: {
        total: number;
        positive: number;
        negative: number;
        neutral: number;
      };
      clusters: Array<{
        sentiment: string;
        count: number;
        examples: SearchResult[];
      }>;
    };
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    query: string;
    processingTime: number;
  };
  error?: string;
}

export interface SearchFiltersOptions {
  domains: string[];
  categories: string[];
  authors: string[];
  dateRange: {
    min: string;
    max: string;
  };
}

export interface SearchStats {
  totalSearches: number;
  todaySearches: number;
  averageResults: number;
  popularQueries: Array<{
    query: string;
    count: number;
  }>;
  topDomains: Array<{
    domain: string;
    count: number;
  }>;
}

export interface AutoScrapingStatus {
  isRunning: boolean;
  lastRun?: string;
  nextRun?: string;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  processingSpeed?: number;
  estimatedTimeRemaining?: number;
}

class SearchService {

  // ==================== Búsqueda Avanzada ====================

  // Búsqueda avanzada con filtros
  async search(
    query: string,
    page: number = 1,
    limit: number = 20,
    filters?: SearchFilters
  ): Promise<SearchResponse> {
    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.domain && { domain: filters.domain }),
        ...(filters?.date_from && { date_from: filters.date_from }),
        ...(filters?.date_to && { date_to: filters.date_to }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.sentiment && { sentiment: filters.sentiment }),
        ...(filters?.author && { author: filters.author }),
        ...(filters?.keywords && { keywords: filters.keywords.join(',') }),
      });

      const response = await fetch(`${API_BASE_URL}/search?${params}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Error en búsqueda');
      }

      return result;
    } catch (error) {
      console.error('Error en search:', error);
      throw error;
    }
  }

  // Obtener opciones de filtros
  async getFiltersOptions(): Promise<SearchFiltersOptions> {
    try {
      const response = await fetch(`${API_BASE_URL}/search/filters`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        domains: [],
        categories: [],
        authors: [],
        dateRange: { min: '', max: '' }
      };
    } catch (error) {
      console.error('Error en getFiltersOptions:', error);
      return {
        domains: [],
        categories: [],
        authors: [],
        dateRange: { min: '', max: '' }
      };
    }
  }

  // Obtener estadísticas de búsqueda
  async getSearchStats(): Promise<SearchStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/search/stats`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        totalSearches: 0,
        todaySearches: 0,
        averageResults: 0,
        popularQueries: [],
        topDomains: []
      };
    } catch (error) {
      console.error('Error en getSearchStats:', error);
      return {
        totalSearches: 0,
        todaySearches: 0,
        averageResults: 0,
        popularQueries: [],
        topDomains: []
      };
    }
  }

  // ==================== Búsqueda con IA ====================

  // Búsqueda inteligente con IA
  async aiSearch(data: AISearchRequest): Promise<AISearchResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/search/ai`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Error en búsqueda con IA');
      }

      return result;
    } catch (error) {
      console.error('Error en aiSearch:', error);
      throw error;
    }
  }

  // ==================== Auto-Scraping ====================

  // Ejecutar scraping manual
  async runAutoScraping(): Promise<{
    success: boolean;
    message: string;
    jobId?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/search/run-auto-scraping`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error en runAutoScraping:', error);
      throw error;
    }
  }

  // Obtener estado del scraping automático
  async getAutoScrapingStatus(): Promise<AutoScrapingStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/search/auto-scraping-status`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        isRunning: false,
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0
      };
    } catch (error) {
      console.error('Error en getAutoScrapingStatus:', error);
      return {
        isRunning: false,
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0
      };
    }
  }

  // Obtener contenido por ID (para resultados de búsqueda)
  async getContentById(id: string): Promise<SearchResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/search/content/${id}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Error al obtener contenido');
      }

      return result.data;
    } catch (error) {
      console.error('Error en getContentById:', error);
      throw error;
    }
  }

  // ==================== Funciones Utilitarias ====================

  // Construir query string para filtros
  buildQueryString(query: string, filters?: SearchFilters): string {
    const params = new URLSearchParams({ q: query });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, value.toString());
          }
        }
      });
    }
    
    return params.toString();
  }

  // Formatear fecha para filtros
  formatDateForFilter(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Validar filtros
  validateFilters(filters: SearchFilters): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (filters.date_from && filters.date_to) {
      const fromDate = new Date(filters.date_from);
      const toDate = new Date(filters.date_to);
      
      if (fromDate > toDate) {
        errors.push('La fecha de inicio no puede ser posterior a la fecha de fin');
      }
    }

    if (filters.sentiment && !['positive', 'negative', 'neutral'].includes(filters.sentiment)) {
      errors.push('El sentimiento debe ser: positive, negative o neutral');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Obtener sugerencias de búsqueda basadas en consultas populares
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getSearchSuggestions:', error);
      return [];
    }
  }

  // Guardar búsqueda en historial
  async saveSearchToHistory(query: string, filters?: SearchFilters): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/search/history`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          filters,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error en saveSearchToHistory:', error);
      // No lanzar error, es una operación secundaria
    }
  }

  // Obtener historial de búsquedas
  async getSearchHistory(limit: number = 10): Promise<Array<{
    query: string;
    filters?: SearchFilters;
    timestamp: string;
    resultsCount: number;
  }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/search/history?limit=${limit}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getSearchHistory:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();