'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Globe, Plus, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
// import { toast } from 'sonner';
import { API_BASE_URL, getAuthHeaders } from '@/lib/api-secure';

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
      const response = await fetch(`${API_BASE_URL}/api/admin/sites`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        console.warn(`HTTP error! status: ${response.status} en loadSites, retornando array vacío`);
        setSites([]);
        return;
      }

      const data = await response.json();
      setSites(data.sites || []);
    } catch (error) {
      console.error('Error cargando sitios:', error);
      // Fallback: mostrar array vacío en caso de error
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  const saveSites = async (updatedSites: Site[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/sites`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sites: updatedSites }),
      });

      if (!response.ok) throw new Error('Error guardando sitios');

      console.log('Sitios guardados exitosamente');
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
        <div className="text-lg">Cargando sitios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Sitios</h1>
          <p className="text-muted-foreground">
            Administra los sitios configurados para scraping
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

      <div className="grid gap-4">
        {sites.map((site) => (
          <Card key={site.domain}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg">{site.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{site.domain}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={site.enabled ? "default" : "secondary"}>
                    {site.enabled ? "Habilitado" : "Deshabilitado"}
                  </Badge>
                  <Badge variant="outline">Prioridad: {site.priority}</Badge>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSiteStatus(site.domain)}
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
                          Esta acción eliminará permanentemente el sitio "{site.name}" ({site.domain}) 
                          de la configuración de scraping.
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p><strong>Selectores configurados:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Contenedores: {site.selectors?.listing?.container?.length || 0}</li>
                  <li>Títulos: {site.selectors?.listing?.title?.length || 0}</li>
                  <li>Enlaces: {site.selectors?.listing?.link?.length || 0}</li>
                  <li>Descripciones: {site.selectors?.listing?.description?.length || 0}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
