'use client';

import { useQuery } from '@tanstack/react-query';
import type { QuickStatsData } from '@/types/stats';

// ⚠️ IMPORTANTE: La URL NO incluye /api, se agrega en cada llamada
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchQuickStats(): Promise<QuickStatsData> {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log('🔍 Fetching stats from:', `${API_URL}/api/highlights/stats`);

  const response = await fetch(`${API_URL}/api/highlights/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error('❌ Error response:', response.status);
    throw new Error(`Error fetching stats: ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    console.error('❌ API error:', result.error);
    throw new Error(result.error || 'Failed to fetch stats');
  }

  console.log('✅ Stats loaded:', result.data);
  return result.data;
}

export function useQuickStats() {
  return useQuery({
    queryKey: ['quickStats'],
    queryFn: fetchQuickStats,
    staleTime: 60000, // 1 minuto
    refetchInterval: 60000, // Auto-refresh cada minuto
    refetchOnWindowFocus: true,
    retry: 2
  });
}
