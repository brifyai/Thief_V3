'use client';

import { useQuery } from '@tanstack/react-query';
import { entityService, type MentionsFilter } from '@/services/entity.service';
import { queryKeys } from '@/lib/react-query';
import { useApiErrorHandler } from './useErrorHandler';

export function useEntityMentions(id: string, filters?: MentionsFilter) {
  const { handleApiError } = useApiErrorHandler();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.entityMentions(id), filters],
    queryFn: () => entityService.getEntityMentions(id, filters),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // DEBUG: Ver respuesta de la API
  console.log('📡 useEntityMentions API Response:', {
    id,
    filters,
    data,
    dataData: data?.data,
    dataPagination: data?.pagination,
    isLoading,
    error
  });

  return {
    mentions: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
  };
}
