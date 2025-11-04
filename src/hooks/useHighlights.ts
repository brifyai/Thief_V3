'use client';

import { useQuery } from '@tanstack/react-query';
import type { HighlightsData } from '@/types/highlights';

// ⚠️ IMPORTANTE: La URL NO incluye /api, se agrega en cada llamada
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchHighlights(): Promise<HighlightsData> {
  // Obtener token de localStorage
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log('🔍 Fetching highlights from:', `${API_URL}/api/highlights`);

  const response = await fetch(`${API_URL}/api/highlights`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error('❌ Error response:', response.status, response.statusText);
    throw new Error(`Error fetching highlights: ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    console.error('❌ API error:', result.error);
    throw new Error(result.error || 'Failed to fetch highlights');
  }

  console.log('✅ Highlights loaded:', result.data.totalSections, 'sections');
  return result.data;
}

export function useHighlights() {
  return useQuery({
    queryKey: ['highlights'],
    queryFn: fetchHighlights,
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false,
    retry: 2,
  });
}