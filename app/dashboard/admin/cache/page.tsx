'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/admin/MetricCard';
import { AdminLineChart, AdminPieChart } from '@/components/admin/Charts';
import { AdminTable, StatusBadge, TableActions } from '@/components/admin/AdminTable';
import { cacheService, CacheStats, CacheKey } from '@/services/cache.service';
import {
  Database,
  Zap,
  HardDrive,
  Clock,
  Trash2,
  RefreshCw,
  Search,
  Key,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

export default function AdminCachePage() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [cacheKeys, setCacheKeys] = useState<CacheKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadCacheData = async () => {
      try {
        setLoading(true);
        
        const [stats, keys] = await Promise.all([
          cacheService.getStats(),
          cacheService.getKeys(),
        ]);

        setCacheStats(stats);
        setCacheKeys(keys);
      } catch (error) {
        console.error('Error cargando datos de caché:', error);
        toast.error('Error al cargar datos de caché');
      } finally {
        setLoading(false);
      }
    };

    loadCacheData();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadCacheData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [stats, keys] = await Promise.all([
        cacheService.getStats(),
        cacheService.getKeys(),
      ]);

      setCacheStats(stats);
      setCacheKeys(keys);
      toast.success('Datos actualizados');
    } catch (error) {
      console.error('Error actualizando caché:', error);
      toast.error('Error al actualizar datos');
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('¿Estás seguro de que quieres limpiar todo el caché? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const result = await cacheService.clearAllCache();
      if (result.success) {
        toast.success(`Caché limpiado: ${result.deletedKeys} claves eliminadas`);
        handleRefresh();
      } else {
        toast.error('Error al limpiar caché');
      }
    } catch (error) {
      console.error('Error limpiando caché:', error);
      toast.error('Error al limpiar caché');
    }
  };

  const handleDeleteKey = async (key: string) => {
    try {
      const result = await cacheService.deleteKey(key);
      if (result.success) {
        toast.success(`Clave "${key}" eliminada`);
        handleRefresh();
      } else {
        toast.error('Error al eliminar clave');
      }
    } catch (error) {
      console.error('Error eliminando clave:', error);
      toast.error('Error al eliminar clave');
    }
  };

  // Filtrar claves por término de búsqueda
  const filteredKeys = Array.isArray(cacheKeys) ? cacheKeys.filter(key =>
    key.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    key.type.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Columnas para la tabla de claves
  const columns: ColumnDef<CacheKey>[] = [
    {
      accessorKey: 'key',
      header: 'Clave',
      cell: ({ row }) => (
        <div className="font-mono text-sm max-w-xs truncate">
          {row.getValue('key')}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.getValue('type')}
        </Badge>
      ),
    },
    {
      accessorKey: 'size',
      header: 'Tamaño',
      cell: ({ row }) => (
        <span className="text-sm">
          {cacheService.formatMemory(row.getValue('size'))}
        </span>
      ),
    },
    {
      accessorKey: 'ttl',
      header: 'TTL',
      cell: ({ row }) => {
        const ttl = row.original.ttl;
        return (
          <span className="text-sm">
            {ttl ? cacheService.formatTTL(ttl) : 'Sin expiración'}
          </span>
        );
      },
    },
    {
      accessorKey: 'accessCount',
      header: 'Accesos',
      cell: ({ row }) => {
        const accessCount = row.getValue('accessCount') as number;
        return (
          <Badge variant={accessCount > 100 ? 'default' : 'secondary'}>
            {accessCount}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Creado',
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.getValue('createdAt')).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <TableActions
          onDelete={() => handleDeleteKey(row.original.key)}
        />
      ),
    },
  ];

  // Datos para gráficos
  const keyTypeData = cacheStats && cacheStats.keyTypes ? Object.entries(cacheStats.keyTypes).map(([type, count]) => ({
    name: type,
    value: count,
  })) : [];

  const performanceData = [
    { name: '00:00', value: 85, hitRate: 85, operations: 120 },
    { name: '04:00', value: 88, hitRate: 88, operations: 95 },
    { name: '08:00', value: 92, hitRate: 92, operations: 180 },
    { name: '12:00', value: 87, hitRate: 87, operations: 220 },
    { name: '16:00', value: 90, hitRate: 90, operations: 195 },
    { name: '20:00', value: 86, hitRate: 86, operations: 150 },
    { name: '23:59', value: 84, hitRate: 84, operations: 110 },
  ];

  const cacheMetrics = [
    {
      title: 'Total de Claves',
      value: cacheStats?.totalKeys.toLocaleString() || '0',
      icon: Key,
      color: 'info' as const,
      description: 'Claves almacenadas'
    },
    {
      title: 'Memoria Usada',
      value: cacheStats ? cacheService.formatMemory(cacheStats.totalMemory) : '0 B',
      icon: HardDrive,
      color: 'warning' as const,
      description: 'Memoria total consumida'
    },
    {
      title: 'Hit Rate',
      value: `${((cacheStats?.hitRate || 0) * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: cacheStats?.hitRate && cacheStats.hitRate > 0.8 ? 'success' as const : 'warning' as const,
      description: 'Eficiencia del caché'
    },
    {
      title: 'Operaciones/s',
      value: cacheStats && cacheStats.operations ? (cacheStats.operations.gets / 60).toFixed(1) : '0',
      icon: Zap,
      color: 'success' as const,
      description: 'Operaciones por segundo'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Caché del Sistema</h1>
          <p className="text-muted-foreground">
            Monitoreo y gestión del caché Redis
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="destructive" onClick={handleClearCache}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar Caché
          </Button>
        </div>
      </div>

      {/* Estado del Caché */}
      <Card className={cacheStats?.hitRate && cacheStats.hitRate > 0.8 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {cacheStats?.hitRate && cacheStats.hitRate > 0.8 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              <div>
                <h2 className="text-xl font-semibold">Estado del Caché</h2>
                <p className="text-sm text-muted-foreground">
                  {cacheStats?.hitRate && cacheStats.hitRate > 0.8 
                    ? 'Caché funcionando con buena eficiencia' 
                    : 'La eficiencia del caché podría mejorar'}
                </p>
              </div>
            </div>
            <StatusBadge status={cacheStats?.hitRate && cacheStats.hitRate > 0.8 ? 'success' : 'warning'}>
              {cacheStats?.hitRate && cacheStats.hitRate > 0.8 ? 'Óptimo' : 'Aceptable'}
            </StatusBadge>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cacheMetrics.map((metric, index) => (
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
          data={performanceData}
          title="Hit Rate (Últimas 24h)"
          dataKey="hitRate"
          color="#8884d8"
          height={300}
        />
        
        <AdminPieChart
          data={keyTypeData}
          title="Distribución por Tipo de Clave"
          height={300}
        />
      </div>

      {/* Detalles de Operaciones */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Operaciones GET</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {(cacheStats?.operations?.gets || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Operaciones SET</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {(cacheStats?.operations?.sets || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Operaciones DEL</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {(cacheStats?.operations?.deletes || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">TTL Promedio</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {cacheStats ? cacheService.formatTTL(cacheStats.averageTTL) : '0s'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Claves */}
      <AdminTable
        data={filteredKeys}
        columns={columns}
        title="Claves de Caché"
        searchPlaceholder="Buscar claves..."
        loading={loading}
      />
    </div>
  );
}