import React from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Limpiar cache expirado cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set<T>(key: string, data: T, ttl: number = 300000): void { // 5 minutos default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Limpiar items expirados
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Obtener estadísticas del cache
  getStats(): {
    size: number;
    items: Array<{
      key: string;
      age: number;
      ttl: number;
      expired: boolean;
    }>;
  } {
    const now = Date.now();
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      age: now - item.timestamp,
      ttl: item.ttl,
      expired: now - item.timestamp > item.ttl,
    }));

    return {
      size: this.cache.size,
      items,
    };
  }

  // Destruir el cache manager
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Instancia global del cache manager
export const cacheManager = new CacheManager();

// Hook personalizado para usar el cache
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300000,
  dependencies: React.DependencyList = []
) {
  const [data, setData] = React.useState<T | null>(() => cacheManager.get<T>(key));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      cacheManager.set(key, result, ttl);
      setData(result);
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      // Intentar usar datos del cache si hay un error
      const cachedData = cacheManager.get<T>(key);
      if (cachedData) {
        console.warn('Fetch failed, using cached data:', error);
        setData(cachedData);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl]);

  // Cargar datos al montar o cuando cambian las dependencias
  React.useEffect(() => {
    if (!cacheManager.has(key)) {
      fetchData();
    }
  }, [fetchData, key, ...dependencies]);

  // Refetch manual
  const refetch = React.useCallback(() => {
    return fetchData();
  }, [fetchData]);

  // Limpiar cache
  const clearCache = React.useCallback(() => {
    cacheManager.delete(key);
    setData(null);
  }, [key]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
  };
}

// Cache específico para API responses
export class ApiCache {
  private prefix: string;

  constructor(prefix: string = 'api') {
    this.prefix = prefix;
  }

  private getKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${this.prefix}:${endpoint}:${paramString}`;
  }

  set<T>(endpoint: string, data: T, ttl?: number, params?: Record<string, any>): void {
    const key = this.getKey(endpoint, params);
    cacheManager.set(key, data, ttl);
  }

  get<T>(endpoint: string, params?: Record<string, any>): T | null {
    const key = this.getKey(endpoint, params);
    return cacheManager.get<T>(key);
  }

  has(endpoint: string, params?: Record<string, any>): boolean {
    const key = this.getKey(endpoint, params);
    return cacheManager.has(key);
  }

  delete(endpoint: string, params?: Record<string, any>): boolean {
    const key = this.getKey(endpoint, params);
    return cacheManager.delete(key);
  }

  clear(): void {
    const stats = cacheManager.getStats();
    stats.items
      .filter(item => item.key.startsWith(`${this.prefix}:`))
      .forEach(item => cacheManager.delete(item.key));
  }
}

// Instancia del cache para API
export const apiCache = new ApiCache();