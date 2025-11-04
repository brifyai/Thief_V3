// Servicio simplificado para AI Tokens con mejor manejo de errores y debugging
import { API_BASE_URL } from '../lib/api-secure';

// Interfaces simplificadas basadas en la documentación del backend
export interface SimpleTodayStats {
  total_operations: number;
  total_tokens: number;
  total_cost: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  by_operation: Record<string, {
    operations: number;
    tokens: number;
    cost: number;
  }>;
}

export interface SimpleAlert {
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

export interface SimpleTopOperation {
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

export interface SimpleAIModel {
  name: string;
  input_cost_per_1m: number;
  output_cost_per_1m: number;
  input_cost_formatted: string;
  output_cost_formatted: string;
}

export interface SimpleCalculatorData {
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

class SimpleAITokensService {
  private getAuthHeaders(): Record<string, string> {
    if (typeof window === 'undefined') {
      return {};
    }

    const token = localStorage.getItem('token');
    
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async handleResponse<T>(response: Response, endpoint: string): Promise<T> {
    console.log(`📥 Respuesta de ${endpoint}:`, response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error en ${endpoint}:`, response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('No autorizado. Por favor inicia sesión nuevamente.');
      }
      
      if (response.status === 403) {
        throw new Error('Acceso denegado. Se requieren permisos de administrador.');
      }
      
      if (response.status === 404) {
        throw new Error(`Endpoint no encontrado: ${endpoint}`);
      }
      
      // Intentar parsear error JSON
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || errorData.message || `Error ${response.status}`);
      } catch {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    }

    try {
      const data = await response.json();
      console.log(`✅ Datos recibidos de ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Error parseando JSON de ${endpoint}:`, error);
      throw new Error('Error al procesar la respuesta del servidor');
    }
  }

  // ==================== Estadísticas del Día ====================

  async getTodayStats(): Promise<SimpleTodayStats> {
    try {
      console.log('🔍 Obteniendo estadísticas del día...');
      
      const response = await fetch(`${API_BASE_URL}/ai-usage/stats/today`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await this.handleResponse<{ success: boolean; data: SimpleTodayStats }>(response, 'stats/today');
      
      if (!result.success || !result.data) {
        console.warn('⚠️ Respuesta sin datos válidos, usando defaults');
        return this.getDefaultTodayStats();
      }
      
      return result.data;
    } catch (error) {
      console.error('❌ Error en getTodayStats:', error);
      // En caso de error, retornar datos por defecto para que la UI no se rompa
      return this.getDefaultTodayStats();
    }
  }

  private getDefaultTodayStats(): SimpleTodayStats {
    return {
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
  }

  // ==================== Alertas ====================

  async getAlerts(resolved: boolean = false, limit: number = 50): Promise<SimpleAlert[]> {
    try {
      console.log(`🔍 Obteniendo alertas (resolved=${resolved}, limit=${limit})...`);
      
      const params = new URLSearchParams({
        resolved: resolved.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_BASE_URL}/ai-usage/alerts?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await this.handleResponse<{ success: boolean; data: SimpleAlert[] }>(response, 'alerts');
      
      return result.data || [];
    } catch (error) {
      console.error('❌ Error en getAlerts:', error);
      return [];
    }
  }

  async resolveAlert(alertId: number): Promise<{ id: number; resolved: boolean; resolved_at: string }> {
    try {
      console.log(`🔍 Resolviendo alerta ${alertId}...`);
      
      const response = await fetch(`${API_BASE_URL}/ai-usage/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      const result = await this.handleResponse<{ success: boolean; data: { id: number; resolved: boolean; resolved_at: string } }>(response, `alerts/${alertId}/resolve`);
      
      return result.data;
    } catch (error) {
      console.error('❌ Error en resolveAlert:', error);
      throw error;
    }
  }

  // ==================== Operaciones Más Costosas ====================

  async getTopOperations(limit: number = 10, days: number = 7): Promise<SimpleTopOperation[]> {
    try {
      console.log(`🔍 Obteniendo top operaciones (limit=${limit}, days=${days})...`);
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        days: days.toString()
      });

      const response = await fetch(`${API_BASE_URL}/ai-usage/top-operations?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await this.handleResponse<{ success: boolean; data: SimpleTopOperation[] }>(response, 'top-operations');
      
      return result.data || [];
    } catch (error) {
      console.error('❌ Error en getTopOperations:', error);
      return [];
    }
  }

  // ==================== Modelos Disponibles ====================

  async getAvailableModels(): Promise<SimpleAIModel[]> {
    try {
      console.log('🔍 Obteniendo modelos disponibles...');
      
      const response = await fetch(`${API_BASE_URL}/ai-usage/models`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await this.handleResponse<{ success: boolean; data: SimpleAIModel[] }>(response, 'models');
      
      return result.data || [];
    } catch (error) {
      console.error('❌ Error en getAvailableModels:', error);
      // Retornar modelo por defecto
      return [{
        name: 'llama3-8b-8192',
        input_cost_per_1m: 0.05,
        output_cost_per_1m: 0.08,
        input_cost_formatted: '$0.05/1M tokens',
        output_cost_formatted: '$0.08/1M tokens'
      }];
    }
  }

  // ==================== Calculadora de Costos ====================

  async calculateCost(tokens: number, model: string = 'llama3-8b-8192', type: 'input' | 'output' = 'input'): Promise<SimpleCalculatorData> {
    try {
      console.log(`🔍 Calculando costo (tokens=${tokens}, model=${model}, type=${type})...`);
      
      const params = new URLSearchParams({
        tokens: tokens.toString(),
        model,
        type
      });

      const response = await fetch(`${API_BASE_URL}/ai-usage/calculator?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await this.handleResponse<{ success: boolean; data: SimpleCalculatorData }>(response, 'calculator');
      
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
      console.error('❌ Error en calculateCost:', error);
      throw error;
    }
  }

  // ==================== Funciones Utilitarias ====================

  formatCost(cost: number): string {
    return `$${cost.toFixed(6)} USD`;
  }

  formatNumber(num: number): string {
    return num.toLocaleString('es-CL');
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleString('es-CL');
    } catch {
      return dateString;
    }
  }

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

  getOperationLabel(operationType: string): string {
    const labels: Record<string, string> = {
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

  // Función de diagnóstico
  async diagnoseConnection(): Promise<{ status: 'ok' | 'error'; message: string; details?: Record<string, unknown> }> {
    try {
      console.log('🔍 Diagnosticando conexión con el backend...');
      
      // Verificar token
      const token = localStorage.getItem('token');
      if (!token) {
        return {
          status: 'error',
          message: 'No hay token de autenticación en localStorage'
        };
      }

      // Verificar API base URL
      console.log('📡 API Base URL:', API_BASE_URL);

      // Intentar hacer una petición simple
      const response = await fetch(`${API_BASE_URL}/ai-usage/stats/today`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await this.handleResponse<{ success: boolean; data: Record<string, unknown> }>(response, 'diagnosis');
      
      return {
        status: 'ok',
        message: 'Conexión exitosa con el backend',
        details: {
          api_url: API_BASE_URL,
          token_present: !!token,
          response_status: response.status,
          data_keys: Object.keys(result.data || {})
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido',
        details: {
          api_url: API_BASE_URL,
          token_present: !!localStorage.getItem('token')
        }
      };
    }
  }
}

export const simpleAITokensService = new SimpleAITokensService();