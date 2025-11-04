'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/admin/MetricCard';
import { AdminLineChart, AdminBarChart } from '@/components/admin/Charts';
import { AdminTable, StatusBadge, TableActions } from '@/components/admin/AdminTable';
import { queueService, QueueStats, QueueJob, ActiveJob } from '@/services/queue.service';
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Square,
  RefreshCw,
  Trash2,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

export default function AdminQueuesPage() {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [recentJobs, setRecentJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadQueueData = async () => {
      try {
        setLoading(true);
        
        const [stats, active, recent] = await Promise.all([
          queueService.getQueueStats(),
          queueService.getActiveJobs(),
          queueService.getPerformanceMetrics('24h').then(() => {
            // Simular datos de jobs recientes
            return [
              {
                id: '1',
                type: 'scraping' as const,
                status: 'completed' as const,
                priority: 1,
                data: { urls: ['https://example.com'] },
                result: { success: true },
                progress: 100,
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                startedAt: new Date(Date.now() - 3500000).toISOString(),
                completedAt: new Date(Date.now() - 3000000).toISOString(),
                estimatedDuration: 300,
                retryCount: 0,
                maxRetries: 3,
                userId: 1,
              },
              {
                id: '2',
                type: 'ai-processing' as const,
                status: 'failed' as const,
                priority: 2,
                data: { content: 'test' },
                error: 'API limit exceeded',
                progress: 50,
                createdAt: new Date(Date.now() - 7200000).toISOString(),
                startedAt: new Date(Date.now() - 7100000).toISOString(),
                estimatedDuration: 120,
                retryCount: 2,
                maxRetries: 3,
                userId: 2,
              },
            ] as QueueJob[];
          }),
        ]);

        setQueueStats(stats);
        setActiveJobs(active);
        setRecentJobs(recent);
      } catch (error) {
        console.error('Error cargando datos de colas:', error);
        toast.error('Error al cargar datos de colas');
      } finally {
        setLoading(false);
      }
    };

    loadQueueData();
    
    // Actualizar cada 15 segundos
    const interval = setInterval(loadQueueData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [stats, active] = await Promise.all([
        queueService.getQueueStats(),
        queueService.getActiveJobs(),
      ]);

      setQueueStats(stats);
      setActiveJobs(active);
      toast.success('Datos actualizados');
    } catch (error) {
      console.error('Error actualizando colas:', error);
      toast.error('Error al actualizar datos');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const result = await queueService.cancelJob(jobId);
      if (result.success) {
        toast.success('Trabajo cancelado');
        handleRefresh();
      } else {
        toast.error('Error al cancelar trabajo');
      }
    } catch (error) {
      console.error('Error cancelando trabajo:', error);
      toast.error('Error al cancelar trabajo');
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const result = await queueService.retryJob(jobId);
      if (result.success) {
        toast.success('Trabajo reintentado');
        handleRefresh();
      } else {
        toast.error('Error al reintentar trabajo');
      }
    } catch (error) {
      console.error('Error reintentando trabajo:', error);
      toast.error('Error al reintentar trabajo');
    }
  };

  const handleCleanOldJobs = async () => {
    if (!confirm('¿Estás seguro de que quieres limpiar trabajos antiguos?')) {
      return;
    }

    try {
      const result = await queueService.cleanOldJobs(24);
      if (result.success) {
        toast.success(`Se eliminaron ${result.deletedJobs} trabajos antiguos`);
        handleRefresh();
      } else {
        toast.error('Error al limpiar trabajos');
      }
    } catch (error) {
      console.error('Error limpiando trabajos:', error);
      toast.error('Error al limpiar trabajos');
    }
  };

  // Columnas para trabajos activos
  const activeJobColumns: ColumnDef<ActiveJob>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => {
        const id = row.getValue('id') as string;
        return (
          <span className="font-mono text-sm">
            {id.slice(0, 8)}...
          </span>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        const typeConfig = {
          scraping: { label: 'Scraping', color: 'blue' },
          'ai-processing': { label: 'IA', color: 'purple' },
          cleanup: { label: 'Limpieza', color: 'green' },
          analysis: { label: 'Análisis', color: 'orange' },
        };
        const config = typeConfig[type as keyof typeof typeConfig] || { label: type, color: 'gray' };
        return (
          <Badge variant="outline" className={`text-${config.color}-600`}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <StatusBadge status={status as 'active' | 'pending' | 'completed' | 'failed'}>
            {status === 'running' ? 'Ejecutando' :
             status === 'pending' ? 'Pendiente' : status}
          </StatusBadge>
        );
      },
    },
    {
      accessorKey: 'progress',
      header: 'Progreso',
      cell: ({ row }) => {
        const progress = row.getValue('progress') as number;
        return (
          <div className="w-24">
            <Progress value={progress} className="h-2" />
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'startedAt',
      header: 'Inicio',
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.getValue('startedAt')).toLocaleTimeString('es-ES')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <TableActions
          actions={[
            {
              label: 'Cancelar',
              onClick: () => handleCancelJob(row.original.id),
            },
          ]}
        />
      ),
    },
  ];

  // Columnas para trabajos recientes
  const recentJobColumns: ColumnDef<QueueJob>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => {
        const id = row.getValue('id') as string;
        return (
          <span className="font-mono text-sm">
            {id.slice(0, 8)}...
          </span>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return (
          <Badge variant="outline">
            {type === 'scraping' ? 'Scraping' : 
             type === 'ai-processing' ? 'IA' : type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <StatusBadge status={status as 'active' | 'pending' | 'completed' | 'failed'}>
            {status === 'completed' ? 'Completado' :
             status === 'failed' ? 'Fallido' : status}
          </StatusBadge>
        );
      },
    },
    {
      accessorKey: 'retryCount',
      header: 'Reintentos',
      cell: ({ row }) => {
        const retryCount = row.getValue('retryCount') as number;
        const maxRetries = row.original.maxRetries;
        return (
          <Badge variant={retryCount > 0 ? 'secondary' : 'outline'}>
            {retryCount}/{maxRetries}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'completedAt',
      header: 'Finalizado',
      cell: ({ row }) => {
        const completedAt = row.original.completedAt;
        return completedAt ? (
          <span className="text-sm">
            {new Date(completedAt).toLocaleString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <TableActions
            actions={
              status === 'failed'
                ? [
                    {
                      label: 'Reintentar',
                      onClick: () => handleRetryJob(row.original.id),
                    },
                  ]
                : []
            }
          />
        );
      },
    },
  ];

  // Datos para gráficos
  const throughputData = [
    { name: '00:00', value: 15, jobs: 15 },
    { name: '04:00', value: 8, jobs: 8 },
    { name: '08:00', value: 25, jobs: 25 },
    { name: '12:00', value: 35, jobs: 35 },
    { name: '16:00', value: 28, jobs: 28 },
    { name: '20:00', value: 20, jobs: 20 },
    { name: '23:59', value: 12, jobs: 12 },
  ];

  const jobTypeData = queueStats ? [
    { name: 'Scraping', value: queueStats.total * 0.6 },
    { name: 'IA Processing', value: queueStats.total * 0.25 },
    { name: 'Cleanup', value: queueStats.total * 0.1 },
    { name: 'Analysis', value: queueStats.total * 0.05 },
  ] : [];

  const queueMetrics = [
    {
      title: 'Jobs Totales',
      value: queueStats?.total.toLocaleString() || '0',
      icon: Activity,
      color: 'info' as const,
      description: 'Total de trabajos en cola'
    },
    {
      title: 'Jobs Activos',
      value: queueStats?.running.toLocaleString() || '0',
      icon: Play,
      color: 'success' as const,
      description: 'Trabajos en ejecución'
    },
    {
      title: 'Jobs Pendientes',
      value: queueStats?.pending.toLocaleString() || '0',
      icon: Clock,
      color: 'warning' as const,
      description: 'Trabajos en espera'
    },
    {
      title: 'Tasa Éxito',
      value: `${((queueStats?.successRate || 0) * 100).toFixed(1)}%`,
      icon: CheckCircle,
      color: queueStats?.successRate && queueStats.successRate > 0.9 ? 'success' as const : 'warning' as const,
      description: 'Tasa de éxito'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Colas de Trabajos</h1>
          <p className="text-muted-foreground">
            Monitoreo y gestión de colas de procesamiento
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" onClick={handleCleanOldJobs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar Antiguos
          </Button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {queueMetrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            icon={metric.icon}
            color={metric.color}
            description={metric.description}
            loading={loading}
          />
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <AdminLineChart
          data={throughputData}
          title="Throughput (Últimas 24h)"
          dataKey="jobs"
          color="#8884d8"
          height={300}
        />
        
        <AdminBarChart
          data={jobTypeData}
          title="Distribución por Tipo de Job"
          dataKey="value"
          color="#82ca9d"
          height={300}
        />
      </div>

      {/* Jobs Activos */}
      <AdminTable
        data={activeJobs}
        columns={activeJobColumns}
        title="Trabajos Activos"
        loading={loading}
      />

      {/* Jobs Recientes */}
      <AdminTable
        data={recentJobs}
        columns={recentJobColumns}
        title="Trabajos Recientes"
        loading={loading}
      />

      {/* Estadísticas Adicionales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Throughput</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {queueStats?.throughput.toFixed(1) || '0'}/min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Tiempo Espera</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {queueStats ? queueService.formatDuration(queueStats.averageWaitTime) : '0s'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Tiempo Procesamiento</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {queueStats ? queueService.formatDuration(queueStats.averageProcessingTime) : '0s'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Jobs Fallidos</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {queueStats?.failed.toLocaleString() || '0'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}