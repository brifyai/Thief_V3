'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ExternalLink, RefreshCw, Play, Pause, Trash2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { urlsService, type PublicUrl } from '@/services/urls.service';
import { retestService, type RetestResult } from '@/services/retest.service';
import { toast } from 'react-hot-toast';

interface UrlsTableWithRetestProps {
  refreshTrigger?: number;
  onUrlUpdated?: () => void;
}

interface RetestModalData {
  urlId: number;
  urlString: string;
  urlName: string;
  currentLimit?: number | null;
}


export function UrlsTableWithRetest({ refreshTrigger, onUrlUpdated }: UrlsTableWithRetestProps) {
  const [urls, setUrls] = useState<PublicUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retestModal, setRetestModal] = useState<RetestModalData | null>(null);
  const [newLimit, setNewLimit] = useState('');
  const [isRetesting, setIsRetesting] = useState(false);
  const [retestResult, setRetestResult] = useState<RetestResult | null>(null);

  useEffect(() => {
    loadUrls();
  }, [refreshTrigger]);

  const loadUrls = async () => {
    setIsLoading(true);
    try {
      const data = await urlsService.getPublicUrls();
      setUrls(data);
    } catch (error) {
      console.error('Error cargando URLs:', error);
      toast.error('Error al cargar las URLs');
    } finally {
      setIsLoading(false);
    }
  };

  const getTestStatusBadge = (url: PublicUrl) => {
    const testInfo = retestService.getUrlTestInfo(url);
    const statusInfo = retestService.formatTestStatus(testInfo);
    
    if (testInfo.test_status === 'never_tested' || testInfo.test_status === 'needs_retest') {
      return (
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">
            {testInfo.days_since_test ? `Hace ${testInfo.days_since_test} días` : 'Nunca'}
          </span>
          <Badge variant={statusInfo.badge.variant as "default" | "secondary" | "destructive" | "outline"} className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {statusInfo.badge.text}
          </Badge>
        </div>
      );
    }

    return (
      <span className="text-sm text-muted-foreground">
        Hace {testInfo.days_since_test} días
      </span>
    );
  };

  const openRetestModal = (url: PublicUrl) => {
    setRetestModal({
      urlId: url.id,
      urlString: url.url,
      urlName: url.name || url.domain,
      currentLimit: url.max_news_limit,
    });
    setNewLimit('');
    setRetestResult(null);
  };

  const closeRetestModal = () => {
    setRetestModal(null);
    setNewLimit('');
    setRetestResult(null);
    setIsRetesting(false);
  };

  const performRetest = async () => {
    if (!retestModal) return;

    setIsRetesting(true);
    
    try {
      // Validar el nuevo límite si se proporcionó
      if (newLimit && newLimit.trim()) {
        const limit = parseInt(newLimit);
        if (limit < 1) {
          toast.error('El límite debe ser al menos 1');
          return;
        }
        
        // Validar contra el límite actual (si existe)
        if (retestModal.currentLimit && limit > retestModal.currentLimit) {
          toast('El nuevo límite es mayor que el actual. Se validará después del test.', {
            icon: '⚠️',
            style: {
              background: '#fef3c7',
              color: '#92400e',
            }
          });
        }
      }

      const requestBody: Record<string, unknown> = {};
      if (newLimit && newLimit.trim()) {
        requestBody.new_limit = parseInt(newLimit);
      }

      // Usar el endpoint correcto del backend: PUT /api/public-urls/:id/retest
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/public-urls/${retestModal.urlId}/retest`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al re-testear URL');
      }

      const result = await response.json();
      setRetestResult(result);
      
      // Generar resumen de cambios
      const comparison = retestService.generateComparisonSummary(result);
      
      if (comparison.hasChanges) {
        toast.success(`✅ Re-test completado: ${comparison.summary}`);
      } else {
        toast.success('✅ Re-test completado: Sin cambios significativos');
      }
      
      // Actualizar la tabla después de un delay para que el usuario vea el resultado
      setTimeout(() => {
        loadUrls();
        onUrlUpdated?.();
      }, 2000);

    } catch (error) {
      console.error('Error en re-test:', error);
      toast.error(error instanceof Error ? error.message : 'Error al re-testear URL');
    } finally {
      setIsRetesting(false);
    }
  };

  const toggleUrlStatus = async (urlId: number, currentStatus: boolean) => {
    try {
      await urlsService.updatePublicUrl(urlId, { is_active: !currentStatus });
      toast.success(`URL ${!currentStatus ? 'activada' : 'desactivada'} exitosamente`);
      loadUrls();
      onUrlUpdated?.();
    } catch (error) {
      toast.error('Error al cambiar estado de la URL');
    }
  };

  const deleteUrl = async (urlId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta URL? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await urlsService.deletePublicUrl(urlId);
      toast.success('URL eliminada exitosamente');
      loadUrls();
      onUrlUpdated?.();
    } catch (error) {
      toast.error('Error al eliminar la URL');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>📋 URLs Públicas ({urls.length})</CardTitle>
          <CardDescription>
            Gestiona las URLs públicas disponibles para todos los usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {urls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              📭 No hay URLs públicas configuradas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Región</TableHead>
                    <TableHead>Usuarios</TableHead>
                    <TableHead>Límite</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último Test</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urls.map((url) => (
                    <TableRow key={url.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{url.name || url.domain}</div>
                          <div className="text-sm text-muted-foreground">{url.domain}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={url.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 max-w-xs truncate"
                        >
                          {url.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        {url.region ? (
                          <Badge variant="outline">📍 {url.region}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {url._count?.selections || 0} usuarios
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {url.max_news_limit ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              📊 {url.max_news_limit} noticias
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-50 text-gray-600">
                              Sin límite
                            </Badge>
                          )}
                          {url.available_news_count && (
                            <div className="text-xs text-muted-foreground">
                              de {url.available_news_count} disponibles
                            </div>
                          )}
                          
                          {/* Mostrar información del último test */}
                          <div className="text-xs text-muted-foreground">
                            {url.last_tested_at ? (
                              <span>
                                🧪 Test: {new Date(url.last_tested_at).toLocaleDateString()}
                                {(() => {
                                  const daysSinceTest = Math.floor((new Date().getTime() - new Date(url.last_tested_at!).getTime()) / (1000 * 60 * 60 * 24));
                                  return daysSinceTest > 30 ? (
                                    <span className="text-orange-600 ml-1">⚠️ Re-test recomendado</span>
                                  ) : null;
                                })()}
                              </span>
                            ) : (
                              <span className="text-red-600">⚠️ Nunca testeada</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={url.is_active ? "default" : "secondary"}>
                          {url.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getTestStatusBadge(url)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRetestModal(url)}
                            title="Re-probar URL y actualizar límite"
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleUrlStatus(url.id, url.is_active)}
                          >
                            {url.is_active ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUrl(url.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Modal de Re-test */}
      <Dialog open={!!retestModal} onOpenChange={closeRetestModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Re-probar: {retestModal?.urlName}
            </DialogTitle>
            <DialogDescription>
              Vuelve a scrapear la URL para ver cuántas noticias están disponibles actualmente
            </DialogDescription>
          </DialogHeader>

          {!retestResult ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> {retestModal?.urlString}
                </p>
                {retestModal?.currentLimit && (
                  <p className="text-sm text-gray-600">
                    <strong>Límite actual:</strong> {retestModal.currentLimit} noticias
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-limit">
                  ¿Deseas cambiar el límite de noticias?
                </Label>
                <Input
                  id="new-limit"
                  type="number"
                  min="1"
                  placeholder="Deja vacío para mantener el límite actual"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Después del test, podrás ajustar este valor según las noticias disponibles
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-700 mb-3">📊 Comparación de Resultados</h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-200 px-3 py-2 text-left">Métrica</th>
                        <th className="border border-gray-200 px-3 py-2 text-center">Antes</th>
                        <th className="border border-gray-200 px-3 py-2 text-center">Ahora</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-200 px-3 py-2">Noticias disponibles</td>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          {retestResult.previous_stats.available_news_count || 'N/A'}
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          <strong className="text-green-700">
                            {retestResult.new_stats.available_news_count}
                          </strong>
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2">Límite configurado</td>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          {retestResult.previous_stats.max_news_limit || 'Sin límite'}
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          <strong className="text-blue-700">
                            {retestResult.new_stats.max_news_limit || 'Sin límite'}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="font-medium mb-2">Vista previa (primeras 5 noticias):</p>
                <ul className="max-h-48 overflow-y-auto space-y-1 text-sm">
                  {retestResult.news_preview?.map((noticia, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-500">{index + 1}.</span>
                      <strong>{noticia.titulo}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            {!retestResult ? (
              <>
                <Button variant="outline" onClick={closeRetestModal}>
                  Cancelar
                </Button>
                <Button 
                  onClick={performRetest} 
                  disabled={isRetesting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isRetesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Re-testeando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      🧪 Re-probar Ahora
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={closeRetestModal} className="w-full">
                Entendido
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}