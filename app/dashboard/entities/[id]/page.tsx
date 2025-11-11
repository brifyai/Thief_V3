'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';
import { AuthGuard } from '@/middleware/auth-guard';
import entityService, { MentionsFilter } from '@/services/entity.service';
import type { Entity, EntityStats, EntityAlert, EntityTimeline, EntityMention } from '@/types/entities';
import EntityTimelineComponent from '@/components/entities/EntityTimeline';
import { useEntityTimeline } from '@/hooks/useEntities';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  EyeOff,
  Calendar,
  Bell,
  BellOff,
  ExternalLink,
  Search,
  Filter,
  FileText,
} from 'lucide-react';

export default function EntityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const entityId = params.id as string;

  // Estados principales
  const [entity, setEntity] = useState<Entity | null>(null);
  const [entityStats, setEntityStats] = useState<EntityStats | null>(null);
  const [mentions, setMentions] = useState<EntityMention[]>([]);
  const [alerts, setAlerts] = useState<EntityAlert[]>([]);
  const [timelineDays, setTimelineDays] = useState(30);
  
  // Hook para timeline
  const { timeline, isLoading: timelineLoading } = useEntityTimeline(entityId, { days: timelineDays });
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Estados de filtros
  const [mentionsFilters, setMentionsFilters] = useState<MentionsFilter>({
    sentiment: 'ALL',
    limit: 20,
    offset: 0,
  });
  
  // Estados de paginación
  const [mentionsPagination, setMentionsPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    has_next: false,
    has_prev: false,
  });

  useEffect(() => {
    if (entityId) {
      loadEntityData();
    }
  }, [entityId]);

  useEffect(() => {
    if (entity) {
      loadMentions();
    }
  }, [entity, mentionsFilters]);

  const loadEntityData = async () => {
    setIsLoading(true);
    try {
      // Cargar entidad
      const entityData = await entityService.getEntity(entityId);
      if (!entityData) {
        toast.error('Entidad no encontrada');
        router.push('/dashboard/entities');
        return;
      }
      setEntity(entityData);

      // Cargar estadísticas
      const stats = await entityService.getEntityStats(entityId);
      setEntityStats(stats);

      // Cargar alertas
      const alertsData = await entityService.getEntityAlerts(entityId);
      setAlerts(alertsData || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar datos de la entidad';
      toast.error(errorMessage);
      router.push('/dashboard/entities');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMentions = async () => {
    try {
      const mentionsResponse = await entityService.getEntityMentions(entityId, mentionsFilters);
      setMentions(mentionsResponse?.data || []);
      setMentionsPagination(mentionsResponse?.pagination || {
        total: 0,
        page: 1,
        limit: 20,
        has_next: false,
        has_prev: false,
      });
    } catch (error: unknown) {
      toast.error('Error al cargar menciones');
      // Asegurar que los arrays estén inicializados incluso en caso de error
      setMentions([]);
      setMentionsPagination({
        total: 0,
        page: 1,
        limit: 20,
        has_next: false,
        has_prev: false,
      });
    }
  };

  const handleAnalyze = async () => {
    const days = prompt('¿Cuántos días atrás analizar? (default: 30)', '30');
    const limit = prompt('¿Límite de noticias a analizar? (default: 100)', '100');
    
    if (!days || !limit) return;
    
    setIsAnalyzing(true);
    toast.loading('🔍 Analizando entidad...', { id: 'analyze' });

    try {
      const result = await entityService.analyzeEntity(entityId, {
        days: parseInt(days),
        limit: parseInt(limit),
      });
      
      // Construir mensaje con estadísticas V2 si están disponibles
      let message = `✅ Análisis completado:\n` +
        `📊 ${result.mentionsFound} menciones encontradas\n` +
        `📰 ${result.analyzed} artículos analizados\n` +
        `🌐 ${result.domains || 0} fuentes seleccionadas`;

      // Agregar estadísticas V2 si están disponibles
      if (result.analyzer_stats) {
        const stats = result.analyzer_stats as any;
        message += `\n\n🔬 Estadísticas V2:\n` +
          `📈 Procesados: ${stats.totalAnalyzed}\n` +
          `🧠 IA Usada: ${stats.aiUsed}\n` +
          `🔄 Fallback: ${stats.fallbackUsed}`;
      }

      toast.success(message, { id: 'analyze' });
      
      // Recargar datos
      loadEntityData();
      loadMentions();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al analizar entidad';
      toast.error('❌ ' + errorMessage, { id: 'analyze' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!entity) return;
    
    try {
      const newStatus = entity.is_active === false;
      await entityService.toggleEntityStatus(entityId, newStatus);
      toast.success(`✅ Entidad ${newStatus ? 'activada' : 'desactivada'}`);
      
      // Actualizar entidad local
      setEntity({ ...entity, is_active: newStatus });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cambiar estado';
      toast.error('❌ ' + errorMessage);
    }
  };

  const handleMarkAlertAsRead = async (alertId: string) => {
    try {
      await entityService.markAlertAsRead(alertId);
      const updatedAlerts = alerts.map(alert => 
        alert.id === alertId ? { ...alert, is_read: true } : alert
      );
      setAlerts(updatedAlerts);
    } catch (error: unknown) {
      toast.error('Error al marcar alerta como leída');
    }
  };

  const handleMentionsPageChange = (newPage: number) => {
    const newOffset = (newPage - 1) * mentionsFilters.limit!;
    setMentionsFilters({ ...mentionsFilters, offset: newOffset });
    setMentionsPagination({ ...mentionsPagination, page: newPage });
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.2) return 'text-green-600';
    if (sentiment < -0.2) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSentimentBadgeVariant = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'default';
      case 'negative': return 'destructive';
      default: return 'secondary';
    }
  };

  const getSentimentScore = (avgSentiment: number) => {
    return Math.round((avgSentiment + 1) * 50);
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando detalles de la entidad...</p>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/entities')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Search className="h-8 w-8 text-primary" />
                {entity.name}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{entity.type}</Badge>
                <Badge variant={entity.is_active !== false ? 'default' : 'secondary'}>
                  {entity.is_active !== false ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleToggleStatus}
            >
              {entity.is_active === false ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {entity.is_active === false ? 'Activar' : 'Desactivar'}
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              Analizar
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/entities/${entityId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* Información básica organizada en tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Entidad</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Información Básica</TabsTrigger>
                <TabsTrigger value="analysis">Análisis de Sentimiento</TabsTrigger>
                <TabsTrigger value="config">Configuración</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-4">
                {entity.description && (
                  <div>
                    <Label className="text-sm font-medium">Descripción</Label>
                    <p className="text-muted-foreground mt-1">{entity.description}</p>
                  </div>
                )}
                
                {entity.aliases && entity.aliases.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Aliases</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {entity.aliases.map((alias, index) => (
                        <Badge key={index} variant="secondary">{alias}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analysis" className="space-y-4 mt-4">
                {/* Contexto de Análisis V2 */}
                {entity.analysis_context && (
                  <div>
                    <Label className="text-sm font-medium text-blue-700">Contexto de Análisis</Label>
                    <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-800 border-blue-200">
                      {entity.analysis_context}
                    </Badge>
                  </div>
                )}

                {/* Frases Positivas V2 */}
                {entity.positive_phrases && entity.positive_phrases.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-green-700">Frases Positivas</Label>
                    <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                      {entity.positive_phrases.map((phrase, index) => (
                        <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                          {phrase}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Frases Negativas V2 */}
                {entity.negative_phrases && entity.negative_phrases.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-red-700">Frases Negativas</Label>
                    <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                      {entity.negative_phrases.map((phrase, index) => (
                        <Badge key={index} variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                          {phrase}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="config" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Tipo de Entidad</Label>
                    <Badge variant="outline" className="mt-2">
                      {entity.type}
                    </Badge>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Estado</Label>
                    <Badge variant={entity.is_active ? "default" : "secondary"} className="mt-2">
                      {entity.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Alertas Habilitadas</Label>
                    <Badge variant={entity.alert_enabled ? "default" : "secondary"} className="mt-2">
                      {entity.alert_enabled ? "Sí" : "No"}
                    </Badge>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Umbral de Alerta</Label>
                    <Badge variant="outline" className="mt-2">
                      {entity.alert_threshold}
                    </Badge>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Estadísticas principales */}
        {entityStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sentimiento General</p>
                    <p className={`text-2xl font-bold ${getSentimentColor(entityStats.avg_sentiment)}`}>
                      {getSentimentScore(entityStats.avg_sentiment)}/100
                    </p>
                  </div>
                  {entityStats.avg_sentiment > 0.2 ? (
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  ) : entityStats.avg_sentiment < -0.2 ? (
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  ) : (
                    <Activity className="h-8 w-8 text-gray-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Menciones</p>
                    <p className="text-2xl font-bold">{entityStats.total_mentions}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Últimos 30 días</p>
                    <p className="text-2xl font-bold">{entityStats.recent_mentions}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Alertas Activas</p>
                    <p className="text-2xl font-bold">{alerts.filter(a => !a.is_read).length}</p>
                  </div>
                  <Bell className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs con contenido detallado */}
        <Tabs defaultValue="mentions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mentions">Menciones</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="analytics">Análisis</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="mentions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Menciones Recientes
                  </span>
                  <div className="flex items-center gap-2">
                    <Select
                      value={mentionsFilters.sentiment || 'ALL'}
                      onValueChange={(value: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'ALL') => setMentionsFilters({ ...mentionsFilters, sentiment: value, offset: 0 })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        <SelectItem value="POSITIVE">Positivos</SelectItem>
                        <SelectItem value="NEGATIVE">Negativos</SelectItem>
                        <SelectItem value="NEUTRAL">Neutrales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
                <CardDescription>
                  Menciones de esta entidad en las noticias analizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mentions && mentions.length > 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {mentions.map((mention) => (
                        <div key={mention.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1">{mention.scraping_result.title}</h4>
                              <div className="text-xs text-muted-foreground mb-2">
                                {mention.scraping_result.domain} • {new Date(mention.analyzed_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge variant={getSentimentBadgeVariant(mention.sentiment)}>
                                {mention.sentiment}
                              </Badge>
                              {mention.analysis_method && (
                                <Badge variant="outline" className="text-xs">
                                  {mention.analysis_method}
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/article/${mention.scraping_result_id}`)}
                                title="Ver análisis completo"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(mention.scraping_result.url, '_blank')}
                                title="Leer noticia original"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Contexto original */}
                          <div className="text-sm bg-muted p-3 rounded mb-3">
                            {mention.context}
                          </div>

                          {/* Nuevos campos V2 */}
                          <div className="space-y-2">
                            {mention.summary && (
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="text-xs font-medium text-blue-800 mb-1">📝 Resumen</div>
                                <div className="text-sm text-blue-700">{mention.summary}</div>
                              </div>
                            )}
                            
                            {mention.reason && (
                              <div className="bg-green-50 p-3 rounded-lg">
                                <div className="text-xs font-medium text-green-800 mb-1">🎯 Razón de Detección</div>
                                <div className="text-sm text-green-700">{mention.reason}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Paginación */}
                    {mentionsPagination.total > mentionsFilters.limit! && (
                      <div className="flex justify-center gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!mentionsPagination.has_prev}
                          onClick={() => handleMentionsPageChange(mentionsPagination.page - 1)}
                        >
                          Anterior
                        </Button>
                        <span className="flex items-center px-3 text-sm">
                          Página {mentionsPagination.page} de {Math.ceil(mentionsPagination.total / mentionsFilters.limit!)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!mentionsPagination.has_next}
                          onClick={() => handleMentionsPageChange(mentionsPagination.page + 1)}
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay menciones para mostrar</p>
                    <Button onClick={handleAnalyze} className="mt-4">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analizar entidad
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timeline" className="space-y-4">
            <EntityTimelineComponent
              timeline={timeline}
              isLoading={timelineLoading}
              onDaysChange={setTimelineDays}
              selectedDays={timelineDays}
            />
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            {entityStats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribución de Sentimiento</CardTitle>
                    <CardDescription>
                      Análisis de sentimiento de todas las menciones
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Positivos
                          </span>
                          <Badge variant="default">{entityStats.sentiment_distribution.POSITIVE}</Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(entityStats.sentiment_distribution.POSITIVE / entityStats.total_mentions) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            Negativos
                          </span>
                          <Badge variant="destructive">{entityStats.sentiment_distribution.NEGATIVE}</Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(entityStats.sentiment_distribution.NEGATIVE / entityStats.total_mentions) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-gray-600" />
                            Neutrales
                          </span>
                          <Badge variant="secondary">{entityStats.sentiment_distribution.NEUTRAL}</Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gray-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(entityStats.sentiment_distribution.NEUTRAL / entityStats.total_mentions) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resumen Estadístico</CardTitle>
                    <CardDescription>
                      Métricas clave de rendimiento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{entityStats.total_mentions}</div>
                          <div className="text-sm text-muted-foreground">Total Menciones</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{entityStats.recent_mentions}</div>
                          <div className="text-sm text-muted-foreground">Últimos 30 días</div>
                        </div>
                      </div>
                      
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className={`text-3xl font-bold ${getSentimentColor(entityStats.avg_sentiment)}`}>
                          {getSentimentScore(entityStats.avg_sentiment)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Score de Sentimiento</div>
                      </div>

                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-lg font-semibold">
                          {entityStats.recent_mentions > 0 ? 
                            `+${Math.round((entityStats.recent_mentions / 30) * 100)}%` : 
                            'Sin datos'
                          }
                        </div>
                        <div className="text-sm text-muted-foreground">Tendencia mensual</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Alertas de la Entidad
                </CardTitle>
                <CardDescription>
                  Notificaciones y eventos importantes relacionados con esta entidad
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alerts && alerts.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {alerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`p-4 border rounded-lg ${getAlertSeverityColor(alert.severity)} ${!alert.is_read ? 'font-semibold' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            <span className="text-sm">{alert.type.replace('_', ' ')}</span>
                            <Badge variant="outline">{alert.severity}</Badge>
                          </div>
                          <div className="text-xs">
                            {new Date(alert.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-sm mb-2">{alert.message}</div>
                        {!alert.is_read && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAlertAsRead(alert.id)}
                          >
                            <BellOff className="h-4 w-4 mr-1" />
                            Marcar como leída
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay alertas para mostrar</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}