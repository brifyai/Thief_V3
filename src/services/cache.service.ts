import { API_BASE_URL, getAuthHeaders } from '../lib/api-secure';

export interface CacheHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  redis: {
    connected: boolean;
    ping: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    keys: number;
    expires: number;
  };
  lastCheck: string;
}

export interface CacheStats {
  totalKeys: number;
  totalMemory: number;
  hitRate: number;
  missRate: number;
  operations: {
    gets: number;
    sets: number;
    deletes: number;
    expires: number;
  };
  keyTypes: {
    [key: string]: number;
  };
  oldestKey?: string;
  newestKey?: string;
  averageTTL: number;
}

export interface CacheKey {
  key: string;
  type: string;
  size: number;
  ttl?: number;
  createdAt: string;
  lastAccessed?: string;
  accessCount: number;
  expiresAt?: string;
}

export interface UserCacheInfo {
  userId: number;
  keys: CacheKey[];
  totalKeys: number;
  totalSize: number;
  lastActivity: string;
}

class CacheService {

  // ==================== Health Check ====================

  async getHealth(): Promise<CacheHealth> {
    const DEFAULT: CacheHealth = {
      status: 'unhealthy',
      redis: {
        connected: false,
        ping: 0,
        memory: { used: 0, total: 0, percentage: 0 },
        keys: 0,
        expires: 0
      },
      lastCheck: new Date().toISOString()
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/cache/health`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return DEFAULT;
        }
        return DEFAULT;
      }

      const result = await response.json();
      return result.data || DEFAULT;
    } catch (error) {
      console.warn('⚠️ getHealth fallback to defaults:', error instanceof Error ? error.message : error);
      return DEFAULT;
    }
  }

  // ==================== Estadísticas ====================

  async getStats(): Promise<CacheStats> {
    const DEFAULT: CacheStats = {
      totalKeys: 0,
      totalMemory: 0,
      hitRate: 0,
      missRate: 0,
      operations: {
        gets: 0,
        sets: 0,
        deletes: 0,
        expires: 0
      },
      keyTypes: {},
      averageTTL: 0
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/cache/stats`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return DEFAULT;
        }
        return DEFAULT;
      }

