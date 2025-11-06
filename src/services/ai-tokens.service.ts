import { API_BASE_URL, getAuthHeaders } from '../lib/api-secure';

// Interfaces basadas en los endpoints del backend
export interface TodayStats {
  total_operations: number;
  total_tokens: number;
  total_cost: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  by_operation: {
    search: {
      operations: number;
      tokens: number;
      cost: number;
    };
    sentiment: {
      operations: number;
      tokens: number;
      cost: number;
    };
    entity: {
      operations: number;
      tokens: number;
      cost: number;
    };
    clustering: {
      operations: number;
      tokens: number;
      cost: number;
    };
    synonym: {
      operations: number;
      tokens: number;
      cost: number;
    };
    pattern: {
      operations: number;
      tokens: number;
      cost: number;
    };
    other: {
      operations: number;
      tokens: number;
      cost: number;
    };
  };
}

export interface RangeStats {
  range: {
    start: string;
    end: string;
  };
  totals: {
    operations: number;
    tokens: number;
    cost: number;
  };
  by_operation: Array<{
    operation_type: string;
    operations: number;
    tokens: number;
    cost: number;
    avg_cost: number;
    avg_duration_ms: number;
  }>;
  cache: {
    hits: number;
    misses: number;
    hit_rate: number;
  };
}

export interface CalculatorData {
  tokens: number;
  model: string;
  type: 'input' | 'output';
  cost_usd: number;
  cost_formatted: string;
  model_pricing: {
    input_per_1m: number;
    output_per_1m: number;
  };
}

export interface Alert {
  id: number;
  alert_type: string;
  threshold: number;
  current_value: number;
  message: string;
  severity: 'info' | 'warning' | 'error';
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface TopOperation {
  id: number;
  operation_type: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  model_used: string;
  duration_ms: number;
  cache_hit: boolean;
  created_at: string;
  user_id: number;
  endpoint: string;
}

export interface AIModel {
  name: string;
  input_cost_per_1m: number;
  output_cost_per_1m: number;
  input_cost_formatted: string;
  output_cost_formatted: string;
}

class AITokensService {
  // ==================== Estadísticas del Día ====================

  async getTodayStats(): Promise<TodayStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-usage/stats/today`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        total_operations: 0,
        total_tokens: 0,
        total_cost: 0,
        cache_hits: 0,
        cache_misses: 0,
        cache_hit_rate: 0,
        by_operation: {
          search: { operations: 0, tokens: 0, cost: 0 },
          sentiment: { operations: 0, tokens: 0, cost: 0 },
          entity: { operations: 0, tokens: 0, cost: 0 },
          clustering: { operations: 0, tokens: 0, cost: 0 },
          synonym: { operations: 0, tokens: 0, cost: 0 },
          pattern: { operations: 0, tokens: 0, cost: 0 },
          other: { operations: 0, tokens: 0, cost: 0 }
        }
      };
    } catch (error) {
      console.error('Error en getTodayStats:', error);
      throw error;
    }
  }

  // ==================== Estadísticas por Rango ====================

  async getRangeStats(startDate: string, endDate: string): Promise<RangeStats> {
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });

      const response = await fetch(`${API_BASE_URL}/api/ai-usage/stats/range?${params}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        range: { start: startDate, end: endDate },
        totals: { operations: 0, tokens: 0, cost: 0 },
        by_operation: [],
        cache: { hits: 0, misses: 0, hit_rate: 0 }
      };
    } catch (error) {
      console.error('Error en getRangeStats:', error);
      throw error;
    }
  }

  // ==================== Calculadora de Costos ====================

  async calculateCost(tokens: number, model: string = 'llama3-8b-8192', type: 'input' | 'output' = 'input'): Promise<CalculatorData> {
    try {
      const params = new URLSearchParams({
        tokens: tokens.toString(),
        model,
        type
      });

      const response = await fetch(`${API_BASE_URL}/api/ai-usage/calculator?${params}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {
        tokens,
        model,
        type,
        cost_usd: 0,
        cost_formatted: '$0.000000 USD',
        model_pricing: {
          input_per_1m: 0,
          output_per_1m: 0
        }
      };
    } catch (error) {
      console.error('Error en calculateCost:', error);
      throw error;
    }
  }

  // ==================== Alertas ====================

  async getAlerts(resolved: boolean = false, limit: number = 50): Promise<Alert[]> {
    try {
      const params = new URLSearchParams({
        resolved: resolved.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_BASE_URL}/api/ai-usage/alerts?${params}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getAlerts:', error);
      throw error;
    }
  }

  async resolveAlert(alertId: number): Promise<{ id: number; resolved: boolean; resolved_at: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-usage/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error en resolveAlert:', error);
      throw error;
    }
  }

  // ==================== Operaciones Más Costosas ====================

  async getTopOperations(limit: number = 10, days: number = 7): Promise<TopOperation[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        days: days.toString()
      });

      const response = await fetch(`${API_BASE_URL}/api/ai-usage/top-operations?${params}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getTopOperations:', error);
      throw error;
    }
  }

  // ==================== Modelos Disponibles ====================

  async getAvailableModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-usage/models`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getAvailableModels:', error);
      throw error;
    }
  }

  // ==================== Funciones Utilitarias ====================

  // Formatear costo
  formatCost(cost: number): string {
    return `$${cost.toFixed(6)} USD`;
  }

  // Formatear número con separadores de miles
  formatNumber(num: number): string {
    return num.toLocaleString('es-CL');
  }

  // Formatear porcentaje
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  // Formatear fecha
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('es-CL');
  }

  // Formatear duración en ms
  formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  // Exportar a CSV
  exportToCSV(data: Record<string, unknown>[], filename: string): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escapar comillas y envolver en comillas si contiene comas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Exportar a JSON
  exportToJSON(data: unknown, filename: string): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Obtener color según severidad
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  }

  // Obtener etiqueta de operación en español
  getOperationLabel(operationType: string): string {
    const labels: { [key: string]: string } = {
      search: 'Búsqueda',
      sentiment: 'Análisis de Sentimiento',
      entity: 'Extracción de Entidades',
      clustering: 'Clustering',
      synonym: 'Sinónimos',
      pattern: 'Patrones',
      other: 'Otro'
    };
    return labels[operationType] || operationType;
  }
}

export const aiTokensService = new AITokensService();