'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { entityService, type EntitiesFilter } from '@/services/entity.service';
import type { Entity, CreateEntityInput, EntityTimeline, AnalyzeResponse } from '@/types/entities';
import { queryKeys, invalidateQueries } from '@/lib/react-query';
import { useApiErrorHandler } from './useErrorHandler';

export function useEntities(filters?: EntitiesFilter) {
  const { handleApiError } = useApiErrorHandler();

  const {
    data: entities = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.entities, filters],
    queryFn: () => entityService.getEntities(filters),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    entities,
    isLoading,
    error,
    refetch,
  };
}

export function useEntity(id: string) {
  const { handleApiError } = useApiErrorHandler();

  const {
    data: entity,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.entity(id),
    queryFn: () => entityService.getEntity(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    entity,
    isLoading,
    error,
    refetch,
  };
}

export function useEntityTimeline(id: string, options?: { days?: number }) {
  const { handleApiError } = useApiErrorHandler();

  const {
    data: timeline = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.entityStats(id), 'timeline', options],
    queryFn: () => entityService.getEntityTimeline(id, options),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });

  return {
    timeline,
    isLoading,
    error,
    refetch,
  };
}

export function useEntityStats(id: string) {
  const { handleApiError } = useApiErrorHandler();

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.entityStats(id),
    queryFn: () => entityService.getEntityStats(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchInterval: 5 * 60 * 1000, // Refrescar cada 5 minutos
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}

export function useCreateEntity() {
  const queryClient = useQueryClient();
  const { handleApiError } = useApiErrorHandler();

  const mutation = useMutation({
    mutationFn: (data: CreateEntityInput) => entityService.createEntity(data),
    onSuccess: (data) => {
      toast.success(`✅ Entidad "${data.name}" creada exitosamente`);
      invalidateQueries.entities();
    },
    onError: (error) => {
      handleApiError(error, 'Error al crear entidad');
    },
  });

  return {
    createEntity: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useUpdateEntity() {
  const queryClient = useQueryClient();
  const { handleApiError } = useApiErrorHandler();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEntityInput> & { is_active?: boolean } }) => 
      entityService.updateEntity(id, data),
    onSuccess: (data) => {
      toast.success(`✅ Entidad "${data.name}" actualizada exitosamente`);
      invalidateQueries.entities();
      queryClient.invalidateQueries({ queryKey: queryKeys.entity(data.id.toString()) });
    },
    onError: (error) => {
      handleApiError(error, 'Error al actualizar entidad');
    },
  });

  return {
    updateEntity: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useDeleteEntity() {
  const queryClient = useQueryClient();
  const { handleApiError } = useApiErrorHandler();

  const mutation = useMutation({
    mutationFn: (id: string) => entityService.deleteEntity(id),
    onSuccess: () => {
      toast.success('✅ Entidad eliminada exitosamente');
      invalidateQueries.entities();
    },
    onError: (error) => {
      handleApiError(error, 'Error al eliminar entidad');
    },
  });

  return {
    deleteEntity: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useToggleEntityStatus() {
  const queryClient = useQueryClient();
  const { handleApiError } = useApiErrorHandler();

  const mutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      entityService.toggleEntityStatus(id, isActive),
    onSuccess: (_, { id, isActive }) => {
      toast.success(`✅ Entidad ${isActive ? 'activada' : 'desactivada'} exitosamente`);
      invalidateQueries.entities();
      queryClient.invalidateQueries({ queryKey: queryKeys.entity(id) });
    },
    onError: (error) => {
      handleApiError(error, 'Error al cambiar estado de entidad');
    },
  });

  return {
    toggleEntityStatus: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useAnalyzeEntity() {
  const queryClient = useQueryClient();
  const { handleApiError } = useApiErrorHandler();

  const mutation = useMutation({
    mutationFn: ({ id, options }: { id: string; options?: { days?: number; limit?: number } }) =>
      entityService.analyzeEntity(id, options),
    onSuccess: (data: AnalyzeResponse, { id }) => {
      // Construir mensaje con estadísticas V2 si están disponibles
      let message = `✅ Análisis completado:\n` +
        `📊 ${data.mentionsFound} menciones encontradas\n` +
        `📰 ${data.analyzed} artículos analizados\n` +
        `🌐 ${data.domains || 0} fuentes seleccionadas`;

      // Agregar estadísticas V2 si están disponibles
      if (data.analyzer_stats) {
        const stats = data.analyzer_stats;
        message += `\n\n🔬 Estadísticas V2:\n` +
          `⚡ Tiempo: ${stats.processing_time_ms}ms\n` +
          `📈 Procesados: ${stats.total_processed}\n` +
          `😊 Positivos: ${stats.sentiment_distribution.positive}\n` +
          `😐 Neutrales: ${stats.sentiment_distribution.neutral}\n` +
          `😞 Negativos: ${stats.sentiment_distribution.negative}`;
      }

      toast.success(message, { duration: 6000 });
      invalidateQueries.entities();
      queryClient.invalidateQueries({ queryKey: queryKeys.entityStats(id) });
    },
    onError: (error) => {
      handleApiError(error, 'Error al analizar entidad');
    },
  });

  return {
    analyzeEntity: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useToggleEntity() {
  const queryClient = useQueryClient();
  const { handleApiError } = useApiErrorHandler();

  const mutation = useMutation({
    mutationFn: (id: string) => entityService.toggleEntity(id),
    onSuccess: (data) => {
      toast.success(`✅ Entidad ${data.is_active ? 'activada' : 'desactivada'} exitosamente`);
      invalidateQueries.entities();
      queryClient.invalidateQueries({ queryKey: queryKeys.entity(data.id.toString()) });
    },
    onError: (error) => {
      handleApiError(error, 'Error al cambiar estado de entidad');
    },
  });

  return {
    toggleEntity: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}