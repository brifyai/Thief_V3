'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Zap,
  Globe,
  Cpu,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { AuthGuard } from '@/middleware/auth-guard';
import { metricsService } from '@/services/metrics.service';
import { cacheService } from '@/services/cache.service';
import { queueService } from '@/services/queue.service';
import toast from 'react-hot-toast';

// Interfaces simplificadas para compatibilidad
interface GeneralMetrics {
  totalArticles: number;
  totalScrapes: number;
  successRate: number;
  averageProcessingTime: number;
  activeUsers: number;
  totalDomains: number;
  storageUsed: number;
  lastUpdated: string;
}

interface DuplicateMetrics {
  totalDuplicates: number;
  duplicateRate: number;
  duplicatesByDomain: Array<{
    domain: string;
    duplicates: number;
    unique: number;
    rate: number;
  }>;
}

interface TitleMetrics {
  averageTitleLength: number;
  shortestTitles: Array<{
    title: string;
    length: number;
    domain: string;
  }>;
  longestTitles: Array<{
    title: string;
    length: number;
    domain: string;
  }>;
}

interface DomainMetrics {
  totalDomains: number;
  activeDomains: number;
  domainsByActivity: Array<{
    domain: string;
    articleCount: number;
    lastActivity: string;
    successRate: number;
    averageProcessingTime: number;
  }>;
}

interface CacheStats {
  total_keys: number;
  memory_usage: number;
  hit_rate: number;
  keys_by_pattern: Array<{
    pattern: string;
    count: number;
  }>;
}

interface QueueStats {
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  job_types: Array<{
    type: string;
    count: number;
    status: string;
  }>;
  avg_processing_time: number;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  database: boolean;
  cache: boolean;
  queue: boolean;
  ai_service: boolean;
  uptime: number;
}

