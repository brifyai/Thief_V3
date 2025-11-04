'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';

// Crear cliente de React Query con configuración optimizada
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tiempo en ms que los datos se consideran frescos
      staleTime: 5 * 60 * 1000, // 5 minutos
      // Tiempo en ms que los datos se mantienen en caché (gcTime en v5)
      gcTime: 10 * 60 * 1000, // 10 minutos
      // Número de reintentos automáticos
      retry: (failureCount, error) => {
        // Verificar si es un error con status (HTTP error)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const httpError = error as any;
        // No reintentar en errores 4xx (cliente)
        if (httpError?.status && httpError.status >= 400 && httpError.status < 500) {
          return false;
        }
        // Reintentar hasta 3 veces en errores 5xx (servidor)
        return failureCount < 3;
      },
      // Tiempo entre reintentos (exponential backoff)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch en window focus (desactivado para mejor UX)
      refetchOnWindowFocus: false,
      // Refetch en reconnect (activado para datos frescos)
      refetchOnReconnect: true,
    },
    mutations: {
      // Reintentos para mutations
      retry: 1,
    },
  },
});

interface ReactQueryProviderProps {
  children: ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  );
}

// Hooks personalizados para queries comunes
export const queryKeys = {
  // Auth
  auth: ['auth'] as const,
  user: ['user'] as const,
  
  // Entities
  entities: ['entities'] as const,
  entity: (id: string) => ['entities', id] as const,
  entityStats: (id: string) => ['entities', id, 'stats'] as const,
  entityMentions: (id: string) => ['entities', id, 'mentions'] as const,
  entityAlerts: (id: string) => ['entities', id, 'alerts'] as const,
  
  // Articles
  articles: ['articles'] as const,
  article: (id: string) => ['articles', id] as const,
  savedArticles: ['saved-articles'] as const,
  
  // Search
  search: ['search'] as const,
  searchFilters: ['search', 'filters'] as const,
  
  // URLs
  publicUrls: ['public-urls'] as const,
  myUrls: ['my-urls'] as const,
  
  // Scraping
  scrapingHistory: ['scraping', 'history'] as const,
  
  // Metrics
  metrics: ['metrics'] as const,
  
  // Highlights
  highlights: ['highlights'] as const,
};

// Utilidades para invalidación de caché
export const invalidateQueries = {
  // Invalidar todas las queries de entidades
  entities: () => queryClient.invalidateQueries({ queryKey: ['entities'] }),
  
  // Invalidar queries de un usuario específico
  user: () => queryClient.invalidateQueries({ queryKey: ['user'] }),
  
  // Invalidar artículos guardados
  savedArticles: () => queryClient.invalidateQueries({ queryKey: ['saved-articles'] }),
  
  // Invalidar URLs del usuario
  myUrls: () => queryClient.invalidateQueries({ queryKey: ['my-urls'] }),
  
  // Invalidar todo (para logout o cambios globales)
  all: () => queryClient.clear(),
};

// Utilidades para prefetching de datos
export const prefetchQueries = {
  // Prefetch datos del usuario
  user: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.user,
      queryFn: async () => {
        // Importar dinámicamente para evitar circular dependencies
        const authModule = await import('../services/auth.service');
        const { getCurrentUser } = authModule;
        const token = localStorage.getItem('token');
        if (!token) return null;
        return getCurrentUser(token);
      },
      staleTime: 2 * 60 * 1000, // 2 minutos
    });
  },
  
  // Prefetch URLs públicas
  publicUrls: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.publicUrls,
      queryFn: async () => {
        const urlsModule = await import('../services/urls.service');
        const { urlsService } = urlsModule;
        return urlsService.getPublicUrls();
      },
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  },
};