import { getAuthHeaders } from '../lib/api-secure';

// URLs base - scraping endpoints están en la raíz, no en /api
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api`;

export interface ScrapingResult {
  success: boolean;
  titulo?: string;
  fecha?: string;
  autor?: string;
  contenido?: string;
  imagenes?: string[];
  url?: string;
  metadata?: {
    configType?: string;
    configSource?: string;
    strategy?: string;
    confidence?: number;
    siteName?: string;
    extractedAt?: string;
    needsHelp?: boolean;
  };
  error?: string;
  detalle?: string;
}

export interface ScrapingHistory {
  id: number;
  title: string;
  titulo?: string; // Alias para compatibilidad
  summary?: string;
  content: string;
  contenido?: string; // Alias para compatibilidad
  url?: string; // URL del artículo scrapeado
  autor?: string; // Autor del artículo
  domain: string;
  category?: string;
  region?: string;
  scraped_at: string;
  fecha_scraping?: string; // Alias para compatibilidad
  content_length: number;
  success: boolean;
}

export interface CustomSelectors {
  titleSelector?: string;
  contentSelector?: string;
  dateSelector?: string;
  authorSelector?: string;
  imageSelector?: string;
  listingContainerSelector?: string;
  listingLinkSelector?: string;
  listingTitleSelector?: string;
}

export interface TestSelectorsRequest {
  url: string;
  selectors?: {
    titleSelector?: string;
    contentSelector?: string;
    dateSelector?: string;
    authorSelector?: string;
    imageSelector?: string;
  };
  // Para compatibilidad con el formato antiguo
  titleSelector?: string;
  contentSelector?: string;
  dateSelector?: string;
  authorSelector?: string;
  imageSelector?: string;
  listingContainerSelector?: string;
  listingLinkSelector?: string;
  listingTitleSelector?: string;
}

export interface TestListingRequest {
  url: string;
  listingContainerSelector?: string;
  listingLinkSelector?: string;
  listingTitleSelector?: string;
}

class ScrapingService {

  // Scraping completo de URL
  async scrape(url: string): Promise<ScrapingResult> {
    try {
      // Usar el endpoint correcto: /scrape-single (sin /api)
      const response = await fetch(`${BASE_URL}/scrape-single`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Error en scraping');
      }

      return result;
    } catch (error) {
      console.error('Error en scrape:', error);
      throw error;
    }
  }

  // Scraping simplificado - usa el mismo endpoint que scrape()
  async scrapeSingle(url: string): Promise<ScrapingResult> {
    return this.scrape(url);
  }

  // Reescribir contenido con IA
  async rewriteWithAI(content: string): Promise<{ rewritten_content: string }> {
    try {
      const response = await fetch(`${BASE_URL}/rewrite-with-ai`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Error al reescribir con IA');
      }

      return result;
    } catch (error) {
      console.error('Error en rewriteWithAI:', error);
      throw error;
    }
  }

  // Guardar contenido scrapeado
  async saveScrapedContent(data: {
    url: string;
    title: string;
    content: string;
    author?: string;
    images?: string[];
  }): Promise<{
    success: boolean;
    data?: {
      title?: string;
      content?: string;
      date?: string;
      author?: string;
      images?: string[];
      errors?: string[];
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/scraping/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Error al guardar contenido');
      }

      return result;
    } catch (error) {
      console.error('Error en saveScrapedContent:', error);
      throw error;
    }
  }

  // Obtener historial de scraping
  async getScrapingHistory(): Promise<ScrapingHistory[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/scraping/history`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getScrapingHistory:', error);
      throw error;
    }
  }

  // Obtener contenido específico por ID
  async getContentById(id: string): Promise<{
    id: string;
    title: string;
    content: string;
    url: string;
    status: string;
    created_at: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/scraping/content/${id}`, {
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

  // Probar selectores CSS
  async testSelectors(data: TestSelectorsRequest): Promise<{
    success: boolean;
    preview?: {
      title?: string | null;
      content?: string | null;
      date?: string | null;
      author?: string | null;
      images?: string[];
    };
    validation?: {
      hasTitle: boolean;
      hasContent: boolean;
      titleValid: boolean;
      contentValid: boolean;
      contentLength: number;
    };
    confidence?: number;
    message?: string;
    error?: string;
  }> {
    try {
      // Usar el endpoint correcto: /api/site-configs/test
      // Enviar datos en el formato requerido: { url, selectors, listingSelectors }
      const requestData: any = {
        url: data.url,
        selectors: {
          titleSelector: data.selectors?.titleSelector || data.titleSelector,
          contentSelector: data.selectors?.contentSelector || data.contentSelector,
          dateSelector: data.selectors?.dateSelector || data.dateSelector,
          authorSelector: data.selectors?.authorSelector || data.authorSelector,
          imageSelector: data.selectors?.imageSelector || data.imageSelector,
        }
      };

      // Agregar listingSelectors si están presentes
      const hasListingSelectors = data.listingContainerSelector || data.listingLinkSelector || data.listingTitleSelector;
      if (hasListingSelectors) {
        requestData.listingSelectors = {
          containerSelector: data.listingContainerSelector,
          linkSelector: data.listingLinkSelector,
          titleSelector: data.listingTitleSelector
        };
      }

      console.log('🔍 Enviando datos de selectores (formato original):', requestData);

      const response = await fetch(`${API_BASE_URL}/site-configs/test`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('📥 Respuesta del servidor (selectores):', result);
      
      // Verificar diferentes formatos de respuesta posibles
      if (!result.success && !result.preview && !result.data) {
        throw new Error(result.error?.message || result.message || 'Error al probar selectores');
      }

      return result;
    } catch (error) {
      console.error('Error en testSelectors:', error);
      throw error;
    }
  }

  // Probar listado - usa el endpoint del backend para probar URLs
  async testListing(data: TestListingRequest): Promise<{
    success: boolean;
    results?: Array<{
      title: string;
      url: string;
    }>;
    total?: number;
    error?: string;
    available_news_count?: number;
    news_preview?: Array<{
      titulo: string;
      descripcion?: string;
    }>;
    used_custom_selectors?: boolean;
    scraping_method?: string;
  }> {
    try {
      // Usar el endpoint correcto del backend: /api/public-urls/test
      const requestData: {
        url: string;
        custom_selectors?: {
          listingContainerSelector?: string;
          listingLinkSelector?: string;
          listingTitleSelector?: string;
        };
      } = {
        url: data.url,
      };

      // Agregar selectores de listado si existen
      if (data.listingContainerSelector) {
        requestData.custom_selectors = {
          listingContainerSelector: data.listingContainerSelector,
          listingLinkSelector: data.listingLinkSelector,
          listingTitleSelector: data.listingTitleSelector,
        };
      }

      console.log('🔍 Enviando datos de listado:', requestData);

      const response = await fetch(`${API_BASE_URL}/api/public-urls/test`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('📥 Respuesta del servidor (listado):', result);
      
      // Adaptar respuesta al formato esperado por el frontend
      return {
        success: result.success || result.available_news_count > 0,
        results: result.news_preview?.map((item: { titulo: string; descripcion?: string }) => ({
          title: item.titulo,
          url: data.url // URL base para las noticias del listado
        })) || [],
        total: result.available_news_count,
        available_news_count: result.available_news_count,
        news_preview: result.news_preview,
        used_custom_selectors: result.used_custom_selectors,
        scraping_method: result.scraping_method,
        error: result.error
      };
    } catch (error) {
      console.error('Error en testListing:', error);
      throw error;
    }
  }

  // Scrapear página de listado - usa el endpoint individual con selectores
  async scrapeListing(data: TestListingRequest): Promise<{
    success: boolean;
    results?: Array<{
      id: string;
      title: string;
      url: string;
      status: string;
    }>;
    total?: number;
    error?: string;
  }> {
    try {
      // Para scraping de listado, usar el endpoint individual con selectores
      const customSelectors: {
        listingContainerSelector?: string;
        listingLinkSelector?: string;
        listingTitleSelector?: string;
      } = {};
      
      if (data.listingContainerSelector) {
        customSelectors.listingContainerSelector = data.listingContainerSelector;
      }
      if (data.listingLinkSelector) {
        customSelectors.listingLinkSelector = data.listingLinkSelector;
      }
      if (data.listingTitleSelector) {
        customSelectors.listingTitleSelector = data.listingTitleSelector;
      }

      const requestBody: {
        url: string;
        custom_selectors?: typeof customSelectors;
      } = {
        url: data.url,
      };

      if (Object.keys(customSelectors).length > 0) {
        requestBody.custom_selectors = customSelectors;
      }

      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/scrape-single`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Error al scrapear listado');
      }

      return result;
    } catch (error) {
      console.error('Error en scrapeListing:', error);
      throw error;
    }
  }
}

export const scrapingService = new ScrapingService();