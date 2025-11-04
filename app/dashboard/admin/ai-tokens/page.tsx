'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Bot, 
  DollarSign, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Download,
  RefreshCw,
  Calculator,
  BarChart3,
  PieChart,
  Settings,
  Info
} from 'lucide-react';
import { simpleAITokensService, type SimpleTodayStats, type SimpleAlert, type SimpleTopOperation, type SimpleAIModel } from '@/services/ai-tokens-simple.service';
import { MetricCard } from '@/components/admin/MetricCard';
import { OperationsChart } from '@/components/admin/tokens/OperationsChart';
import { CostsChart } from '@/components/admin/tokens/CostsChart';
import { AlertsList } from '@/components/admin/tokens/AlertsList';
import { TopOperationsTable } from '@/components/admin/tokens/TopOperationsTable';
import { CostCalculator } from '@/components/admin/tokens/CostCalculator';
import { RangeStats } from '@/components/admin/tokens/RangeStats';
import toast from 'react-hot-toast';

export default function AITokensPage() {
  const [todayStats, setTodayStats] = useState<SimpleTodayStats | null>(null);
  const [alerts, setAlerts] = useState<SimpleAlert[]>([]);
  const [topOperations, setTopOperations] = useState<SimpleTopOperation[]>([]);
  const [models, setModels] = useState<SimpleAIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos iniciales
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Cargando datos de AI Tokens...');
      
      const [statsData, alertsData, operationsData, modelsData] = await Promise.allSettled([
        simpleAITokensService.getTodayStats(),
        simpleAITokensService.getAlerts(false, 10),
        simpleAITokensService.getTopOperations(10, 7),
        simpleAITokensService.getAvailableModels()
      ]);

      // Procesar resultados
      if (statsData.status === 'fulfilled') {
        setTodayStats(statsData.value);
        console.log('✅ Estadísticas cargadas:', statsData.value);
      } else {
        console.error('❌ Error cargando estadísticas:', statsData.reason);
      }

      if (alertsData.status === 'fulfilled') {
        setAlerts(alertsData.value);
        console.log('✅ Alertas cargadas:', alertsData.value.length);
      } else {
        console.error('❌ Error cargando alertas:', alertsData.reason);
      }

      if (operationsData.status === 'fulfilled') {
        setTopOperations(operationsData.value);
        console.log('✅ Operaciones cargadas:', operationsData.value.length);
      } else {
        console.error('❌ Error cargando operaciones:', operationsData.reason);
      }

      if (modelsData.status === 'fulfilled') {
        setModels(modelsData.value);
        console.log('✅ Modelos cargados:', modelsData.value.length);
      } else {
        console.error('❌ Error cargando modelos:', modelsData.reason);
      }

    } catch (error) {
      console.error('Error general cargando datos:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      toast.error('Error al cargar los datos de tokens IA');
    } finally {
      setLoading(false);
    }
  };

  // Refrescar datos manualmente
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  // Diagnosticar conexión
  const handleDiagnose = async () => {
    try {
      const diagnosis = await simpleAITokensService.diagnoseConnection();
      
      if (diagnosis.status === 'ok') {
        toast.success('✅ Conexión exitosa con el backend');
      } else {
        toast.error(`❌ Error de conexión: ${diagnosis.message}`);
      }
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      toast.error('Error al diagnosticar conexión');
    }
  };

  // Exportar datos
  const handleExportCSV = () => {
    if (todayStats) {
      const exportData = [
        {
          metric: 'Operaciones Totales',
          value: todayStats.total_operations
        },
        {
          metric: 'Tokens Totales',
          value: todayStats.total_tokens
        },
        {
          metric: 'Costo Total',
          value: todayStats.total_cost
        },
        {
          metric: 'Cache Hits',
          value: todayStats.cache_hits
        },
        {
          metric: 'Cache Misses',
          value: todayStats.cache_misses
        },
        {
          metric: 'Cache Hit Rate',
          value: `${todayStats.cache_hit_rate}%`
        }
      ];
      
      // Usar el servicio de exportación del original si existe, sino crear uno simple
      const csvContent = [
        Object.keys(exportData[0]).join(','),
        ...exportData.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-tokens-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      toast.success('Datos exportados a CSV');
    }
  };

  const handleExportJSON = () => {
    if (todayStats) {
      const jsonContent = JSON.stringify(todayStats, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-tokens-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      toast.success('Datos exportados a JSON');
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Tokens IA</h1>
          <p className="text-muted-foreground">
            Monitoreo del uso y costos de tokens de IA en tiempo real
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDiagnose}
            disabled={refreshing}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Diagnosticar
          </Button>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          
          <Button variant="outline" onClick={handleExportJSON} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error de conexión:</span>
              <span>{error}</span>
            </div>
            <p className="text-sm text-red-600 mt-2">
              Intenta ejecutar el diagnóstico o verifica que el backend esté funcionando.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Operaciones"
          value={simpleAITokensService.formatNumber(todayStats?.total_operations || 0)}
          icon={Activity}
          color="info"
          loading={loading}
          description="Operaciones del día"
        />
        
        <MetricCard
          title="Tokens"
          value={simpleAITokensService.formatNumber(todayStats?.total_tokens || 0)}
          icon={Bot}
          color="success"
          loading={loading}
          description="Tokens consumidos"
        />
        
        <MetricCard
          title="Costo Total"
          value={simpleAITokensService.formatCost(todayStats?.total_cost || 0)}
          icon={DollarSign}
          color="warning"
          loading={loading}
          description="Costo del día"
        />
        
        <MetricCard
          title="Cache Hit Rate"
          value={simpleAITokensService.formatPercentage(todayStats?.cache_hit_rate || 0)}
          icon={TrendingUp}
          color={(todayStats?.cache_hit_rate && todayStats.cache_hit_rate > 70) ? 'success' : 'warning'}
          loading={loading}
          description="Eficiencia de caché"
        />
      </div>

      {/* Tabs para diferentes secciones */}
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="charts" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="calculator" className="gap-2">
            <Calculator className="h-4 w-4" />
            Calculadora
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="operations" className="gap-2">
            <Activity className="h-4 w-4" />
            Operaciones
          </TabsTrigger>
        </TabsList>

        {/* Gráficos */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Operaciones por Tipo
                </CardTitle>
                <CardDescription>
                  Distribución de operaciones de IA por tipo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OperationsChart data={todayStats?.by_operation} loading={loading} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Costos por Tipo
                </CardTitle>
                <CardDescription>
                  Distribución de costos por tipo de operación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CostsChart data={todayStats?.by_operation} loading={loading} />
              </CardContent>
            </Card>
          </div>

          <RangeStats onStatsUpdate={loadData} />
        </TabsContent>

        {/* Calculadora de Costos */}
        <TabsContent value="calculator">
          <CostCalculator models={models} />
        </TabsContent>

        {/* Alertas */}
        <TabsContent value="alerts">
          <AlertsList 
            alerts={alerts} 
            onResolve={async (alertId: number) => {
              try {
                await simpleAITokensService.resolveAlert(alertId);
                toast.success('Alerta resuelta');
                loadData();
              } catch (error) {
                toast.error('Error al resolver alerta');
              }
            }}
            onRefresh={loadData}
            loading={loading}
          />
        </TabsContent>

        {/* Operaciones Más Costosas */}
        <TabsContent value="operations">
          <TopOperationsTable operations={topOperations} loading={loading} />
        </TabsContent>
      </Tabs>

      {/* Estado del Sistema */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold">Estado del Sistema</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {error ? 'Error de conexión' : 'Sistema funcionando correctamente'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Última Actualización</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date().toLocaleString('es-CL')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold">Ayuda</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Visita <code className="bg-muted px-1 rounded">/test-ai-tokens</code> para diagnóstico
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}