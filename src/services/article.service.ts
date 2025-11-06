import { API_BASE_URL, getAuthHeaders } from '../lib/api-secure';

// URL base sin /api para endpoints especiales
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ArticleDetail {
  id: number;
  title?: string;
  titulo?: string;
  summary?: string;
  cleaned_content?: string;
  content?: string;
  contenido?: string;
  url?: string;
  domain: string;
  category?: string | null;
  scraped_at: string;
  autor?: string;
  fecha?: string;
  preview?: string;
  relevanceScore?: number;
  relevancePercentage?: number;
  sentiment?: string;
  sentimentScore?: number;
  is_saved?: boolean;
  saved_article_id?: number;
}

export interface SavedArticle {
  id: number;
  user_id: number;
  scraping_result_id: number;
  scraping_result: {
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
  };
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateSavedArticleData {
  scraping_result_id: number;
  notes?: string;
  tags?: string[];
}

export interface UpdateSavedArticleData {
  notes?: string;
  tags?: string[];
}

export interface SavedArticleStats {
  total: number;
  this_week: number;
  this_month: number;
  by_domain: Array<{
    domain: string;
    count: number;
  }>;
  by_sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

class ArticleService {
  
  // Obtener detalles de un artículo por ID
  async getArticleById(id: string): Promise<ArticleDetail> {
    const endpoints = [
      `${API_BASE_URL}/scraping/content/${id}`,
      `${API_BASE_URL}/search/content/${id}`,
    ];

    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          lastError = new Error(`HTTP error! status: ${response.status} for ${endpoint}`);
          continue;
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          return result.data;
        } else if (result.data) {
          return result.data;
        } else if (result.id) {
          return result;
        } else {
          lastError = new Error(`Respuesta inesperada desde ${endpoint}`);
          continue;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(`Error desconocido al llamar ${endpoint}`);
        continue;
      }
    }

    const errorMessage = lastError?.message || 'No se pudo cargar el artículo desde ningún endpoint disponible';
    console.error('Todos los endpoints fallaron:', errorMessage);
    throw new Error(errorMessage);
  }

  // ==================== Artículos Guardados ====================