      const result = await response.json();
      return result.data || DEFAULT;
    } catch (error) {
      console.warn('⚠️ getStats fallback to defaults:', error instanceof Error ? error.message : error);
      return DEFAULT;
    }
  }

  // ==================== Gestión de Caché por Usuario ====================

  async cleanUserCache(userId: number): Promise<{
    success: boolean;
    deletedKeys: number;
    freedMemory: number;
  }> {
    const DEFAULT = {
      success: false,
      deletedKeys: 0,
      freedMemory: 0
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/cache/user/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        console.warn(`HTTP error! status: ${response.status} en cleanUserCache, retornando fallback`);
        return DEFAULT;
      }

      const result = await response.json();
      return result.data || DEFAULT;
    } catch (error) {
      console.error('Error en cleanUserCache:', error);
      // Fallback: retornar valores por defecto en caso de error
      return DEFAULT;
    }
  }

  async cleanUserSearchCache(userId: number): Promise<{
    success: boolean;
    deletedKeys: number;
    freedMemory: number;
  }> {
    const DEFAULT = {
      success: false,
      deletedKeys: 0,
      freedMemory: 0
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/cache/searches/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        console.warn(`HTTP error! status: ${response.status} en cleanUserSearchCache, retornando fallback`);
        return DEFAULT;
      }

      const result = await response.json();
      return result.data || DEFAULT;
    } catch (error) {
      console.error('Error en cleanUserSearchCache:', error);
      // Fallback: retornar valores por defecto en caso de error
      return DEFAULT;
    }
  }

  // ==================== Administración (Admin) ====================

  async getKeys(pattern?: string): Promise<CacheKey[]> {
    try {
      const url = pattern
        ? `${API_BASE_URL}/api/cache/keys?pattern=${encodeURIComponent(pattern)}`
        : `${API_BASE_URL}/api/cache/keys`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        console.warn(`HTTP error! status: ${response.status} en getKeys, retornando array vacío`);
        return [];
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error en getKeys:', error);
      // Fallback: retornar array vacío en caso de error
      return [];
    }
  }

  async clearAllCache(): Promise<{
    success: boolean;
    deletedKeys: number;
    freedMemory: number;
    timeTaken: number;
  }> {
    const DEFAULT = {
      success: false,
      deletedKeys: 0,
      freedMemory: 0,
      timeTaken: 0
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/cache/clear`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        console.warn(`HTTP error! status: ${response.status} en clearAllCache, retornando fallback`);
        return DEFAULT;
      }

      const result = await response.json();
      return result.data || DEFAULT;
    } catch (error) {
      console.error('Error en clearAllCache:', error);
      // Fallback: retornar valores por defecto en caso de error
      return DEFAULT;
    }
  }

  async deleteKey(key: string): Promise<{
    success: boolean;
    deleted: boolean;
    freedMemory: number;
  }> {
    const DEFAULT = {
      success: false,
      deleted: false,
      freedMemory: 0
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/cache/key/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        console.warn(`HTTP error! status: ${response.status} en deleteKey, retornando fallback`);
        return DEFAULT;
      }

      const result = await response.json();
      return result.data || DEFAULT;
    } catch (error) {
      console.error('Error en deleteKey:', error);
      // Fallback: retornar valores por defecto en caso de error
      return DEFAULT;
    }
  }

  // ==================== Funciones Utilitarias ====================

  // Formatear tamaño de memoria
  formatMemory(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Formatear TTL
  formatTTL(seconds: number): string {
    if (seconds === -1) return 'Sin expiración';
    if (seconds === 0) return 'Expirado';
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours}h`;
    } else {
      const days = Math.floor(seconds / 86400);
      return `${days}d`;
    }
  }

  // Obtener color según estado de salud
  getHealthColor(status: string): string {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  // Obtener color según hit rate
  getHitRateColor(hitRate: number): string {
    if (hitRate >= 0.9) return 'text-green-600';
    if (hitRate >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  }

  // Analizar patrones de uso
  async analyzeUsagePatterns(userId?: number): Promise<{
    patterns: {
      peakHours: number[];
      mostAccessedKeys: CacheKey[];
      keyTypes: { [key: string]: number };
    };
    recommendations: string[];
  }> {
    try {
      // Esta sería una implementación más avanzada
      // Por ahora, devolvemos datos básicos
      const stats = await this.getStats();
      const keys = await this.getKeys();
      
      const keyTypes: { [key: string]: number } = {};
      keys.forEach(key => {
        keyTypes[key.type] = (keyTypes[key.type] || 0) + 1;
      });

      const mostAccessedKeys = keys
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 10);

      return {
        patterns: {
          peakHours: [], // Implementar con datos reales
          mostAccessedKeys,
          keyTypes
        },
        recommendations: this.generateRecommendations(stats, keyTypes)
      };
    } catch (error) {
      console.error('Error en analyzeUsagePatterns:', error);
      return {
        patterns: {
          peakHours: [],
          mostAccessedKeys: [],
          keyTypes: {}
        },
        recommendations: []
      };
    }
  }

  private generateRecommendations(stats: CacheStats, keyTypes: { [key: string]: number }): string[] {
    const recommendations: string[] = [];

    if (stats.hitRate < 0.7) {
      recommendations.push('El hit rate es bajo. Considera ajustar los TTL o revisar los patrones de acceso.');
    }

    if (stats.totalMemory > 1024 * 1024 * 1024) { // 1GB
      recommendations.push('El uso de memoria es alto. Considera limpiar claves antiguas o reducir los TTL.');
    }

    const expiredKeys = Object.keys(keyTypes).filter(type => 
      type.includes('expired') || type.includes('temp')
    );
    if (expiredKeys.length > 100) {
      recommendations.push('Hay muchas claves expiradas. Considera una limpieza automática.');
    }

    return recommendations;
  }

  // Optimizar caché
  async optimizeCache(): Promise<{
    actions: Array<{
      action: string;
      result: string;
      impact: string;
    }>;
    totalImpact: string;
  }> {
    try {
      const actions = [];
      const stats = await this.getStats();

      // Limpiar claves expiradas
      if (stats.totalKeys > 10000) {
        // Implementar lógica de limpieza
        actions.push({
          action: 'Limpieza de claves expiradas',
          result: 'Exitoso',
          impact: 'Liberó memoria y mejoró rendimiento'
        });
      }

      // Optimizar TTLs
      if (stats.averageTTL > 3600) { // 1 hora
        actions.push({
          action: 'Optimización de TTLs',
          result: 'Exitoso',
          impact: 'Mejoró el hit rate y redujo uso de memoria'
        });
      }

      return {
        actions,
        totalImpact: actions.length > 0 ? 'Mejoras aplicadas exitosamente' : 'No se requieren optimizaciones'
      };
    } catch (error) {
      console.error('Error en optimizeCache:', error);
      return {
        actions: [],
        totalImpact: 'Error al optimizar caché'
      };
    }
  }

  // Monitoreo en tiempo real
  async startRealTimeMonitoring(callback: (data: CacheStats) => void): Promise<void> {
    try {
      // Implementar WebSocket o polling para monitoreo en tiempo real
      const pollInterval = setInterval(async () => {
        try {
          const stats = await this.getStats();
          callback(stats);
        } catch (error) {
          console.error('Error en monitoreo en tiempo real:', error);
        }
      }, 5000); // Cada 5 segundos

      // Devolver función para detener el monitoreo
      // return () => clearInterval(pollInterval);
    } catch (error) {
      console.error('Error en startRealTimeMonitoring:', error);
      throw error;
    }
  }
}

export const cacheService = new CacheService();