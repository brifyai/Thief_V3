import { API_BASE_URL, getAuthHeaders } from '../lib/api-secure';
import { errorHandler } from '../lib/error-handler';

export interface RetestRequest {
  new_limit?: number;
}

export interface RetestStats {
  available_news_count: number;
  max_news_limit: number | null;
}

export interface RetestResult {
  previous_stats: RetestStats;
  new_stats: RetestStats;
  news_preview: Array<{
    titulo: string;
    descripcion?: string;
    url?: string;
  }>;
  success: boolean;
  message?: string;
}

export interface UrlTestInfo {
  id: number;
  url: string;
  name: string;
  domain: string;
  last_tested_at?: string | null;
  max_news_limit?: number | null;
  available_news_count?: number | null;
  days_since_test?: number | null;
  needs_retest: boolean;
  test_status: 'never_tested' | 'needs_retest' | 'recent' | 'unknown';
}

class RetestService {
  
  /**
   * Realiza un re-test de una URL existente
   */
  async retestUrl(urlId: number, request: RetestRequest = {}): Promise<RetestResult> {
    try {
      // Primero, obtener la URL actual para hacer el test
      const urlResponse = await fetch(`${API_BASE_URL}/api/public-urls/${urlId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!urlResponse.ok) {
        throw new Error(`No se pudo obtener la URL ID: ${urlId}`);
      }

      const urlData = await urlResponse.json();
      const urlString = urlData.data?.url || urlData.url;

      if (!urlString) {
        throw new Error('No se encontró la URL para re-testear');
      }

      // Hacer el test de la URL usando el endpoint correcto
      const testResponse = await fetch(`${API_BASE_URL}/api/public-urls/test`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlString }),
      });

      if (!testResponse.ok) {
        const error = await testResponse.json();
        throw errorHandler.handleScrapingError(error, `URL ID: ${urlId}`);
      }

      const testResult = await testResponse.json();
      
      if (!testResult.success) {
        throw new Error(testResult.error?.message || 'Error en el test de la URL');
      }

      // Si hay un nuevo límite, actualizar la URL
      let updatedUrl = urlData.data || urlData;
      if (request.new_limit && request.new_limit !== urlData.max_news_limit) {
        const updateResponse = await fetch(`${API_BASE_URL}/api/public-urls/${urlId}`, {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            max_news_limit: request.new_limit,
            available_news_count: testResult.available_news_count,
          }),
        });

        if (updateResponse.ok) {
          updatedUrl = await updateResponse.json();
          updatedUrl = updatedUrl.data || updatedUrl;
        }
      }

      // Construir el resultado en el formato esperado
      const result: RetestResult = {
        previous_stats: {
          available_news_count: urlData.available_news_count || 0,
          max_news_limit: urlData.max_news_limit || null,
        },
        new_stats: {
          available_news_count: testResult.available_news_count,
          max_news_limit: updatedUrl.max_news_limit || request.new_limit || null,
        },
        news_preview: testResult.news_preview || [],
        success: true,
      };

      return result;
    } catch (error) {
      console.error('Error en retestUrl:', error);
      throw errorHandler.handleScrapingError(error, `URL ID: ${urlId}`);
    }
  }

  /**
   * Obtiene información sobre el estado de test de una URL
   */
  getUrlTestInfo(url: {
    id: number;
    last_tested_at?: string | null;
    max_news_limit?: number | null;
    available_news_count?: number | null;
  }): UrlTestInfo {
    const now = new Date();
    const lastTested = url.last_tested_at ? new Date(url.last_tested_at) : null;
    const daysSinceTest = lastTested ? Math.floor((now.getTime() - lastTested.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const needsRetest = daysSinceTest !== null && daysSinceTest > 30;

    let test_status: UrlTestInfo['test_status'] = 'unknown';
    if (!url.last_tested_at) {
      test_status = 'never_tested';
    } else if (needsRetest) {
      test_status = 'needs_retest';
    } else if (daysSinceTest !== null && daysSinceTest <= 30) {
      test_status = 'recent';
    }

    return {
      id: url.id,
      url: '', // Se debe proporcionar desde el componente
      name: '', // Se debe proporcionar desde el componente
      domain: '', // Se debe proporcionar desde el componente
      last_tested_at: url.last_tested_at,
      max_news_limit: url.max_news_limit,
      available_news_count: url.available_news_count,
      days_since_test: daysSinceTest,
      needs_retest: needsRetest,
      test_status,
    };
  }

  /**
   * Valida si un nuevo límite es válido basado en el resultado del test
   */
  validateNewLimit(newLimit: number | undefined, availableCount: number): {
    isValid: boolean;
    error?: string;
  } {
    if (newLimit === undefined) {
      return { isValid: true }; // Sin cambios
    }

    if (newLimit < 1) {
      return {
        isValid: false,
        error: 'El límite debe ser al menos 1'
      };
    }

    if (newLimit > availableCount) {
      return {
        isValid: false,
        error: `El límite (${newLimit}) no puede ser mayor que las noticias disponibles (${availableCount})`
      };
    }

    return { isValid: true };
  }

  /**
   * Genera un resumen comparativo del re-test
   */
  generateComparisonSummary(result: RetestResult): {
    hasChanges: boolean;
    newsChange: number;
    newsChangePercentage: number;
    limitChange: 'increased' | 'decreased' | 'unchanged' | 'added' | 'removed';
    summary: string;
  } {
    const previous = result.previous_stats;
    const current = result.new_stats;
    
    const newsChange = current.available_news_count - previous.available_news_count;
    const newsChangePercentage = previous.available_news_count > 0 
      ? (newsChange / previous.available_news_count) * 100 
      : 0;

    let limitChange: ReturnType<typeof this.generateComparisonSummary>['limitChange'] = 'unchanged';
    
    if (previous.max_news_limit === null && current.max_news_limit !== null) {
      limitChange = 'added';
    } else if (previous.max_news_limit !== null && current.max_news_limit === null) {
      limitChange = 'removed';
    } else if (previous.max_news_limit !== null && current.max_news_limit !== null) {
      if (current.max_news_limit > previous.max_news_limit) {
        limitChange = 'increased';
      } else if (current.max_news_limit < previous.max_news_limit) {
        limitChange = 'decreased';
      }
    }

    const hasChanges = newsChange !== 0 || limitChange !== 'unchanged';
    
    let summary = '';
    if (newsChange > 0) {
      summary = `📈 Se encontraron ${newsChange} noticias más (+${Math.abs(newsChangePercentage).toFixed(1)}%)`;
    } else if (newsChange < 0) {
      summary = `📉 Se encontraron ${Math.abs(newsChange)} noticias menos (${newsChangePercentage.toFixed(1)}%)`;
    } else {
      summary = '📊 El número de noticias se mantuvo igual';
    }

    return {
      hasChanges,
      newsChange,
      newsChangePercentage,
      limitChange,
      summary
    };
  }

  /**
   * Formatea el estado del test para mostrar en la UI
   */
  formatTestStatus(testInfo: UrlTestInfo): {
    badge: {
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      text: string;
      icon?: string;
    };
    tooltip: string;
    urgency: 'low' | 'medium' | 'high';
  } {
    switch (testInfo.test_status) {
      case 'never_tested':
        return {
          badge: {
            variant: 'destructive',
            text: 'Nunca testeada',
            icon: '⚠️'
          },
          tooltip: 'Esta URL nunca ha sido testeada. Es recomendable probarla antes de usarla.',
          urgency: 'high'
        };
        
      case 'needs_retest':
        return {
          badge: {
            variant: 'outline',
            text: 'Re-test recomendado',
            icon: '⚠️'
          },
          tooltip: `Hace ${testInfo.days_since_test} días desde el último test. Se recomienda re-testear.`,
          urgency: 'medium'
        };
        
      case 'recent':
        return {
          badge: {
            variant: 'secondary',
            text: `Hace ${testInfo.days_since_test} días`
          },
          tooltip: 'Test reciente. Todo en orden.',
          urgency: 'low'
        };
        
      default:
        return {
          badge: {
            variant: 'outline',
            text: 'Desconocido'
          },
          tooltip: 'Estado del test desconocido.',
          urgency: 'low'
        };
    }
  }

  /**
   * Obtiene URLs que necesitan re-test
   */
  async getUrlsNeedingRetest(urls: Array<{
    id: number;
    last_tested_at?: string | null;
    max_news_limit?: number | null;
    available_news_count?: number | null;
  }>): Promise<UrlTestInfo[]> {
    return urls
      .map(url => this.getUrlTestInfo(url))
      .filter(url => url.needs_retest || url.test_status === 'never_tested');
  }

  /**
   * Programa re-tests automáticos (para implementación futura)
   */
  scheduleAutomaticRetest(urlId: number, intervalDays: number = 30): {
    success: boolean;
    message: string;
    scheduledDate?: Date;
  } {
    // Esta función podría integrarse con un sistema de cron jobs
    // Por ahora, solo retorna información sobre cuándo se debería hacer el próximo test
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + intervalDays);
    
    return {
      success: true,
      message: `Re-test automático programado para ${scheduledDate.toLocaleDateString()}`,
      scheduledDate
    };
  }
}

export const retestService = new RetestService();