export default function AdminStatsPage() {
  const { token } = useAuthStore();
  const [generalMetrics, setGeneralMetrics] = useState<GeneralMetrics | null>(null);
  const [duplicateMetrics, setDuplicateMetrics] = useState<DuplicateMetrics | null>(null);
  const [titleMetrics, setTitleMetrics] = useState<TitleMetrics | null>(null);
  const [domainMetrics, setDomainMetrics] = useState<DomainMetrics | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    setIsLoading(true);
    try {
      console.log('Cargando estadísticas del sistema...');
      
      // Cargar métricas generales con manejo de errores
      try {
        const generalData = await metricsService.getGeneralMetrics();
        setGeneralMetrics(generalData);
        console.log('Métricas generales cargadas:', generalData);
      } catch (error: unknown) {
        console.error('Error cargando métricas generales:', error);
        // Si es error 429, esperar y reintentar una vez
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
          console.log('Error 429 detectado, esperando 2 segundos...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            const generalData = await metricsService.getGeneralMetrics();
            setGeneralMetrics(generalData);
          } catch (retryError) {
            console.error('Error en reintento de métricas generales:', retryError);
            setGeneralMetrics({
              totalArticles: 0,
              totalScrapes: 0,
              successRate: 0,
              averageProcessingTime: 0,
              activeUsers: 0,
              totalDomains: 0,
              storageUsed: 0,
              lastUpdated: new Date().toISOString()
            });
          }
        } else {
          setGeneralMetrics({
            totalArticles: 0,
            totalScrapes: 0,
            successRate: 0,
            averageProcessingTime: 0,
            activeUsers: 0,
            totalDomains: 0,
            storageUsed: 0,
            lastUpdated: new Date().toISOString()
          });
        }
      }

      // Cargar otras métricas de forma segura
      try {
        const duplicateData = await metricsService.getDuplicateMetrics();
        setDuplicateMetrics(duplicateData);
      } catch (error: unknown) {
        console.error('Error cargando métricas de duplicados:', error);
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      try {
        const titleData = await metricsService.getTitleMetrics();
        setTitleMetrics(titleData);
      } catch (error: unknown) {
        console.error('Error cargando métricas de títulos:', error);
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      try {
        const domainData = await metricsService.getDomainMetrics();
        setDomainMetrics(domainData);
      } catch (error: unknown) {
        console.error('Error cargando métricas de dominios:', error);
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      try {
        const cacheData = await cacheService.getStats();
        const transformedCacheStats: CacheStats = {
          total_keys: cacheData.totalKeys || 0,
          memory_usage: cacheData.totalMemory || 0,
          hit_rate: cacheData.hitRate || 0,
          keys_by_pattern: Object.entries(cacheData.keyTypes || {}).map(([pattern, count]) => ({
            pattern,
            count: count as number,
          })),
        };
        setCacheStats(transformedCacheStats);
      } catch (error: unknown) {
        console.error('Error cargando estadísticas de caché:', error);
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Set default cache stats on error
        setCacheStats({
          total_keys: 0,
          memory_usage: 0,
          hit_rate: 0,
          keys_by_pattern: [],
        });
      }

      try {
        const queueData = await queueService.getQueueStats();
        const transformedQueueStats: QueueStats = {
          total_jobs: queueData.total || 0,
          active_jobs: queueData.running || 0,
          completed_jobs: queueData.completed || 0,
          failed_jobs: queueData.failed || 0,
          job_types: [
            { type: 'scraping', count: queueData.pending || 0, status: 'pending' },
            { type: 'scraping', count: queueData.running || 0, status: 'running' },
            { type: 'scraping', count: queueData.completed || 0, status: 'completed' },
            { type: 'scraping', count: queueData.failed || 0, status: 'failed' },
          ],
          avg_processing_time: queueData.averageProcessingTime || 0,
        };
        setQueueStats(transformedQueueStats);
      } catch (error: unknown) {
        console.error('Error cargando estadísticas de cola:', error);
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Set default queue stats on error
        setQueueStats({
          total_jobs: 0,
          active_jobs: 0,
          completed_jobs: 0,
          failed_jobs: 0,
          job_types: [],
          avg_processing_time: 0,
        });
      }

      // Determinar salud del sistema basado en los errores
      const health: SystemHealth = {
        status: 'healthy',
        database: true,
        cache: cacheStats !== null,
        queue: queueStats !== null,
        ai_service: true,
        uptime: 100,
      };
      
      // Si hay muchos errores, cambiar el estado a warning
      const errorCount = [
        !generalMetrics,
        !duplicateMetrics,
        !titleMetrics,
        !domainMetrics,
        !cacheStats,
        !queueStats
      ].filter(Boolean).length;
      
      if (errorCount > 3) {
        health.status = 'warning';
      }
      
      setSystemHealth(health);

      toast.success('Estadísticas cargadas exitosamente');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar estadísticas';
      toast.error(errorMessage);
      console.error('Error cargando estadísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAllStats();
      toast.success('Estadísticas actualizadas');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar';
      toast.error(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const csvData = await metricsService.exportMetricsToCSV();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metrics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Estadísticas exportadas exitosamente');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al exportar';
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard requiredRole="admin">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando estadísticas del sistema...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Estadísticas del Sistema
            </h1>
            <p className="text-muted-foreground mt-2">
              Métricas y análisis del rendimiento del sistema en tiempo real
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* System Health Status */}
        {systemHealth && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Estado General del Sistema
              </CardTitle>
              <CardDescription>
                Salud y rendimiento de los componentes principales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className={`flex items-center justify-between p-3 rounded-lg ${getHealthColor(systemHealth.status)}`}>
                  <span className="text-sm font-medium">Estado General</span>
                  {getHealthIcon(systemHealth.status)}
                </div>
                <div className={`flex items-center justify-between p-3 rounded-lg ${systemHealth.database ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  <span className="text-sm font-medium">Base de Datos</span>
                  {systemHealth.database ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
                <div className={`flex items-center justify-between p-3 rounded-lg ${systemHealth.cache ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  <span className="text-sm font-medium">Caché</span>
                  {systemHealth.cache ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
                <div className={`flex items-center justify-between p-3 rounded-lg ${systemHealth.queue ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  <span className="text-sm font-medium">Cola de Procesos</span>
                  {systemHealth.queue ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
                <div className={`flex items-center justify-between p-3 rounded-lg ${systemHealth.ai_service ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  <span className="text-sm font-medium">Servicio IA</span>
                  {systemHealth.ai_service ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Metrics */}
        {generalMetrics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resultados Totales</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(generalMetrics.totalArticles || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {generalMetrics.totalScrapes} scrapings realizados
                </p>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {((generalMetrics.successRate || 0) * 100).toFixed(1)}% tasa de éxito
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dominios Monitoreados</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(generalMetrics.totalDomains || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {(generalMetrics.activeUsers || 0)} usuarios activos
                </p>
                <div className="flex items-center text-xs text-blue-600 mt-1">
                  <Activity className="h-3 w-3 mr-1" />
                  {(generalMetrics.averageProcessingTime || 0).toFixed(0)}ms avg tiempo
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rendimiento</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(generalMetrics.averageProcessingTime || 0).toFixed(0)}ms</div>
                <p className="text-xs text-muted-foreground">
                  Tiempo promedio de procesamiento
                </p>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <Cpu className="h-3 w-3 mr-1" />
                  {((generalMetrics.successRate || 0) * 100).toFixed(1)}% éxito
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{((generalMetrics.storageUsed || 0) / 1024 / 1024).toFixed(1)}MB</div>
                <p className="text-xs text-muted-foreground">
                  Espacio utilizado
                </p>
                <Progress value={((generalMetrics.storageUsed || 0) / 1024 / 1024 / 100) * 100} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Analytics */}
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="domains">Dominios</TabsTrigger>
            <TabsTrigger value="cache">Caché</TabsTrigger>
            <TabsTrigger value="queue">Cola</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {duplicateMetrics && (
                <Card>
                  <CardHeader>
                    <CardTitle>📊 Análisis de Duplicados</CardTitle>
                    <CardDescription>Contenido duplicado detectado</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Duplicados</span>
                      <Badge variant="secondary">{duplicateMetrics?.totalDuplicates || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tasa de Duplicación</span>
                      <Badge variant={(duplicateMetrics?.duplicateRate || 0) > 10 ? 'destructive' : 'default'}>
                        {((duplicateMetrics?.duplicateRate || 0) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Dominios con más duplicados:</span>
                      {(duplicateMetrics?.duplicatesByDomain || []).slice(0, 3).map((domain, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{domain.domain}</span>
                          <Badge variant="outline">{domain.duplicates}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {titleMetrics && (
                <Card>
                  <CardHeader>
                    <CardTitle>📝 Análisis de Títulos</CardTitle>
                    <CardDescription>Estadísticas de títulos de artículos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Longitud Promedio</span>
                      <Badge variant="secondary">{(titleMetrics?.averageTitleLength || 0).toFixed(0)} caracteres</Badge>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Títulos más largos:</span>
                      {(titleMetrics?.longestTitles || []).slice(0, 2).map((title, index) => (
                        <div key={index} className="text-sm">
                          <div className="font-medium truncate">{title.title}</div>
                          <div className="text-muted-foreground">{title.length} caracteres</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="domains" className="space-y-4">
            {domainMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>🌐 Análisis de Dominios</CardTitle>
                  <CardDescription>Rendimiento por dominio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{domainMetrics?.totalDomains || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Dominios</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {domainMetrics?.domainsByActivity?.[0]?.articleCount || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Más Activo</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {domainMetrics?.domainsByActivity?.[0]?.successRate ? (domainMetrics.domainsByActivity[0].successRate * 100).toFixed(1) : 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Mejor Tasa</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Top Dominios:</span>
                      {(domainMetrics?.domainsByActivity || []).slice(0, 5).map((domain, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <div className="font-medium">{domain.domain}</div>
                            <div className="text-sm text-muted-foreground">{domain.articleCount} artículos</div>
                          </div>
                          <Badge variant={(domain.successRate || 0) > 0.8 ? 'default' : 'secondary'}>
                            {((domain.successRate || 0) * 100).toFixed(1)}% éxito
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cache" className="space-y-4">
            {cacheStats && (
              <Card>
                <CardHeader>
                  <CardTitle>💾 Estadísticas de Caché</CardTitle>
                  <CardDescription>Rendimiento del sistema de caché</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{cacheStats?.total_keys || 0}</div>
                      <div className="text-sm text-muted-foreground">Claves Totales</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{((cacheStats?.memory_usage || 0) / 1024 / 1024).toFixed(1)}MB</div>
                      <div className="text-sm text-muted-foreground">Uso de Memoria</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{((cacheStats?.hit_rate || 0) * 100).toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Tasa de Aciertos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{(cacheStats?.keys_by_pattern || []).length}</div>
                      <div className="text-sm text-muted-foreground">Patrones</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Claves por Patrón:</span>
                    {(cacheStats?.keys_by_pattern || []).map((pattern, index) => (
                      <div key={index} className="flex justify-between items-center p-2 border rounded">
                        <span className="font-mono text-sm">{pattern.pattern}</span>
                        <Badge variant="outline">{pattern.count} claves</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            {queueStats && (
              <Card>
                <CardHeader>
                  <CardTitle>⚡ Estado de la Cola</CardTitle>
                  <CardDescription>Trabajos en proceso y estadísticas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{queueStats?.total_jobs || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Trabajos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{queueStats?.active_jobs || 0}</div>
                      <div className="text-sm text-muted-foreground">Activos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{queueStats?.completed_jobs || 0}</div>
                      <div className="text-sm text-muted-foreground">Completados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{queueStats?.failed_jobs || 0}</div>
                      <div className="text-sm text-muted-foreground">Fallidos</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tiempo Promedio de Procesamiento</span>
                      <Badge variant="secondary">{(queueStats?.avg_processing_time || 0).toFixed(0)}ms</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Trabajos por Tipo:</span>
                      {(queueStats?.job_types || []).map((job, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <div className="font-medium">{job.type}</div>
                            <div className="text-sm text-muted-foreground">{job.count} trabajos</div>
                          </div>
                          <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                            {job.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
