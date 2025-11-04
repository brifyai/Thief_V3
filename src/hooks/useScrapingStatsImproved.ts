import { useState, useEffect, useCallback } from 'react';
import { metricsService } from '../services/metrics.service';

export interface ScrapingStatsData {
  totalScrapes: number;
  totalScrapings: number;
  extractedArticles: number;
  totalArticles: number;
  successRate: number;
  avgProcessingTime: number;
  totalProcessingTime: number;
  activeUrls: number;
  scrapingsToday: number;
  recentErrors: number;
  lastActivity: string;
  avgSpeed: number;
  averageSpeed: number;
  memoryUsage: number;
  systemLoad: number;
  successfulScrapes: number;
  successfulScrapings: number;
  failedScrapes: number;
  recentTrends?: Array<{ date: string; value: number }>;
  trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
}

export const useScrapingStatsImproved = (refreshTrigger?: number) => {
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

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Usar el servicio real en lugar de mock data
      const generalMetrics = await metricsService.getGeneralMetrics();
      
      const realStats: ScrapingStatsData = {
        totalScrapes: generalMetrics.totalScrapes,
        totalScrapings: generalMetrics.totalScrapes,
        extractedArticles: generalMetrics.totalArticles,
        totalArticles: generalMetrics.totalArticles,
        successRate: generalMetrics.successRate,
        avgProcessingTime: generalMetrics.averageProcessingTime,
        totalProcessingTime: generalMetrics.totalScrapes * generalMetrics.averageProcessingTime,
        activeUrls: generalMetrics.totalDomains,
        scrapingsToday: 0, // Este dato debería venir de una API específica
        recentErrors: 0, // Este dato debería venir de una API específica
        lastActivity: generalMetrics.lastUpdated,
        avgSpeed: generalMetrics.totalArticles / Math.max(generalMetrics.averageProcessingTime, 1),
        averageSpeed: generalMetrics.totalArticles / Math.max(generalMetrics.averageProcessingTime, 1),
        memoryUsage: 0, // Este dato debería venir de métricas del sistema
        systemLoad: 0, // Este dato debería venir de métricas del sistema
        successfulScrapes: Math.round(generalMetrics.totalScrapes * generalMetrics.successRate),
        successfulScrapings: Math.round(generalMetrics.totalScrapes * generalMetrics.successRate),
        failedScrapes: Math.round(generalMetrics.totalScrapes * (1 - generalMetrics.successRate)),
        recentTrends: [], // Este dato debería venir de una API de tendencias
        trends: {
          daily: [],
          weekly: [],
          monthly: []
        }
      };
      
      setStats(realStats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar estadísticas';
      setError(errorMessage);
      console.error('Error fetching scraping stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);

  return { stats, loading, error, refetch: fetchStats };
};