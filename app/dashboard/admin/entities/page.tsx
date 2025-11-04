'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

interface Entity {
  id: string;
  name: string;
  type: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      setLoading(true);
      // Simulación de carga de entidades
      // En producción, esto llamaría a la API
      setEntities([
        {
          id: '1',
          name: 'Empresa A',
          type: 'company',
          description: 'Empresa de tecnología',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Persona B',
          type: 'person',
          description: 'CEO de Empresa A',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error loading entities:', error);
      toast.error('Error al cargar entidades');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntities = entities.filter(entity =>
    entity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      setEntities(entities.filter(e => e.id !== id));
      toast.success('Entidad eliminada');
    } catch (error) {
      toast.error('Error al eliminar entidad');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Entidades</h1>
          <p className="text-muted-foreground mt-2">
            Administra las entidades monitoreadas en el sistema
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Entidad
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entidades</CardTitle>
          <CardDescription>
            Total: {filteredEntities.length} entidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar entidades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredEntities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay entidades disponibles
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEntities.map((entity) => (
                  <div
                    key={entity.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{entity.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {entity.type} • {entity.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Editar entidad
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entity.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}