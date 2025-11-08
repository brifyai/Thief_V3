'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Globe, Plus, Trash2, Edit, Eye, EyeOff, Loader2 } from 'lucide-react';
import { config } from '@/lib/config';
import { getAuthHeaders } from '@/lib/api-secure';
// import { toast } from 'sonner';

interface Site {
  domain: string;
  name: string;
  enabled: boolean;
  priority: number;
  selectors?: {
    listing?: {
      container: string[];
      title: string[];
      link: string[];
      description: string[];
    };
    article?: {
      title: string[];
      content: string[];
      date: string[];
      author: string[];
      images: string[];
    };
  };
  cleaningRules?: Array<{
    type: string;
    pattern: string;
    description: string;
  }>;
  metadata?: {
    encoding: string;
    language: string;
    dateFormat?: string;
    authorSeparator?: string;
  };
}

export default function SitesManagementPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [newSite, setNewSite] = useState<Partial<Site>>({
    domain: '',
    name: '',
    enabled: true,
    priority: 1,
    selectors: {
      listing: {
        container: [],
        title: [],
        link: [],
        description: []
      },
      article: {
        title: [],
        content: [],
        date: [],
        author: [],
        images: []
      }
    },
    cleaningRules: [],
    metadata: {
      encoding: 'utf-8',
      language: 'es'
    }
  });

  // Cargar sitios desde el archivo de configuración
  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${config.api.baseUrl}/api/admin/sites`, {
        headers,
      });
      
      if (!response.ok) {
        console.error(`Error ${response.status} cargando sitios`);
        setSites([]);
        return;
      }
      
      const data = await response.json();
      setSites(data.sites || []);
    } catch (error) {
      console.error('Error cargando sitios:', error);
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  const saveSites = async (updatedSites: Site[]) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${config.api.baseUrl}/api/admin/sites`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sites: updatedSites }),
      });
      
      if (!response.ok) {
        console.error(`Error ${response.status} guardando sitios`);
        return;
      }
      
      console.log('✅ Sitios guardados exitosamente');
      loadSites();
    } catch (error) {
      console.error('Error guardando sitios:', error);
    }
  };

  const addSite = () => {
    if (!newSite.domain || !newSite.name) {
      console.error('Dominio y nombre son requeridos');
      return;
    }

    const siteToAdd: Site = {
      domain: newSite.domain!,
      name: newSite.name!,
      enabled: newSite.enabled ?? true,
      priority: newSite.priority ?? 1,
      selectors: newSite.selectors,
      cleaningRules: newSite.cleaningRules,
      metadata: newSite.metadata
    };

    const updatedSites = [...sites, siteToAdd].sort((a, b) => a.priority - b.priority);
    saveSites(updatedSites);
    setIsAddDialogOpen(false);
    setNewSite({
      domain: '',
      name: '',
      enabled: true,
      priority: 1,
      selectors: {
        listing: {
          container: [],
          title: [],
          link: [],
          description: []
        },
        article: {
          title: [],
          content: [],
          date: [],
          author: [],
          images: []
        }
      },
      cleaningRules: [],
      metadata: {
        encoding: 'utf-8',
        language: 'es'
      }
    });
  };

  const updateSite = () => {
    if (!editingSite) return;

    const updatedSites = sites.map(site => 
      site.domain === editingSite.domain ? editingSite : site
    ).sort((a, b) => a.priority - b.priority);
    
    saveSites(updatedSites);
    setIsEditDialogOpen(false);
    setEditingSite(null);
  };

  const deleteSite = (domain: string) => {
    const updatedSites = sites.filter(site => site.domain !== domain);
    saveSites(updatedSites);
  };

  const toggleSiteStatus = (domain: string) => {
    const updatedSites = sites.map(site => 
      site.domain === domain ? { ...site, enabled: !site.enabled } : site
    );
    saveSites(updatedSites);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Sitios</h1>
          <p className="text-muted-foreground">
            Total de sitios: {sites.length}
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Sitio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Sitio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="domain">Dominio</Label>
                  <Input
                    id="domain"
                    value={newSite.domain}
                    onChange={(e) => setNewSite({ ...newSite, domain: e.target.value })}
                    placeholder="ejemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newSite.name}
                    onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                    placeholder="Nombre del sitio"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Prioridad</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={newSite.priority}
                    onChange={(e) => setNewSite({ ...newSite, priority: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={newSite.enabled}
                    onChange={(e) => setNewSite({ ...newSite, enabled: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="enabled">Habilitado</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="selectors">Selectores (JSON)</Label>
                <Textarea
                  id="selectors"
                  value={JSON.stringify(newSite.selectors, null, 2)}
                  onChange={(e) => {
                    try {
                      const selectors = JSON.parse(e.target.value);
                      setNewSite({ ...newSite, selectors });
                    } catch (error) {
                      // Ignorar errores de JSON mientras el usuario escribe
                    }
                  }}
                  placeholder="Selectores CSS para scraping"
                  className="h-32 font-mono text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={addSite}>
                  Agregar Sitio
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de sitios */}
      <Card>
        <CardHeader>
          <CardTitle>Todos los Sitios</CardTitle>
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay sitios configurados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dominio</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.domain}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.domain}</TableCell>
                      <TableCell>{site.priority}</TableCell>
                      <TableCell>
                        <Badge variant={site.enabled ? "default" : "secondary"}>
                          {site.enabled ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSiteStatus(site.domain)}
                            title={site.enabled ? "Desactivar" : "Activar"}
                          >
                            {site.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSite(site);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar sitio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente el sitio "{site.name}" ({site.domain}).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSite(site.domain)}>
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Sitio</DialogTitle>
          </DialogHeader>
          {editingSite && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-domain">Dominio</Label>
                  <Input
                    id="edit-domain"
                    value={editingSite.domain}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="edit-name">Nombre</Label>
                  <Input
                    id="edit-name"
                    value={editingSite.name}
                    onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-priority">Prioridad</Label>
                  <Input
                    id="edit-priority"
                    type="number"
                    value={editingSite.priority}
                    onChange={(e) => setEditingSite({ ...editingSite, priority: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-enabled"
                    checked={editingSite.enabled}
                    onChange={(e) => setEditingSite({ ...editingSite, enabled: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="edit-enabled">Habilitado</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-selectors">Selectores (JSON)</Label>
                <Textarea
                  id="edit-selectors"
                  value={JSON.stringify(editingSite.selectors, null, 2)}
                  onChange={(e) => {
                    try {
                      const selectors = JSON.parse(e.target.value);
                      setEditingSite({ ...editingSite, selectors });
                    } catch (error) {
                      // Ignorar errores de JSON mientras el usuario escribe
                    }
                  }}
                  className="h-32 font-mono text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={updateSite}>
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}