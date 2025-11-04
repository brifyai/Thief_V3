'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entityService } from '@/services/entity.service';
import { queryKeys, invalidateQueries } from '@/lib/react-query';
import { useApiErrorHandler } from './useErrorHandler';
import toast from 'react-hot-toast';

export function useEntityAlerts(id: string) {
  const { handleApiError } = useApiErrorHandler();

  const {
    data: alerts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.entityAlerts(id),
    queryFn: () => entityService.getEntityAlerts(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchInterval: 2 * 60 * 1000, // Refrescar cada 2 minutos
  });

  return {
    alerts,
    isLoading,
    error,
    refetch,
  };
}

export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();
  const { handleApiError } = useApiErrorHandler();

  const mutation = useMutation({
    mutationFn: (alertId: string) => entityService.markAlertAsRead(alertId),
    onSuccess: () => {
      toast.success('✅ Alerta marcada como leída');
      // Invalidar todas las alertas
      queryClient.invalidateQueries({ 
        queryKey: ['entities'],
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key.some(k => k === 'alerts');
        }
      });
    },
    onError: (error) => {
      handleApiError(error, 'Error al marcar alerta como leída');
    },
  });

  return {
    markAsRead: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
