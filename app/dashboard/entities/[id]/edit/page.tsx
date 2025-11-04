'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/middleware/auth-guard';
import entityService from '@/services/entity.service';
import EntityForm from '@/components/entities/EntityForm';
import type { Entity, CreateEntityInput } from '@/types/entities';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import {
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export default function EditEntityPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const entityId = params.id as string;

  // Estados
  const [entity, setEntity] = useState<Entity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (entityId) {
      loadEntity();
    }
  }, [entityId]);

  const loadEntity = async () => {
    setIsLoading(true);
    try {
      const entityData = await entityService.getEntity(entityId);
      if (!entityData) {
        toast.error('Entidad no encontrada');
        router.push('/dashboard/entities');
        return;
      }
      
      setEntity(entityData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar la entidad';
      toast.error(errorMessage);
      router.push('/dashboard/entities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: CreateEntityInput) => {
    if (!entity) return;

    console.log('📝 Datos del formulario de edición recibidos:', data);
    console.log('🚀 Datos que se envían a la API para actualizar:', data);

    setIsUpdating(true);

    try {
      await entityService.updateEntity(entityId.toString(), data);
      toast.success('✅ Entidad actualizada exitosamente');
      router.push(`/dashboard/entities/${entityId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar entidad';
      toast.error('❌ ' + errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/entities/${entityId}`);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando entidad...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!entity) {
    return (
      <AuthGuard>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Entidad no encontrada</p>
          <Button onClick={() => router.push('/dashboard/entities')} className="mt-4">
            Volver a entidades
          </Button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/entities/${entityId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Editar Entidad: {entity.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Modifica la información de la entidad
            </p>
          </div>
        </div>

        {/* Formulario usando EntityForm */}
        <EntityForm
          initialData={{
            name: entity.name,
            aliases: entity.aliases || [],
            type: entity.type,
            description: entity.description || '',
            case_sensitive: entity.case_sensitive || false,
            exact_match: entity.exact_match || false,
            alert_enabled: entity.alert_enabled ?? true,
            alert_threshold: entity.alert_threshold ?? 0.2,
            // Campos V2
            analysis_context: entity.analysis_context || 'politica_chile',
            positive_phrases: entity.positive_phrases || [],
            negative_phrases: entity.negative_phrases || [],
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isUpdating}
          mode="edit"
        />
      </div>
    </AuthGuard>
  );
}