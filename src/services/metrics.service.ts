import { API_BASE_URL, getAuthHeaders } from '../lib/api-secure';

export interface GeneralMetrics {
  totalArticles: number;
  totalScrapes: number;
  successRate: number;
  averageProcessingTime: number;
  activeUsers: number;
  totalDomains: number;
  storageUsed: number;
  lastUpdated: string;
}

export interface DuplicateMetrics {
  totalDuplicates: number;
  duplicateRate: number;
  duplicatesByDomain: Array<{
    domain: string;
    duplicates: number;
    unique: number;
    rate: number;
  }>;
  duplicatesByDate: Array<{
    date: string;
    duplicates: number;
    total: number;
  }>;
  topDuplicates: Array<{
    title: string;
    count: number;
    domains: string[];
  }>;
}

export interface TitleMetrics {
  averageTitleLength: number;
  shortestTitles: Array<{
    title: string;
    length: number;
    domain: string;
  }>;
  longestTitles: Array<{
    title: string;
    length: number;
    domain: string;
  }>;
  titleDistribution: {
    veryShort: number; // < 20 chars
    short: number; // 20-50 chars
    medium: number; // 50-100 chars
    long: number; // > 100 chars
  };
  commonWords: Array<{
    word: string;
    count: number;
    frequency: number;
  }>;
}

export interface CategorizationMetrics {
  totalCategorized: number;
  categorizationRate: number;
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  uncategorizedByDomain: Array<{
    domain: string;
    total: number;
    uncategorized: number;
    rate: number;
  }>;
  categorizationAccuracy: number;
}

export interface AIMetrics {
  totalAIRequests: number;
  successfulAIRequests: number;
  aiSuccessRate: number;
  averageResponseTime: number;
  aiOperationsByType: {
    sentimentAnalysis: number;
    summarization: number;
    categorization: number;
    rewriting: number;
    translation: number;
  };
  aiCosts: {
    totalCost: number;
    averageCostPerRequest: number;
    costByOperation: {
      [key: string]: number;
    };
  };
  aiAccuracy: {
    sentimentAccuracy: number;
    categorizationAccuracy: number;
    summarizationQuality: number;
  };
}

export interface DomainMetrics {
  totalDomains: number;
  activeDomains: number;
  domainsByActivity: Array<{
    domain: string;
    articleCount: number;
    lastActivity: string;
    successRate: number;
    averageProcessingTime: number;
  }>;
  topDomainsByArticles: Array<{
    domain: string;
    count: number;
    percentage: number;
  }>;
  domainsByCategory: Array<{
    category: string;
    domains: number;
    articles: number;
  }>;
  domainPerformance: {
    fastest: Array<{
      domain: string;
      avgTime: number;
    }>;
    slowest: Array<{
      domain: string;
      avgTime: number;
    }>;
    mostReliable: Array<{
      domain: string;
      successRate: number;
    }>;
    leastReliable: Array<{
      domain: string;
      successRate: number;
    }>;
  };
}

export interface RealTimeMetrics {
  currentActiveUsers: number;
  articlesPerMinute: number;
  scrapesPerMinute: number;
  systemLoad: {
    cpu: number;
    memory: number;
    disk: number;
  };
  activeJobs: number;
  queueSize: number;
  errorsPerMinute: number;
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface AllMetrics {
  general: GeneralMetrics;
  duplicates: DuplicateMetrics;
  titles: TitleMetrics;
  categorization: CategorizationMetrics;
  ai: AIMetrics;
  domains: DomainMetrics;
  lastUpdated: string;
}

class MetricsService {

  // ==================== Métricas Generales ====================

