export interface NewsArticle {
  id: number;
  title: string;
  summary: string | null;
  category: string;
  domain: string;
  scraped_at: string;
  content_length?: number;
}

export interface HighlightSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  news: NewsArticle[];
}

export interface HighlightsData {
  hasContent: boolean;
  totalSections: number;
  sections: HighlightSection[];
  generatedAt: string;
  message?: string;
}

export interface HighlightsResponse {
  success: boolean;
  data: HighlightsData;
  error?: string;
}

export const sectionColors = {
  latest: '#dc2626',      // Rojo
  'most-read': '#2563eb', // Azul
  trending: '#059669',    // Verde
  recommended: '#d97706', // Naranja
  // Categorías
  política: '#dc2626',
  economía: '#059669',
  deportes: '#2563eb',
  tecnología: '#7c3aed',
  salud: '#db2777',
  educación: '#0891b2',
  entretenimiento: '#ea580c',
  seguridad: '#dc2626',
  'medio ambiente': '#16a34a',
  internacional: '#4f46e5',
  sociedad: '#0284c7',
  general: '#6b7280'
} as const;