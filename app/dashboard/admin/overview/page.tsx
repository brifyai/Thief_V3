'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/admin/MetricCard';
import { AdminLineChart, AdminBarChart, AdminPieChart } from '@/components/admin/Charts';
import { metricsService, GeneralMetrics, AIMetrics, RealTimeMetrics } from '@/services/metrics.service';
import { cacheService, CacheStats } from '@/services/cache.service';
import { queueService, QueueStats } from '@/services/queue.service';
import {
  Activity,
  Users,
  Database,
  Cpu,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Globe,
  FileText,
  Bot,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [generalMetrics, setGeneralMetrics] = useState<GeneralMetrics | null>(null);
  const [aiMetrics, setAIMetrics] = useState<AIMetrics | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        
        // Cargar todas las métricas en paralelo
        const [
          generalData,
          aiData,
          realTimeData,
          cacheData,
          queueData,
        ] = await Promise.all([
          metricsService.getGeneralMetrics(),
          metricsService.getAIMetrics(),
          metricsService.getRealTimeMetrics(),
          cacheService.getStats(),
          queueService.getQueueStats(),
        ]);

        setGeneralMetrics(generalData);
        setAIMetrics(aiData);
        setRealTimeMetrics(realTimeData);
        setCacheStats(cacheData);
        setQueueStats(queueData);
      } catch (error) {
        console.error('Error cargando métricas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const systemHealth = realTimeMetrics?.systemLoad || { cpu: 0, memory: 0, disk: 0 };
  const healthStatus = systemHealth.cpu < 80 && systemHealth.memory < 80 ? 'healthy' : 'warning';

  // Datos para gráficos
  const activityData = [
    { name: 'Lun', value: 65, articles: 65, scrapes: 45 },
    { name: 'Mar', value: 78, articles: 78, scrapes: 52 },
    { name: 'Mié', value: 90, articles: 90, scrapes: 61 },
    { name: 'Jue', value: 81, articles: 81, scrapes: 55 },
    { name: 'Vie', value: 56, articles: 56, scrapes: 38 },
    { name: 'Sáb', value: 35, articles: 35, scrapes: 24 },
    { name: 'Dom', value: 28, articles: 28, scrapes: 19 },
  ];

  const domainData = generalMetrics ? [
    { name: 'Ejemplo1.com', value: 150 },
    { name: 'Ejemplo2.com', value: 120 },
    { name: 'Ejemplo3.com', value: 90 },
    { name: 'Ejemplo4.com', value: 75 },
    { name: 'Ejemplo5.com', value: 60 },
  ] : [];

  const aiOperationsData = aiMetrics && aiMetrics.aiOperationsByType ? [
    { name: 'Análisis Sentimiento', value: aiMetrics.aiOperationsByType.sentimentAnalysis || 0 },
    { name: 'Resúmenes', value: aiMetrics.aiOperationsByType.summarization || 0 },
    { name: 'Categorización', value: aiMetrics.aiOperationsByType.categorization || 0 },
    { name: 'Reescritura', value: aiMetrics.aiOperationsByType.rewriting || 0 },
    { name: 'Traducción', value: aiMetrics.aiOperationsByType.translation || 0 },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
        <p className="text-muted-foreground">
          Vista general del estado del sistema y métricas clave
        </p>
      </div>

      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Artículos Totales"
          value={(generalMetrics?.totalArticles || 0).toLocaleString()}
          icon={FileText}
          color="info"
          loading={loading}
          description="Total de artículos en el sistema"
        />
        
        <MetricCard
          title="Usuarios Activos"
          value={(generalMetrics?.activeUsers || 0).toLocaleString()}
          icon={Users}
          color="success"
          loading={loading}
          description="Usuarios activos hoy"
        />
        
        <MetricCard
          title="Tasa Éxito"
          value={`${((generalMetrics?.successRate || 0) * 100).toFixed(1)}%`}
          icon={CheckCircle}
          color="success"
          loading={loading}
          description="Tasa de éxito de scraping"
        />
        
        <MetricCard
          title="Dominios Monitoreados"
          value={(generalMetrics?.totalDomains || 0).toLocaleString()}
          icon={Globe}
          color="warning"
          loading={loading}
          description="Total de dominios activos"
        />
      </div>

      {/* Métricas de Sistema */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="CPU"
          value={`${systemHealth.cpu.toFixed(1)}%`}
          icon={Cpu}
          color={systemHealth.cpu > 80 ? 'danger' : systemHealth.cpu > 60 ? 'warning' : 'success'}
          loading={loading}
          description="Uso de CPU del sistema"
        />
        
        <MetricCard
          title="Memoria"
          value={`${systemHealth.memory.toFixed(1)}%`}
          icon={Database}
          color={systemHealth.memory > 80 ? 'danger' : systemHealth.memory > 60 ? 'warning' : 'success'}
          loading={loading}
          description="Uso de memoria RAM"
        />
        
        <MetricCard
          title="Jobs Activos"
          value={queueStats?.running.toLocaleString() || '0'}
          icon={Activity}
          color="info"
          loading={loading}
          description="Trabajos en ejecución"
        />
        
        <MetricCard
          title="Cache Hit Rate"
          value={`${((cacheStats?.hitRate || 0) * 100).toFixed(1)}%`}
          icon={Zap}
          color={cacheStats?.hitRate && cacheStats.hitRate > 0.8 ? 'success' : 'warning'}
          loading={loading}
          description="Eficiencia del caché"
        />
      </div>

      {/* Métricas de IA */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Peticiones IA"
          value={(aiMetrics?.totalAIRequests || 0).toLocaleString()}
          icon={Bot}
          color="info"
          loading={loading}
          description="Total de peticiones a IA"
        />
        
        <MetricCard
          title="Tasa Éxito IA"
          value={`${((aiMetrics?.aiSuccessRate || 0) * 100).toFixed(1)}%`}
          icon={CheckCircle}
          color="success"
          loading={loading}
          description="Tasa de éxito de IA"
        />
        
        <MetricCard
          title="Tiempo Respuesta IA"
          value={`${(aiMetrics?.averageResponseTime || 0).toFixed(1)}s`}
          icon={Clock}
          color={aiMetrics?.averageResponseTime && aiMetrics.averageResponseTime < 5 ? 'success' : 'warning'}
          loading={loading}
          description="Tiempo promedio de respuesta"
        />
        
        <MetricCard
          title="Costo Total IA"
          value={`$${(aiMetrics?.aiCosts?.totalCost || 0).toFixed(2)}`}
          icon={TrendingUp}
          color="warning"
          loading={loading}
          description="Costo total de operaciones IA"
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <AdminLineChart
          data={activityData}
          title="Actividad Semanal"
          dataKey="articles"
          color="#8884d8"
          height={300}
        />
        
        <AdminBarChart
          data={domainData}
          title="Top Dominios por Artículos"
          dataKey="articles"
          color="#82ca9d"
          height={300}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AdminPieChart
          data={aiOperationsData}
          title="Operaciones de IA"
          height={300}
        />
        
        <AdminLineChart
          data={activityData}
          title="Comparación Artículos vs Scrapes"
          dataKey="scrapes"
          color="#ffc658"
          height={300}
        />
      </div>

      {/* Estado del Sistema */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className={`p-4 rounded-lg border ${
          healthStatus === 'healthy' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-2">
            {healthStatus === 'healthy' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            <h3 className="font-semibold">Estado del Sistema</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {healthStatus === 'healthy' ? 'Sistema funcionando correctamente' : 'Sistema requiere atención'}
          </p>
        </div>

        <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Última Actualización</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleString('es-ES')}
          </p>
        </div>

        <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">Rendimiento</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Tiempo procesamiento: {(generalMetrics?.averageProcessingTime || 0).toFixed(1)}s
          </p>
        </div>
      </div>
    </div>
  );
}