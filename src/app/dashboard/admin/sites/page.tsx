'use client';

import { useState } from 'react';
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

// Datos estáticos de ejemplo - sin dependencias de API
const EXAMPLE_SITES = [
  {
    id: '1',
    domain: 'ejemplo.com',
    name: 'Sitio de Ejemplo',
    isActive: true,
    priority: 1,
    titleSelector: 'h1',
    contentSelector: '.content',
    dateSelector: '.date',
    authorSelector: '.author',
    imageSelector: '.image',
    cleaningRules: [],
    createdAt: '2025-11-10T00:00:00.000Z',
    updatedAt: '2025-11-10T00:00:00.000Z'
  },
  {
    id: '2',
    domain: 'test.cl',
    name: 'Sitio de Prueba',
    isActive: false,
    priority: 2,
    titleSelector: 'h1',
    contentSelector: '.content',
    dateSelector: '.fecha',
    authorSelector: '.autor',
    imageSelector: '.img',
    cleaningRules: [],
    createdAt: '2025-11-10T00:00:00.000Z',
    updatedAt: '2025-11-10T00:00:00.000Z'
  },
  {
    id: '3',
    domain: 'noticias.cl',
    name: 'Portal de Noticias',
    isActive: true,
    priority: 3,
    titleSelector: '.titulo',
    contentSelector: '.cuerpo',
    dateSelector: '.fecha-publicacion',
    authorSelector: '.redactor',
    imageSelector: '.imagen-principal',
    cleaningRules: [{ type: 'remove', pattern: '.publicidad', description: 'Eliminar publicidad' }],
    createdAt: '2025-11-08T00:00:00.000Z',
    updatedAt: '2025-11-10T00:00:00.000Z'
  }
];

interface Site {
  id: string;
  domain: string;
  name: string;
  isActive: boolean;
  priority?: number;
  titleSelector?: string;
  contentSelector?: string;
  dateSelector?: string;
  authorSelector?: string;
  imageSelector?: string;
  listingSelectors?: {
    linkSelector?: string;
    titleSelector?: string;
    containerSelector?: string;
  };
  cleaningRules?: Array<{
    type: string;
    pattern: string;
    description: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
  // Campos para compatibilidad con el formulario
  enabled?: boolean;
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
  metadata?: {
    encoding: string;
    language: string;
    dateFormat?: string;
    authorSeparator?: string;
  };
}

export default function SitesManagementPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [newSite, setNewSite] = useState<Partial<Site>>({
    domain: '',
    name: '',
    isActive: true,
    priority: 1,
    enabled: true,
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

  // Componente simplificado sin carga dinámica de datos
  console.log('✅ Componente SitesManagementPage cargado con datos estáticos');

  // Funciones simplificadas que no modifican el estado global
  const addSite = () => {
    if (!newSite.domain || !newSite.name) {
      alert('Dominio y nombre son requeridos');
      return;
    }
    alert('Función agregar sitio (modo demo)');
    setIsAddDialogOpen(false);
  };

  const updateSite = () => {
    if (!editingSite) return;
    alert('Función actualizar sitio (modo demo)');
    setIsEditDialogOpen(false);
    setEditingSite(null);
  };

  const deleteSite = (domain: string) => {
    alert(`Función eliminar sitio: ${domain} (modo demo)`);
  };

  const toggleSiteStatus = (domain: string) => {
    alert(`Toggle estado sitio: ${domain} (modo demo)`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Sitios</h1>
          <p className="text-muted-foreground">
            Total de sitios: {EXAMPLE_SITES.length}
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
                    onChange={(e) => setNewSite({ ...newSite, enabled: e.target.checked, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="enabled">Habilitado</Label>
                </div>
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
          {EXAMPLE_SITES.length === 0 ? (
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
                  {EXAMPLE_SITES.map((site) => (
                    <TableRow key={site.domain}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.domain}</TableCell>
                      <TableCell>{site.priority}</TableCell>
                      <TableCell>
                        <Badge variant={site.isActive ? "default" : "secondary"}>
                          {site.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSiteStatus(site.domain)}
                            title={site.isActive ? "Desactivar" : "Activar"}
                          >
                            {site.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                    checked={editingSite.enabled || editingSite.isActive}
                    onChange={(e) => setEditingSite({ ...editingSite, enabled: e.target.checked, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="edit-enabled">Habilitado</Label>
                </div>
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