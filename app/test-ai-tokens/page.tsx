'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  DollarSign, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Calculator,
  BarChart3,
  TrendingUp,
  Settings,
  Info
} from 'lucide-react';
import { simpleAITokensService, type SimpleTodayStats, type SimpleAlert, type SimpleAIModel, type SimpleTopOperation, type SimpleCalculatorData } from '@/services/ai-tokens-simple.service';
import toast from 'react-hot-toast';

export default function TestAITokensPage() {
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<{ status: 'ok' | 'error'; message: string; details?: Record<string, unknown> } | null>(null);
  const [todayStats, setTodayStats] = useState<SimpleTodayStats | null>(null);
  const [alerts, setAlerts] = useState<SimpleAlert[]>([]);
  const [models, setModels] = useState<SimpleAIModel[]>([]);
  const [topOperations, setTopOperations] = useState<SimpleTopOperation[]>([]);
  const [calculatorResult, setCalculatorResult] = useState<SimpleCalculatorData | null>(null);

  const runDiagnosis = async () => {
    setLoading(true);
    try {
      const result = await simpleAITokensService.diagnoseConnection();
      setDiagnosis(result);
      
      if (result.status === 'ok') {
        toast.success('✅ Diagnóstico exitoso');
      } else {
        toast.error(`❌ Error en diagnóstico: ${result.message}`);
      }
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      toast.error('Error al ejecutar diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  const testTodayStats = async () => {
    setLoading(true);
    try {
      const stats = await simpleAITokensService.getTodayStats();
      setTodayStats(stats);
      toast.success('✅ Estadísticas del día obtenidas');
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      toast.error('Error al obtener estadísticas del día');
    } finally {
      setLoading(false);
    }
  };

  const testAlerts = async () => {
    setLoading(true);
    try {
      const alertsData = await simpleAITokensService.getAlerts(false, 10);
      setAlerts(alertsData);
      toast.success(`✅ ${alertsData.length} alertas obtenidas`);
    } catch (error) {
      console.error('Error obteniendo alertas:', error);
      toast.error('Error al obtener alertas');
    } finally {
      setLoading(false);
    }
  };

  const testModels = async () => {
    setLoading(true);
    try {
      const modelsData = await simpleAITokensService.getAvailableModels();
      setModels(modelsData);
      toast.success(`✅ ${modelsData.length} modelos obtenidos`);
    } catch (error) {
      console.error('Error obteniendo modelos:', error);
      toast.error('Error al obtener modelos');
    } finally {
      setLoading(false);
    }
  };

  const testTopOperations = async () => {
    setLoading(true);
    try {
      const operations = await simpleAITokensService.getTopOperations(10, 7);
      setTopOperations(operations);
      toast.success(`✅ ${operations.length} operaciones obtenidas`);
    } catch (error) {
      console.error('Error obteniendo operaciones:', error);
      toast.error('Error al obtener operaciones');
    } finally {
      setLoading(false);
    }
  };

  const testCalculator = async () => {
    setLoading(true);
    try {
      const result = await simpleAITokensService.calculateCost(10000, 'llama3-8b-8192', 'input');
      setCalculatorResult(result);
      toast.success('✅ Costo calculado');
    } catch (error) {
      console.error('Error calculando costo:', error);
      toast.error('Error al calcular costo');
    } finally {
      setLoading(false);
    }
  };

  const testAllEndpoints = async () => {
    setLoading(true);
    try {
      await Promise.all([
        runDiagnosis(),
        testTodayStats(),
        testAlerts(),
        testModels(),
        testTopOperations(),
        testCalculator()
      ]);
      toast.success('✅ Todos los endpoints probados');
    } catch (error) {
      console.error('Error en pruebas:', error);
      toast.error('Error en algunas pruebas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            Test de AI Tokens
          </h1>
          <p className="text-muted-foreground mt-2">
            Diagnóstico y pruebas de los endpoints de AI Tokens del backend
          </p>
        </div>

        {/* Diagnóstico Inicial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Diagnóstico de Conexión
            </CardTitle>
            <CardDescription>
              Verifica la conexión con el backend y la configuración de autenticación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={runDiagnosis}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Ejecutar Diagnóstico
              </Button>
              
              <Button
                onClick={testAllEndpoints}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Probar Todo
              </Button>
            </div>

            {diagnosis && (
              <div className={`p-4 rounded-lg border ${
                diagnosis.status === 'ok' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {diagnosis.status === 'ok' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    diagnosis.status === 'ok' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {diagnosis.status === 'ok' ? '✅ Conexión Exitosa' : '❌ Error de Conexión'}
                  </span>
                </div>
                <p className={`text-sm mb-2 ${
                  diagnosis.status === 'ok' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {diagnosis.message}
                </p>
                {diagnosis.details && (
                  <div className="text-xs space-y-1">
                    <div><strong>API URL:</strong> {diagnosis.details.api_url as string}</div>
                    <div><strong>Token Presente:</strong> {diagnosis.details.token_present ? '✅' : '❌'}</div>
                    {diagnosis.details.response_status && (
                      <div><strong>Status Response:</strong> {diagnosis.details.response_status as string}</div>
                    )}
                    {diagnosis.details.data_keys && (
                      <div><strong>Claves de Datos:</strong> {Array.isArray(diagnosis.details.data_keys) ? diagnosis.details.data_keys.join(', ') : 'N/A'}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs para diferentes pruebas */}
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Estadísticas
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-2">
              <Bot className="h-4 w-4" />
              Modelos
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-2">
              <Activity className="h-4 w-4" />
              Operaciones
            </TabsTrigger>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="h-4 w-4" />
              Calculadora
            </TabsTrigger>
          </TabsList>

          {/* Estadísticas */}
          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Estadísticas del Día
                  </span>
                  <Button
                    onClick={testTodayStats}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayStats ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-600">Operaciones</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {simpleAITokensService.formatNumber(todayStats.total_operations)}
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-600">Tokens</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {simpleAITokensService.formatNumber(todayStats.total_tokens)}
                      </div>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-yellow-600" />
                        <span className="font-semibold text-yellow-600">Costo</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {simpleAITokensService.formatCost(todayStats.total_cost)}
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-purple-600">Cache Hit Rate</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {simpleAITokensService.formatPercentage(todayStats.cache_hit_rate)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Haz clic en "Probar Estadísticas" para obtener datos</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alertas */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Alertas Activas
                  </span>
                  <Button
                    onClick={testAlerts}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length > 0 ? (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge variant="outline" className="mb-2">
                              {alert.alert_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <p className="text-sm font-medium">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {simpleAITokensService.formatDate(alert.created_at)}
                            </p>
                          </div>
                          <Badge variant={alert.severity === 'error' ? 'destructive' : 'secondary'}>
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay alertas activas o haz clic en "Probar Alertas"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modelos */}
          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Modelos Disponibles
                  </span>
                  <Button
                    onClick={testModels}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {models.length > 0 ? (
                  <div className="space-y-3">
                    {models.map((model) => (
                      <div key={model.name} className="p-4 border rounded-lg">
                        <div className="font-semibold mb-2">{model.name}</div>
                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span>Input:</span>
                            <Badge variant="outline">{model.input_cost_formatted}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Output:</span>
                            <Badge variant="outline">{model.output_cost_formatted}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Haz clic en "Probar Modelos" para obtener datos</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operaciones */}
          <TabsContent value="operations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Operaciones Más Costosas
                  </span>
                  <Button
                    onClick={testTopOperations}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topOperations.length > 0 ? (
                  <div className="space-y-3">
                    {topOperations.map((operation, index) => (
                      <div key={operation.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant="outline" className="mb-2">#{index + 1}</Badge>
                            <div className="font-medium">
                              {simpleAITokensService.getOperationLabel(operation.operation_type)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {operation.model_used} • {simpleAITokensService.formatDuration(operation.duration_ms)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {simpleAITokensService.formatCost(operation.total_cost)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {simpleAITokensService.formatNumber(operation.total_tokens)} tokens
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Haz clic en "Probar Operaciones" para obtener datos</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calculadora */}
          <TabsContent value="calculator" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Calculadora de Costos
                  </span>
                  <Button
                    onClick={testCalculator}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calculatorResult ? (
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-muted rounded-lg">
                      <div className="text-3xl font-bold text-primary">
                        {simpleAITokensService.formatCost(calculatorResult.cost_usd)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        Para {simpleAITokensService.formatNumber(calculatorResult.tokens)} tokens {calculatorResult.type}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Modelo: {calculatorResult.model}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Haz clic en "Probar Calculadora" para obtener datos</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Información Técnica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Información Técnica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>API Base URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}</div>
            <div><strong>Token:</strong> {localStorage.getItem('token') ? '✅ Presente' : '❌ No encontrado'}</div>
            <div><strong>Endpoints Probados:</strong></div>
            <ul className="ml-4 space-y-1">
              <li>• GET /api/ai-usage/stats/today</li>
              <li>• GET /api/ai-usage/alerts</li>
              <li>• GET /api/ai-usage/models</li>
              <li>• GET /api/ai-usage/top-operations</li>
              <li>• GET /api/ai-usage/calculator</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}