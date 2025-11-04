import { useState, useEffect } from 'react';

export interface ScrapingStatsData {
  totalScrapes: number;
  totalScrapings: number; // Alias para compatibilidad
  extractedArticles: number;
  totalArticles: number; // Alias para compatibilidad
  successRate: number;
  avgProcessingTime: number;
  totalProcessingTime: number; // Para cálculos
  activeUrls: number;
  scrapingsToday: number;
  recentErrors: number;
  lastActivity: string;
  avgSpeed: number;
  averageSpeed: number; // Alias para compatibilidad
  memoryUsage: number;
  systemLoad: number;
  successfulScrapes: number;
  successfulScrapings: number; // Alias para compatibilidad
  failedScrapes: number;
  recentTrends?: any[]; // Para tendencias recientes
  trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
}

export const useScrapingStats = (refreshTrigger?: number) => {
  const [stats, setStats] = useState<ScrapingStatsData>({
    totalScrapes: 0,
    totalScrapings: 0,
    extractedArticles: 0,
    totalArticles: 0,
    successRate: 0,
    avgProcessingTime: 0,
    totalProcessingTime: 0,
    activeUrls: 0,
    scrapingsToday: 0,
    recentErrors: 0,
    lastActivity: 'Nunca',
    avgSpeed: 0,
    averageSpeed: 0,
    memoryUsage: 0,
    systemLoad: 0,
    successfulScrapes: 0,
    successfulScrapings: 0,
    failedScrapes: 0,
    recentTrends: [],
    trends: {
      daily: [],
      weekly: [],
      monthly: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simular datos de estadísticas por ahora
      // En una implementación real, esto haría una llamada a la API
      const mockStats: ScrapingStatsData = {
        totalScrapes: 1247,
        totalScrapings: 1247,
        extractedArticles: 3891,
        totalArticles: 3891,
        successRate: 94.2,
        avgProcessingTime: 2.3,
        totalProcessingTime: 2867, // totalScrapings * avgProcessingTime
        activeUrls: 15,
        scrapingsToday: 23,
        recentErrors: 2,
        lastActivity: new Date().toLocaleString(),
        avgSpeed: 1.8,
        averageSpeed: 1.8,
        memoryUsage: 67,
        systemLoad: 45,
        successfulScrapes: 1175, // 94.2% de 1247
        successfulScrapings: 1175,
        failedScrapes: 72, // 1247 - 1175
        recentTrends: [
          { date: '2024-01-01', value: 12 },
          { date: '2024-01-02', value: 19 },
          { date: '2024-01-03', value: 15 }
        ],
        trends: {
          daily: [12, 19, 15, 23, 18, 25, 21],
          weekly: [156, 189, 167, 201, 178, 234, 198],
          monthly: [1247, 1389, 1567, 1801, 1678, 1934, 2198]
        }
      };

      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStats(mockStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  return { stats, loading, error, refetch: fetchStats };
};