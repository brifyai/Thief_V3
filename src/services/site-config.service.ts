import { API_BASE_URL, getAuthHeaders } from '../lib/api-secure';

export interface SiteConfiguration {
  id: string;
  domain: string;
  name: string;
  titleSelector: string;
  contentSelector: string;
  dateSelector?: string | null;
  authorSelector?: string | null;
  imageSelector?: string | null;
  listingSelectors?: {
    containerSelector: string;
    linkSelector: string;
    titleSelector?: string;
  } | null;
  cleaningRules?: any;
  createdBy: string;
  verifiedBy: string[];
  usageCount: number;
  successCount: number;
  failureCount: number;
  confidence: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastError?: string | null;
  lastSuccess?: string | null;
  lastUsedAt?: string | null;
}

export interface CreateSiteConfigData {
  domain: string;
  name: string;
  titleSelector: string;
  contentSelector: string;
  dateSelector?: string | null;
  authorSelector?: string | null;
  imageSelector?: string | null;
  listingSelectors?: {
    containerSelector: string;
    linkSelector: string;
    titleSelector?: string;
  } | null;
}

export interface UpdateSiteConfigData {
  name?: string;
  titleSelector?: string;
  contentSelector?: string;
  dateSelector?: string | null;
  authorSelector?: string | null;
  imageSelector?: string | null;
  listingSelectors?: {
    containerSelector: string;
    linkSelector: string;
    titleSelector?: string;
  } | null;
}

export interface TestSelectorsRequest {
  url: string;
  titleSelector?: string;
  contentSelector?: string;
  dateSelector?: string;
  authorSelector?: string;
  imageSelector?: string;
}

export interface TestSelectorsResponse {
  success: boolean;
  data: {
    title?: string;
    content?: string;
    date?: string;
    author?: string;
    images?: string[];
    errors?: string[];
  };
  error?: string;
}

export interface VerifyConfigResponse {
  success: boolean;
  data: {
    isValid: boolean;
    testResults: TestSelectorsResponse;
    confidence: number;
    recommendations?: string[];
  };
  error?: string;
}

export const siteConfigService = {
  /**
   * Obtener todas las configuraciones de sitios (público)
   */
  async getAll(): Promise<SiteConfiguration[]> {
    const response = await fetch(`${API_BASE_URL}/site-configs`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Error al cargar configuraciones');
    }

    const result = await response.json();
    return result.data || result || [];
  },

  /**
   * Obtener configuración por dominio (público)
   */
  async getByDomain(domain: string): Promise<SiteConfiguration | null> {
    const response = await fetch(`${API_BASE_URL}/site-configs/${domain}`, {
      headers: getAuthHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Error al cargar configuración');
    }

    const result = await response.json();
    return result.data || result;
  },

  /**
   * Probar selectores (requiere autenticación)
   */
  async testSelectors(testData: TestSelectorsRequest): Promise<TestSelectorsResponse> {
    const response = await fetch(`${API_BASE_URL}/site-configs/test`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al probar selectores');
    }

    const result = await response.json();
    return result;
  },

  /**
   * Crear nueva configuración de sitio (requiere autenticación)
   */
  async create(configData: CreateSiteConfigData): Promise<SiteConfiguration> {
    const response = await fetch(`${API_BASE_URL}/site-configs`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al crear configuración');
    }

    const result = await response.json();
    return result.data || result;
  },

  /**
   * Actualizar configuración existente (requiere autenticación)
   */
  async update(
    domain: string,
    updates: UpdateSiteConfigData
  ): Promise<SiteConfiguration> {
    const response = await fetch(`${API_BASE_URL}/site-configs/${domain}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al actualizar configuración');
    }

    const result = await response.json();
    return result.data || result;
  },

  /**
   * Verificar configuración (requiere autenticación)
   */
  async verify(domain: string): Promise<VerifyConfigResponse> {
    const response = await fetch(`${API_BASE_URL}/site-configs/${domain}/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al verificar configuración');
    }

    const result = await response.json();
    return result;
  },

  /**
   * Eliminar configuración (requiere autenticación)
   */
  async delete(domain: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/site-configs/${domain}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al eliminar configuración');
    }
  },

  /**
   * Método utilitario para obtener configuración con fallback
   */
  async getWithFallback(domain: string): Promise<SiteConfiguration | null> {
    try {
      return await this.getByDomain(domain);
    } catch (error) {
      console.warn(`No se encontró configuración para ${domain}:`, error);
      return null;
    }
  },

  /**
   * Método utilitario para probar múltiples selectores
   */
  async testMultipleSelectors(tests: TestSelectorsRequest[]): Promise<TestSelectorsResponse[]> {
    const promises = tests.map(test => this.testSelectors(test));
    return Promise.all(promises);
  },

  /**
   * Método utilitario para validar selectores básicos
   */
  validateSelectors(selectors: Partial<TestSelectorsRequest>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!selectors.titleSelector) {
      errors.push('El selector de título es requerido');
    }

    if (!selectors.contentSelector) {
      errors.push('El selector de contenido es requerido');
    }

    // Validación básica de sintaxis CSS
    const cssSelectorRegex = /^[#.]?[a-zA-Z][\w-]*$/;
    
    if (selectors.titleSelector && !cssSelectorRegex.test(selectors.titleSelector)) {
      errors.push('El selector de título no parece válido');
    }

    if (selectors.contentSelector && !cssSelectorRegex.test(selectors.contentSelector)) {
      errors.push('El selector de contenido no parece válido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
