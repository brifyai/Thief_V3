'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Newspaper, Check, Plus, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface PublicUrl {
  id: number;
  name: string;
  url: string;
  domain: string;
  region: string | null;
  is_active: boolean;
}

interface UserUrlSelection {
  id: number;
  public_url_id: number;
  created_at: string;
  public_url: PublicUrl;
}

export default function MySourcesPage() {
  const { token } = useAuthStore();
  const [availableSources, setAvailableSources] = useState<PublicUrl[]>([]);
  const [selectedSources, setSelectedSources] = useState<UserUrlSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadAvailableSources(), loadSelectedSources()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableSources = async () => {
    try {
      const response = await fetch(`${API_URL}/public-urls?is_active=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar fuentes');

      const data = await response.json();
      setAvailableSources(data.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar fuentes disponibles');
    }
  };

  const loadSelectedSources = async () => {
    try {
      const response = await fetch(`${API_URL}/my-urls`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar tus fuentes');

      const data = await response.json();
      setSelectedSources(data.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar tus fuentes');
    }
  };

  const selectSource = async (publicUrlId: number, name: string) => {
    try {
      const response = await fetch(`${API_URL}/my-urls/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ public_url_id: publicUrlId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al seleccionar fuente');
      }

      toast.success(`✅ Has seleccionado ${name}`);
      await loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const unselectSource = async (selectionId: number, name: string) => {
    try {
      const response = await fetch(`${API_URL}/my-urls/select/${selectionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al deseleccionar fuente');
      }

      toast.success(`Has dejado de seguir ${name}`);
      await loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const selectedIds = selectedSources.map((s) => s.public_url_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando fuentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Fuentes</h1>
        <p className="text-muted-foreground">
          Selecciona las fuentes de noticias que te interesan. Solo verás contenido de las fuentes que selecciones.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="available">
            🌐 Disponibles ({availableSources.length})
          </TabsTrigger>
          <TabsTrigger value="selected">
            ✅ Seleccionadas ({selectedSources.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {availableSources.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay fuentes disponibles</h3>
                <p className="text-sm text-muted-foreground text-center">
                  El administrador aún no ha agregado fuentes de noticias.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {availableSources.map((source) => {
                const isSelected = selectedIds.includes(source.id);
                return (
                  <Card
                    key={source.id}
                    className={isSelected ? 'border-green-500 bg-green-50/50' : ''}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{source.name || source.domain}</CardTitle>
                          <CardDescription className="mt-1">
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline">🌐 {source.domain}</Badge>
                              {source.region && (
                                <Badge variant="outline">📍 {source.region}</Badge>
                              )}
                            </div>
                          </CardDescription>
                        </div>
                        {isSelected ? (
                          <Badge variant="default" className="ml-2">
                            <Check className="h-3 w-3 mr-1" />
                            Seleccionada
                          </Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline block truncate"
                        >
                          {source.url}
                        </a>
                        {isSelected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Ya seleccionada
                          </Button>
                        ) : (
                          <Button
                            onClick={() => selectSource(source.id, source.name || source.domain)}
                            size="sm"
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Seleccionar Fuente
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="selected" className="space-y-4">
          {selectedSources.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No has seleccionado ninguna fuente</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Ve a la pestaña "Disponibles" para seleccionar fuentes de tu interés.
                </p>
                <Button onClick={() => setActiveTab('available')}>
                  Ver Fuentes Disponibles
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {selectedSources.map((selection) => {
                const source = selection.public_url;
                return (
                  <Card key={selection.id} className="border-green-500 bg-green-50/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{source.name || source.domain}</CardTitle>
                          <CardDescription className="mt-1">
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline">🌐 {source.domain}</Badge>
                              {source.region && (
                                <Badge variant="outline">📍 {source.region}</Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                Desde {new Date(selection.created_at).toLocaleDateString()}
                              </Badge>
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline block truncate"
                        >
                          {source.url}
                        </a>
                        <Button
                          onClick={() =>
                            unselectSource(selection.id, source.name || source.domain)
                          }
                          variant="destructive"
                          size="sm"
                          className="w-full"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Deseleccionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
