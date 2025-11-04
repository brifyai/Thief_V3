'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import { useEntities, useDeleteEntity, useToggleEntity, useCreateEntity } from '@/hooks/useEntities';
import EntityCard from '@/components/entities/EntityCard';
import EntityForm from '@/components/entities/EntityForm';
import type { CreateEntityInput, EntityType } from '@/types/entities';

export default function EntitiesPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [typeFilter, setTypeFilter] = useState<EntityType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { entities, isLoading, error } = useEntities({
    is_active: filter === 'all' ? undefined : filter === 'active',
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    search: searchQuery || undefined
  });

  const { deleteEntity, isLoading: isDeleting } = useDeleteEntity();
  const { toggleEntity, isLoading: isToggling } = useToggleEntity();
  const { createEntity, isLoading: isCreating } = useCreateEntity();

  const handleCreate = async (data: CreateEntityInput) => {
    console.log('📝 Datos del formulario recibidos:', data);
    
    const entityData = {
      name: data.name,
      aliases: data.aliases || [],
      type: data.type,
      description: data.description,
      case_sensitive: data.case_sensitive,
      exact_match: data.exact_match,
      alert_enabled: data.alert_enabled,
      alert_threshold: data.alert_threshold,
      // Campos V2
      analysis_context: data.analysis_context || 'politica_chile',
      positive_phrases: data.positive_phrases || [],
      negative_phrases: data.negative_phrases || []
    };
    
    console.log('🚀 Datos que se envían a la API:', entityData);
    
    await createEntity(entityData);
    setIsCreateModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta entidad?')) {
      deleteEntity(id.toString());
    }
  };

  const handleToggle = (id: number) => {
    toggleEntity(id.toString());
  };

  const filteredEntities = entities || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entidades</h1>
          <p className="text-muted-foreground mt-2">
            Monitorea personas, organizaciones y conceptos en tus noticias
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Entidad
        </Button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-card rounded-lg border p-4 mb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar entidades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>

          {/* Estado */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todas
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              Activas
            </Button>
            <Button
              variant={filter === 'inactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('inactive')}
            >
              Inactivas
            </Button>
          </div>

          {/* Tipo */}
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as EntityType | 'ALL')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              <SelectItem value="PERSON">👤 Personas</SelectItem>
              <SelectItem value="ORGANIZATION">🏢 Organizaciones</SelectItem>
              <SelectItem value="LOCATION">📍 Lugares</SelectItem>
              <SelectItem value="CONCEPT">💡 Conceptos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <p className="text-destructive">Error al cargar entidades</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredEntities.length === 0 && (
        <div className="bg-muted/50 border border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">
            {searchQuery || typeFilter !== 'ALL' || filter !== 'active'
              ? 'No se encontraron entidades con los filtros seleccionados'
              : 'No tienes entidades creadas'}
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Primera Entidad
          </Button>
        </div>
      )}

      {/* Lista de Entidades */}
      {!isLoading && !error && filteredEntities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map((entity) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              onDelete={() => handleDelete(entity.id)}
              onToggle={() => handleToggle(entity.id)}
            />
          ))}
        </div>
      )}

      {/* Modal de Creación */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Entidad</DialogTitle>
          </DialogHeader>
          <EntityForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateModalOpen(false)}
            isLoading={isCreating}
            mode="create"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