  // Obtener estadísticas de artículos guardados
  async getSavedArticlesStats(): Promise<SavedArticleStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-articles/stats`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        total: 0,
        this_week: 0,
        this_month: 0,
        by_domain: [],
        by_sentiment: { positive: 0, negative: 0, neutral: 0 }
      };
    } catch (error) {
      console.error('Error en getSavedArticlesStats:', error);
      return {
        total: 0,
        this_week: 0,
        this_month: 0,
        by_domain: [],
        by_sentiment: { positive: 0, negative: 0, neutral: 0 }
      };
    }
  }

  // Guardar artículo
  async saveArticle(data: CreateSavedArticleData): Promise<SavedArticle> {
    try {
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${API_BASE_URL}/api/saved-articles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || `HTTP ${response.status}: Error al guardar artículo`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error en saveArticle:', error);
      throw error;
    }
  }

  // Listar artículos guardados
  async getSavedArticles(page: number = 1, limit: number = 20): Promise<{
    articles: SavedArticle[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-articles?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        articles: result.data || [],
        pagination: result.pagination || {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      };
    } catch (error) {
      console.error('Error en getSavedArticles:', error);
      throw error;
    }
  }

  // Actualizar artículo guardado
  async updateSavedArticle(id: number, data: UpdateSavedArticleData): Promise<SavedArticle> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-articles/${id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Error al actualizar artículo');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error en updateSavedArticle:', error);
      throw error;
    }
  }

  // Eliminar artículo guardado
  async deleteSavedArticle(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-articles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Error al eliminar artículo');
      }
    } catch (error) {
      console.error('Error en deleteSavedArticle:', error);
      throw error;
    }
  }

  // Eliminar artículo guardado por scraping_result_id
  async unsaveArticle(scrapingResultId: number): Promise<void> {
    try {
      // 1. Primero buscar el artículo guardado para obtener su ID
      const savedArticlesResponse = await fetch(`${API_BASE_URL}/api/saved-articles`, {
        headers: getAuthHeaders()
      });

      if (!savedArticlesResponse.ok) {
        throw new Error('No se pudieron obtener los artículos guardados');
      }

      const savedArticlesResult = await savedArticlesResponse.json();

      if (!savedArticlesResult.success || !savedArticlesResult.data) {
        throw new Error('Error al obtener la lista de artículos guardados');
      }

      // 2. Buscar el artículo específico por scraping_result_id
      const savedArticle = savedArticlesResult.data.find((article: SavedArticle) => 
        article.scraping_result_id === scrapingResultId
      );

      if (!savedArticle) {
        throw new Error('El artículo no está en tu lista de guardados');
      }

      // 3. Eliminar usando el endpoint correcto con el ID del artículo guardado
      const deleteResponse = await fetch(`${API_BASE_URL}/api/saved-articles/${savedArticle.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!deleteResponse.ok) {
        const result = await deleteResponse.json();
        throw new Error(result.error?.message || `HTTP ${deleteResponse.status}: Error al eliminar artículo de guardados`);
      }
    } catch (error) {
      throw error;
    }
  }

  // ==================== Funciones Utilitarias ====================

  // Generar resumen con IA
  async generateAISummary(content: string, title: string): Promise<string> {
    try {
      const response = await fetch(`${BASE_URL}/rewrite-with-ai`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          instruction: `Genera un resumen conciso del siguiente artículo titulado "${title}". El resumen debe capturar los puntos clave y ser fácil de leer.`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.rewritten_content) {
        return result.rewritten_content;
      } else {
        return content.substring(0, 200) + '...';
      }
    } catch (error) {
      console.error('Error en generateAISummary:', error);
      return content.substring(0, 200) + '...';
    }
  }

  // Compartir artículo (preparar datos para compartir)
  prepareShareData(article: ArticleDetail): {
    title: string;
    text: string;
    url: string;
  } {
    return {
      title: article.titulo || article.title || 'Artículo interesante',
      text: article.summary || article.preview || '',
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
  }

  // Calcular estadísticas de lectura
  calculateReadingStats(content: string): {
    readingTime: number;
    wordCount: number;
    characterCount: number;
  } {
    const cleanContent = content || '';
    
    // Contar palabras de manera más precisa
    const words = cleanContent
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
    const wordCount = words.length;
    
    // Calcular tiempo de lectura basado en 200 palabras por minuto (promedio adulto)
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    
    const characterCount = cleanContent.length;

    return {
      readingTime,
      wordCount,
      characterCount,
    };
  }

  // Formatear fecha
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Obtener color de sentimiento
  getSentimentColor(sentiment?: string): string {
    switch (sentiment) {
      case 'positive':
        return 'border-green-500 text-green-700 bg-green-50';
      case 'negative':
        return 'border-red-500 text-red-700 bg-red-50';
      default:
        return 'border-gray-500 text-gray-700 bg-gray-50';
    }
  }

  // Obtener icono de sentimiento
  getSentimentIcon(sentiment?: string): string {
    switch (sentiment) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😔';
      default:
        return '😐';
    }
  }

  // Obtener etiqueta de sentimiento
  getSentimentLabel(sentiment?: string): string {
    switch (sentiment) {
      case 'positive':
        return 'Positivo';
      case 'negative':
        return 'Negativo';
      default:
        return 'Neutral';
    }
  }

  // Buscar artículos guardados por tags
  async searchSavedArticlesByTag(tag: string, page: number = 1, limit: number = 20): Promise<{
    articles: SavedArticle[];
    pagination: any;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-articles?tag=${encodeURIComponent(tag)}&page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        articles: result.data || [],
        pagination: result.pagination || {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      };
    } catch (error) {
      console.error('Error en searchSavedArticlesByTag:', error);
      throw error;
    }
  }

  // Obtener tags populares
  async getPopularTags(): Promise<Array<{ tag: string; count: number }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-articles/tags/popular`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getPopularTags:', error);
      return [];
    }
  }
}

export const articleService = new ArticleService();