  async getGeneralMetrics(): Promise<GeneralMetrics> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/general`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        totalArticles: 0,
        totalScrapes: 0,
        successRate: 0,
        averageProcessingTime: 0,
        activeUsers: 0,
        totalDomains: 0,
        storageUsed: 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error en getGeneralMetrics:', error);
      throw error;
    }
  }

  // ==================== Métricas de Duplicados ====================

  async getDuplicateMetrics(): Promise<DuplicateMetrics> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/duplicates`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        totalDuplicates: 0,
        duplicateRate: 0,
        duplicatesByDomain: [],
        duplicatesByDate: [],
        topDuplicates: []
      };
    } catch (error) {
      console.error('Error en getDuplicateMetrics:', error);
      throw error;
    }
  }

  // ==================== Métricas de Títulos ====================

  async getTitleMetrics(): Promise<TitleMetrics> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/titles`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        averageTitleLength: 0,
        shortestTitles: [],
        longestTitles: [],
        titleDistribution: {
          veryShort: 0,
          short: 0,
          medium: 0,
          long: 0
        },
        commonWords: []
      };
    } catch (error) {
      console.error('Error en getTitleMetrics:', error);
      throw error;
    }
  }

  // ==================== Métricas de Categorización ====================

  async getCategorizationMetrics(): Promise<CategorizationMetrics> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/categorization`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        totalCategorized: 0,
        categorizationRate: 0,
        categoryDistribution: [],
        uncategorizedByDomain: [],
        categorizationAccuracy: 0
      };
    } catch (error) {
      console.error('Error en getCategorizationMetrics:', error);
      throw error;
    }
  }

  // ==================== Métricas de IA ====================

  async getAIMetrics(): Promise<AIMetrics> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/ai`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        totalAIRequests: 0,
        successfulAIRequests: 0,
        aiSuccessRate: 0,
        averageResponseTime: 0,
        aiOperationsByType: {
          sentimentAnalysis: 0,
          summarization: 0,
          categorization: 0,
          rewriting: 0,
          translation: 0
        },
        aiCosts: {
          totalCost: 0,
          averageCostPerRequest: 0,
          costByOperation: {}
        },
        aiAccuracy: {
          sentimentAccuracy: 0,
          categorizationAccuracy: 0,
          summarizationQuality: 0
        }
      };
    } catch (error) {
      console.error('Error en getAIMetrics:', error);
      throw error;
    }
  }

  // ==================== Métricas de Dominios ====================

  async getDomainMetrics(): Promise<DomainMetrics> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/domains`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        totalDomains: 0,
        activeDomains: 0,
        domainsByActivity: [],
        topDomainsByArticles: [],
        domainsByCategory: [],
        domainPerformance: {
          fastest: [],
          slowest: [],
          mostReliable: [],
          leastReliable: []
        }
      };
    } catch (error) {
      console.error('Error en getDomainMetrics:', error);
      throw error;
    }
  }

  // ==================== Métricas en Tiempo Real ====================

  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/realtime`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        currentActiveUsers: 0,
        articlesPerMinute: 0,
        scrapesPerMinute: 0,
        systemLoad: {
          cpu: 0,
          memory: 0,
          disk: 0
        },
        activeJobs: 0,
        queueSize: 0,
        errorsPerMinute: 0,
        responseTime: {
          p50: 0,
          p95: 0,
          p99: 0
        }
      };
    } catch (error) {
      console.error('Error en getRealTimeMetrics:', error);
      throw error;
    }
  }

  // ==================== Todas las Métricas ====================

  async getAllMetrics(): Promise<AllMetrics> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/all`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        general: {
          totalArticles: 0,
          totalScrapes: 0,
          successRate: 0,
          averageProcessingTime: 0,
          activeUsers: 0,
          totalDomains: 0,
          storageUsed: 0,
          lastUpdated: new Date().toISOString()
        },
        duplicates: {
          totalDuplicates: 0,
          duplicateRate: 0,
          duplicatesByDomain: [],
          duplicatesByDate: [],
          topDuplicates: []
        },
        titles: {
          averageTitleLength: 0,
          shortestTitles: [],
          longestTitles: [],
          titleDistribution: {
            veryShort: 0,
            short: 0,
            medium: 0,
            long: 0
          },
          commonWords: []
        },
        categorization: {
          totalCategorized: 0,
          categorizationRate: 0,
          categoryDistribution: [],
          uncategorizedByDomain: [],
          categorizationAccuracy: 0
        },
        ai: {
          totalAIRequests: 0,
          successfulAIRequests: 0,
          aiSuccessRate: 0,
          averageResponseTime: 0,
          aiOperationsByType: {
            sentimentAnalysis: 0,
            summarization: 0,
            categorization: 0,
            rewriting: 0,
            translation: 0
          },
          aiCosts: {
            totalCost: 0,
            averageCostPerRequest: 0,
            costByOperation: {}
          },
          aiAccuracy: {
            sentimentAccuracy: 0,
            categorizationAccuracy: 0,
            summarizationQuality: 0
          }
        },
        domains: {
          totalDomains: 0,
          activeDomains: 0,
          domainsByActivity: [],
          topDomainsByArticles: [],
          domainsByCategory: [],
          domainPerformance: {
            fastest: [],
            slowest: [],
            mostReliable: [],
            leastReliable: []
          }
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error en getAllMetrics:', error);
      throw error;
    }
  }

  // ==================== Funciones Utilitarias ====================

  // Formatear bytes para legibilidad
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Formatear porcentaje
  formatPercentage(value: number, decimals: number = 1): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  // Formatear tiempo
  formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  // Obtener color según rendimiento
  getPerformanceColor(value: number, type: 'success' | 'time' | 'load' = 'success'): string {
    if (type === 'success') {
      if (value >= 0.95) return 'text-green-600';
      if (value >= 0.85) return 'text-yellow-600';
      return 'text-red-600';
    } else if (type === 'time') {
      if (value <= 2) return 'text-green-600';
      if (value <= 5) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value <= 50) return 'text-green-600';
      if (value <= 75) return 'text-yellow-600';
      return 'text-red-600';
    }
  }

  // Generar datos para gráficos
  generateChartData(data: any[], key: string, label: string): Array<{
    name: string;
    value: number;
    percentage?: number;
  }> {
    const total = data.reduce((sum, item) => sum + (item[key] || 0), 0);
    
    return data.map(item => ({
      name: item.name || item.domain || item.category || 'Unknown',
      value: item[key] || 0,
      percentage: total > 0 ? ((item[key] || 0) / total) * 100 : 0
    }));
  }

  // Exportar métricas a CSV
  async exportMetricsToCSV(type: 'general' | 'domains' | 'ai' = 'general'): Promise<string> {
    try {
      let data: any;
      
      switch (type) {
        case 'general':
          data = await this.getGeneralMetrics();
          break;
        case 'domains':
          data = await this.getDomainMetrics();
          break;
        case 'ai':
          data = await this.getAIMetrics();
          break;
        default:
          throw new Error('Tipo de métrica no válido');
      }

      // Convertir a CSV (implementación básica)
      const csv = this.convertToCSV(data);
      return csv;
    } catch (error) {
      console.error('Error en exportMetricsToCSV:', error);
      throw error;
    }
  }

  private convertToCSV(data: any): string {
    // Implementación básica de conversión a CSV
    const headers = Object.keys(data);
    const values = headers.map(header => data[header]);
    
    return [headers.join(','), values.join(',')].join('\n');
  }
}

export const metricsService = new MetricsService();