'use client';

import { useQuery } from '@tanstack/react-query';
import type { QuickStatsData } from '@/types/stats';
import { API_BASE_URL, getAuthHeaders, hasValidToken } from '@/lib/api-secure';

const DEFAULT_STATS: QuickStatsData = {
  total: 0,
  today: 0,
  thisWeek: 0,
  categories: 0,
};

async function fetchQuickStats(): Promise<QuickStatsData> {
  // Si no hay token válido, devolver valores por defecto
  if (typeof window === 'undefined' || !hasValidToken()) {
    return DEFAULT_STATS;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/metrics/general`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    // Manejo amable de 401/403 para no ensuciar consola ni romper UI
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return DEFAULT_STATS;
      }
      throw new Error(`Error fetching stats: ${response.status}`);
    }

    const result = await response.json();

    if (!result?.success) {
      return DEFAULT_STATS;
    }

    // Mapear los datos de métricas generales al formato QuickStats
    const metricsData = result.data;
    return {
      total: metricsData.totalNews || 0,
      today: metricsData.todayNews || 0,
      thisWeek: metricsData.weeklyNews || 0,
      categories: metricsData.totalCategories || 0,
    };
  } catch (error) {
    console.warn('❌ Error obteniendo quick stats:', error);
    return DEFAULT_STATS;
  }
}

export function useQuickStats() {
  const enabled =
    typeof window !== 'undefined' && hasValidToken();

  return useQuery({
    queryKey: ['quickStats'],
    queryFn: fetchQuickStats,
    enabled,
    staleTime: 60000, // 1 minuto
    refetchInterval: 60000, // Auto-refresh cada minuto
    refetchOnWindowFocus: true,
    retry: 1,
    select: (data) => data ?? DEFAULT_STATS, // Asegurar que nunca sea undefined
  });
}
