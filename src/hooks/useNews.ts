import { useState, useEffect, useCallback } from 'react';
import { newsService, News, NewsListResponse, NewsFilters, NewsStats } from '../services/news.service';

interface UseNewsOptions {
  autoFetch?: boolean;
  initialFilters?: NewsFilters;
}

interface UseNewsReturn {
  news: News[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: NewsFilters;
  stats: NewsStats | null;
  statsLoading: boolean;
  selectedNews: News[];
  selectedLoading: boolean;
  
  // Acciones
  fetchNews: (filters?: NewsFilters) => Promise<void>;
  fetchNewsById: (id: number) => Promise<News | null>;
  toggleSelection: (newsId: number, selectionType?: string) => Promise<boolean>;
  batchSelect: (newsIds: number[], selectionType?: string) => Promise<void>;
  clearAllSelections: () => Promise<void>;
  fetchSelectedNews: (filters?: NewsFilters) => Promise<void>;
  fetchStats: () => Promise<void>;
  humanizeNews: (newsId: number, options?: any) => Promise<any>;
  exportNews: (format?: 'json' | 'csv' | 'markdown', includeHumanized?: boolean) => Promise<void>;
  
  // Utilidades
  updateFilters: (newFilters: Partial<NewsFilters>) => void;
  resetFilters: () => void;
  refreshNews: () => Promise<void>;
  isNewsSelected: (newsId: number) => boolean;
  getSelectedCount: () => number;
}

const defaultFilters: NewsFilters = {
  page: 1,
  limit: 10,
  status: 'published',
  sortBy: 'published_at',
  sortOrder: 'desc'
};

export function useNews(options: UseNewsOptions = {}): UseNewsReturn {
  const { autoFetch = true, initialFilters = {} } = options;

  // Estados principales
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState<NewsFilters>({ ...defaultFilters, ...initialFilters });

  // Estados de estadísticas
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Estados de noticias seleccionadas
  const [selectedNews, setSelectedNews] = useState<News[]>([]);
  const [selectedLoading, setSelectedLoading] = useState(false);

  // Obtener noticias
  const fetchNews = useCallback(async (newFilters?: NewsFilters) => {
    try {
      setLoading(true);
      setError(null);

      const filtersToUse = newFilters || filters;
      console.log('🔍 Debug: filtersToUse:', filtersToUse);
      const response = await newsService.getNews(filtersToUse);
      console.log('🔍 Debug: response:', response);
      console.log('🔍 Debug: response type:', typeof response);
      console.log('🔍 Debug: response.news:', response?.news);

      if (response && response.news && response.pagination) {
        setNews(response.news);
        setPagination(response.pagination);
      } else {
        throw new Error('Invalid response structure');
      }
      
      if (newFilters) {
        setFilters(filtersToUse);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching news';
      setError(errorMessage);
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Obtener noticia por ID
  const fetchNewsById = async (id: number): Promise<News | null> => {
    try {
      const newsItem = await newsService.getNewsById(id);
      return newsItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching news item';
      setError(errorMessage);
      console.error('Error fetching news by ID:', err);
      return null;
    }
  };

  // Toggle selección de noticia
  const toggleSelection = async (newsId: number, selectionType: string = 'manual'): Promise<boolean> => {
    try {
      const result = await newsService.toggleNewsSelection(newsId, selectionType);
      
      // Actualizar estado local
      setNews(prevNews => 
        prevNews.map(item => 
          item.id === newsId 
            ? { ...item, is_selected_by_user: result.selected }
            : item
        )
      );

      // Si estaba seleccionada, actualizar la lista de seleccionadas
      if (result.selected) {
        const newsItem = news.find(n => n.id === newsId);
        if (newsItem) {
          setSelectedNews(prev => [...prev, { ...newsItem, is_selected_by_user: true }]);
        }
      } else {
        setSelectedNews(prev => prev.filter(n => n.id !== newsId));
      }

      return result.selected;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error toggling selection';
      setError(errorMessage);
      console.error('Error toggling selection:', err);
      return false;
    }
  };

  // Selección batch
  const batchSelect = async (newsIds: number[], selectionType: string = 'manual'): Promise<void> => {
    try {
      setLoading(true);
      const result = await newsService.batchSelectNews(newsIds, selectionType);

      // Actualizar estado local
      setNews(prevNews => 
        prevNews.map(item => {
          const batchResult = result.results.find(r => r.news_id === item.id);
          return batchResult 
            ? { ...item, is_selected_by_user: batchResult.selected }
            : item;
        })
      );

      // Actualizar lista de seleccionadas
      await fetchSelectedNews();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error in batch selection';
      setError(errorMessage);
      console.error('Error in batch selection:', err);
    } finally {
      setLoading(false);
    }
  };

  // Limpiar todas las selecciones
  const clearAllSelections = async (): Promise<void> => {
    try {
      setLoading(true);
      await newsService.clearAllSelections();

      // Actualizar estado local
      setNews(prevNews => 
        prevNews.map(item => ({ ...item, is_selected_by_user: false }))
      );
      setSelectedNews([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error clearing selections';
      setError(errorMessage);
      console.error('Error clearing selections:', err);
    } finally {
      setLoading(false);
    }
  };

  // Obtener noticias seleccionadas
  const fetchSelectedNews = useCallback(async (newFilters?: NewsFilters) => {
    try {
      setSelectedLoading(true);
      const filtersToUse = newFilters || { page: 1, limit: 100 };
      const response = await newsService.getUserSelectedNews(filtersToUse);
      setSelectedNews(response.news);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching selected news';
      setError(errorMessage);
      console.error('Error fetching selected news:', err);
    } finally {
      setSelectedLoading(false);
    }
  }, []);

  // Obtener estadísticas
  const fetchStats = useCallback(async (): Promise<void> => {
    try {
      setStatsLoading(true);
      const statsData = await newsService.getNewsStats();
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching stats';
      setError(errorMessage);
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Humanizar noticia
  const humanizeNews = async (newsId: number, options?: any): Promise<any> => {
    try {
      setLoading(true);
      const result = await newsService.humanizeNews(newsId, options);

      // Actualizar la noticia con el contenido humanizado
      setNews(prevNews => 
        prevNews.map(item => 
          item.id === newsId 
            ? { 
                ...item, 
                humanized_content: result.humanization.humanized_content,
                humanization_tone: result.humanization.tone,
                humanization_style: result.humanization.style,
                humanization_complexity: result.humanization.complexity,
                humanization_date: result.humanization.created_at
              }
            : item
        )
      );

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error humanizing news';
      setError(errorMessage);
      console.error('Error humanizing news:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Exportar noticias
  const exportNews = async (
    format: 'json' | 'csv' | 'markdown' = 'json', 
    includeHumanized: boolean = false
  ): Promise<void> => {
    try {
      await newsService.downloadExport(format, includeHumanized);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error exporting news';
      setError(errorMessage);
      console.error('Error exporting news:', err);
    }
  };

  // Actualizar filtros
  const updateFilters = (newFilters: Partial<NewsFilters>): void => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    // Si cambia la página, mantener los demás filtros
    if (newFilters.page !== undefined) {
      fetchNews(updatedFilters);
    } else {
      // Si cambian otros filtros, resetear a página 1
      fetchNews({ ...updatedFilters, page: 1 });
    }
  };

  // Resetear filtros
  const resetFilters = (): void => {
    const resetFilters = { ...defaultFilters, ...initialFilters };
    setFilters(resetFilters);
    fetchNews(resetFilters);
  };

  // Refrescar noticias
  const refreshNews = async (): Promise<void> => {
    await fetchNews();
    await fetchStats();
  };

  // Verificar si una noticia está seleccionada
  const isNewsSelected = (newsId: number): boolean => {
    return news.some(item => item.id === newsId && item.is_selected_by_user);
  };

  // Obtener conteo de seleccionadas
  const getSelectedCount = (): number => {
    return news.filter(item => item.is_selected_by_user).length;
  };

  // Auto-fetch inicial
  useEffect(() => {
    if (autoFetch) {
      fetchNews();
      fetchStats();
    }
  }, [autoFetch]);

  return {
    news,
    loading,
    error,
    pagination,
    filters,
    stats,
    statsLoading,
    selectedNews,
    selectedLoading,
    
    fetchNews,
    fetchNewsById,
    toggleSelection,
    batchSelect,
    clearAllSelections,
    fetchSelectedNews,
    fetchStats,
    humanizeNews,
    exportNews,
    
    updateFilters,
    resetFilters,
    refreshNews,
    isNewsSelected,
    getSelectedCount
  };
}

export default useNews;