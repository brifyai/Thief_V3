'use client';

import { useQuery } from '@tanstack/react-query';
import type { HighlightsData } from '@/types/highlights';

// ⚠️ IMPORTANTE: La URL NO incluye /api, se agrega en cada llamada
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchHighlights(): Promise<HighlightsData> {
  // Obtener token de localStorage
  const token = localStorage.getItem('token');
  
  const emptyHighlights: HighlightsData = {
    hasContent: false,
    totalSections: 0,
    sections: [],
    generatedAt: new Date().toISOString()
  };
  
  if (!token) {
    // Retornar datos vacíos en lugar de lanzar error
    console.warn('⚠️ No authentication token found, returning empty highlights');
    return emptyHighlights;
  }

  console.log('🔍 Fetching highlights from:', `${API_URL}/api/highlights`);

  try {
    const response = await fetch(`${API_URL}/api/highlights`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('⚠️ Error response:', response.status, response.statusText, '- returning empty highlights');
      // Retornar datos vacíos en lugar de lanzar error para 401/403
      return emptyHighlights;
    }

    const result = await response.json();
    
    if (!result.success) {
      console.warn('⚠️ API error:', result.error, '- returning empty highlights');
      // Retornar datos vacíos en lugar de lanzar error
      return emptyHighlights;
    }

    console.log('✅ Highlights loaded:', result.data.totalSections, 'sections');
    return result.data;
  } catch (error) {
    console.error('❌ Error fetching highlights:', error);
    // Retornar datos vacíos en caso de error de red
    return emptyHighlights;
  }
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