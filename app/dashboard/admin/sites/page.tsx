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
  id: string;
  domain: string;
  name: string;
  description: string;
  category: string;
  country: string;
  language: string;
  is_active: boolean;
  scraper_config: any;
  last_scraped: string | null;
  scraping_frequency: number;
  created_at: string;
  updated_at: string;
}

export default function SitesManagementPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSite, setNewSite] = useState<Partial<Site>>({
    domain: '',
    name: '',
    description: '',
    category: 'news',
    country: 'CL',
    language: 'es',
    is_active: true,
    scraper_config: {},
    scraping_frequency: 3600
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

  const updateSite = async (site: Site) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/sites`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sites: [{
            ...site,
            is_active: !site.is_active // Toggle active status
          }]
        }),
      });

      if (!response.ok) throw new Error('Error actualizando sitio');

      console.log('Sitio actualizado exitosamente');
      loadSites();
    } catch (error) {
      console.error('Error actualizando sitio:', error);
    }
  };

  const deleteSite = async (domain: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/sites?domain=${encodeURIComponent(domain)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Error eliminando sitio');

      console.log('Sitio eliminado exitosamente');
      loadSites();
    } catch (error) {
      console.error('Error eliminando sitio:', error);
    }
  };

  const addSite = async () => {
    if (!newSite.domain || !newSite.name) {
      console.error('Dominio y nombre son requeridos');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/sites`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: newSite.domain,
          name: newSite.name,
          description: newSite.description || '',
          category: newSite.category || 'news',
          country: newSite.country || 'CL',
          language: newSite.language || 'es',
          scraper_config: newSite.scraper_config || {}
        }),
      });

      if (!response.ok) {
        throw new Error('Error creando sitio');
      }

      console.log('Sitio creado exitosamente');
      loadSites();
      setIsAddDialogOpen(false);
      setNewSite({
        domain: '',
        name: '',
        description: '',
        category: 'news',
        country: 'CL',
        language: 'es',
        is_active: true,
        scraper_config: {},
        scraping_frequency: 3600
      });
    } catch (error) {
      console.error('Error creando sitio:', error);
    }
  };

  const toggleSiteStatus = async (site: Site) => {
    await updateSite(site);
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

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={newSite.description}
                  onChange={(e) => setNewSite({ ...newSite, description: e.target.value })}
                  placeholder="Descripción del sitio"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    value={newSite.category}
                    onChange={(e) => setNewSite({ ...newSite, category: e.target.value })}
                    placeholder="news"
                  />
                </div>
                <div>
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={newSite.country}
                    onChange={(e) => setNewSite({ ...newSite, country: e.target.value })}
                    placeholder="CL"
                  />
                </div>
                <div>
                  <Label htmlFor="language">Idioma</Label>
                  <Input
                    id="language"
                    value={newSite.language}
                    onChange={(e) => setNewSite({ ...newSite, language: e.target.value })}
                    placeholder="es"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="scraper_config">Configuración de Scraping (JSON)</Label>
                <Textarea
                  id="scraper_config"
                  value={JSON.stringify(newSite.scraper_config, null, 2)}
                  onChange={(e) => {
                    try {
                      const scraper_config = JSON.parse(e.target.value);
                      setNewSite({ ...newSite, scraper_config });
                    } catch (error) {
                      // Ignorar errores de JSON mientras el usuario escribe
                    }
                  }}
                  placeholder="Configuración de scraping"
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
                  <Badge variant={site.is_active ? "default" : "secondary"}>
                    {site.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                  <Badge variant="outline">{site.category}</Badge>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSiteStatus(site)}
                  >
                    {site.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              <div className="text-sm text-muted-foreground space-y-2">
                <p>{site.description}</p>
                <div className="flex items-center space-x-4 text-xs">
                  <span>País: {site.country}</span>
                  <span>Idioma: {site.language}</span>
                  <span>Frecuencia: {site.scraping_frequency}s</span>
                </div>
                {site.last_scraped && (
                  <p>Último scraping: {new Date(site.last_scraped).toLocaleString()}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
