'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/admin/MetricCard';
import { AdminLineChart } from '@/components/admin/Charts';
import { StatusBadge } from '@/components/admin/AdminTable';
import { metricsService } from '@/services/metrics.service';
import { cacheService } from '@/services/cache.service';
import {
  Database,
  Server,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Settings,
  Zap,
  HardDrive,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SystemHealth {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  details?: string;
}

export default function AdminSystemPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        setLoading(true);
        
        // Simular verificación de salud del sistema
        const healthChecks: SystemHealth[] = [
          {
            component: 'Base de Datos',
            status: 'healthy',
            responseTime: 45,
            lastCheck: new Date().toISOString(),
            details: 'PostgreSQL - Conexión estable'
          },
          {
            component: 'Supabase Cache',
            status: 'healthy',
            responseTime: 25,
            lastCheck: new Date().toISOString(),
            details: 'Supabase - Conexión estable'
          },
          {
            component: 'API de IA',
            status: 'healthy',
            responseTime: 450,
            lastCheck: new Date().toISOString(),
            details: 'Chutes AI API - Funcionando correctamente'
          },
          {
            component: 'Servidor Web',
            status: 'healthy',
            responseTime: 23,
            lastCheck: new Date().toISOString(),
            details: 'Next.js 14 - CPU: 15%'
          },
          {
            component: 'Cola de Jobs',
            status: 'healthy',
            responseTime: 8,
            lastCheck: new Date().toISOString(),
            details: 'Bull Queue - 0 jobs pendientes'
          },
          {
            component: 'Almacenamiento',
            status: 'healthy',
            responseTime: 35,
            lastCheck: new Date().toISOString(),
            details: 'Disco: 45% utilizado'
          }
        ];

        setSystemHealth(healthChecks);
      } catch (error) {
        console.error('Error verificando salud del sistema:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSystemHealth();
    
    // Actualizar cada 60 segundos
    const interval = setInterval(checkSystemHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Simular actualización
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.reload();
    } finally {
      setRefreshing(false);
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const systemMetrics = [
    {
      title: 'CPU',
      value: '23%',
      icon: Settings,
      color: 'success' as const,
      description: 'Uso promedio del sistema'
    },
    {
      title: 'Memoria RAM',
      value: '4.2GB',
      icon: Zap,
      color: 'info' as const,
      description: '8GB totales disponibles'
    },
    {
      title: 'Disco',
      value: '156GB',
      icon: HardDrive,
      color: 'warning' as const,
      description: '500GB totales disponibles'
    },
    {
      title: 'Red',
      value: '1.2Mbps',
      icon: Globe,
      color: 'success' as const,
      description: 'Ancho de banda actual'
    }
  ];

  // Datos para gráfico de rendimiento
  const performanceData = [
    { name: '00:00', value: 15, cpu: 15, memory: 45, network: 0.8 },
    { name: '04:00', value: 12, cpu: 12, memory: 42, network: 0.5 },
    { name: '08:00', value: 35, cpu: 35, memory: 58, network: 2.1 },
    { name: '12:00', value: 45, cpu: 45, memory: 65, network: 3.5 },
    { name: '16:00', value: 38, cpu: 38, memory: 62, network: 2.8 },
    { name: '20:00', value: 28, cpu: 28, memory: 52, network: 1.9 },
    { name: '23:59', value: 18, cpu: 18, memory: 46, network: 0.9 },
  ];

  const overallHealth = systemHealth.every(h => h.status === 'healthy') ? 'healthy' :
                        systemHealth.some(h => h.status === 'unhealthy') ? 'unhealthy' : 'degraded';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estado del Sistema</h1>
          <p className="text-muted-foreground">
            Monitoreo de salud y rendimiento de los componentes del sistema
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Estado General */}
      <Card className={getHealthColor(overallHealth)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getHealthIcon(overallHealth)}
              <div>
                <h2 className="text-xl font-semibold">Estado General del Sistema</h2>
                <p className="text-sm text-muted-foreground">
                  {overallHealth === 'healthy' ? 'Todos los componentes funcionando correctamente' :
                   overallHealth === 'unhealthy' ? 'Hay componentes críticos que requieren atención' :
                   'Algunos componentes muestran degradación en el rendimiento'}
                </p>
              </div>
            </div>
            <StatusBadge status={overallHealth}>
              {overallHealth === 'healthy' ? 'Saludable' :
               overallHealth === 'unhealthy' ? 'Crítico' : 'Degradado'}
            </StatusBadge>
          </div>
        </CardContent>
      </Card>

      {/* Métricas del Sistema */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {systemMetrics.map((metric, index) => (
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

      {/* Health Checks Detallados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Verificación de Componentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemHealth.map((health, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getHealthColor(health.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getHealthIcon(health.status)}
                    <div>
                      <h3 className="font-semibold">{health.component}</h3>
                      <p className="text-sm text-muted-foreground">{health.details}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={health.status}>
                      {health.status === 'healthy' ? 'Saludable' :
                       health.status === 'unhealthy' ? 'Crítico' : 'Degradado'}
                    </StatusBadge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {health.responseTime}ms
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Rendimiento */}
      <div className="grid gap-6 md:grid-cols-2">
        <AdminLineChart
          data={performanceData}
          title="Rendimiento del Sistema (Últimas 24h)"
          dataKey="cpu"
          color="#8884d8"
          height={300}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Entorno</span>
              <Badge variant="outline">Desarrollo</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Versión</span>
              <Badge variant="outline">v3.0.0</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Node.js</span>
              <Badge variant="outline">v20.x</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Base de Datos</span>
              <Badge variant="outline">Supabase</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">API IA</span>
              <Badge variant="outline">Chutes AI</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}