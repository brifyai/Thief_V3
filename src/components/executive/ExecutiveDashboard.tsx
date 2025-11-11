/**
 * Dashboard Ejecutivo con KPIs Avanzados
 * 
 * Componente principal para visualizar métricas ejecutivas y KPIs
 * de alto nivel para toma de decisiones estratégicas.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Zap,
  Shield,
  Target,
  BarChart3
} from 'lucide-react';
import { metricsCollector } from '../../lib/advanced-metrics';

interface KPICard {
  title: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
  status: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
  description: string;
}

interface ExecutiveKPIs {
  performance: number;
  reliability: number;
  userExperience: number;
  businessImpact: number;
  overall: number;
}

export const ExecutiveDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<ExecutiveKPIs>({
    performance: 0,
    reliability: 0,
    userExperience: 0,
    businessImpact: 0,
    overall: 0
  });
  
  const [kpiCards, setKpiCards] = useState<KPICard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Cargar datos de KPIs
  useEffect(() => {
    const loadKPIs = () => {
      try {
        const executiveKPIs = metricsCollector.getExecutiveKPIs();
        setKpis(executiveKPIs);

        // Generar tarjetas de KPIs basadas en métricas reales
        const cards: KPICard[] = [
          {
            title: 'Rendimiento General',
            value: executiveKPIs.performance,
            unit: '%',
            trend: 'stable',
            status: executiveKPIs.performance >= 80 ? 'good' : executiveKPIs.performance >= 60 ? 'warning' : 'critical',
            icon: <Zap className="w-5 h-5" />,
            description: 'Velocidad de respuesta y eficiencia del sistema'
          },
          {
            title: 'Fiabilidad',
            value: executiveKPIs.reliability,
            unit: '%',
            trend: 'stable',
            status: executiveKPIs.reliability >= 95 ? 'good' : executiveKPIs.reliability >= 85 ? 'warning' : 'critical',
            icon: <Shield className="w-5 h-5" />,
            description: 'Disponibilidad y estabilidad del servicio'
          },
          {
            title: 'Experiencia de Usuario',
            value: executiveKPIs.userExperience,
            unit: '%',
            trend: 'stable',
            status: executiveKPIs.userExperience >= 80 ? 'good' : executiveKPIs.userExperience >= 60 ? 'warning' : 'critical',
            icon: <Users className="w-5 h-5" />,
            description: 'Satisfacción y facilidad de uso'
          },
          {
            title: 'Impacto de Negocio',
            value: executiveKPIs.businessImpact,
            unit: '%',
            trend: 'stable',
            status: executiveKPIs.businessImpact >= 75 ? 'good' : executiveKPIs.businessImpact >= 50 ? 'warning' : 'critical',
            icon: <Target className="w-5 h-5" />,
            description: 'Contribución a objetivos de negocio'
          }
        ];

        setKpiCards(cards);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error loading KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadKPIs();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadKPIs, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
    }
  };

  const getStatusBadge = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return <Badge className="bg-green-100 text-green-800">Óptimo</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Atención</Badge>;
      case 'critical': return <Badge className="bg-red-100 text-red-800">Crítico</Badge>;
    }
  };

  const getOverallStatus = (score: number) => {
    if (score >= 85) return { text: 'Excelente', color: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 70) return { text: 'Bueno', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (score >= 50) return { text: 'Regular', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { text: 'Crítico', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const overallStatus = getOverallStatus(kpis.overall);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con score general */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Dashboard Ejecutivo
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Métricas clave de rendimiento y estado del sistema
              </p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${overallStatus.color}`}>
                {kpis.overall}%
              </div>
              <Badge className={`${overallStatus.bg} ${overallStatus.color} border-0`}>
                {overallStatus.text}
              </Badge>
              <div className="text-sm text-gray-500 mt-1">
                Última actualización: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className={`border-l-4 ${
            kpi.status === 'good' ? 'border-l-green-500' :
            kpi.status === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${getStatusColor(kpi.status)}`}>
                  {kpi.icon}
                </div>
                {getStatusBadge(kpi.status)}
              </div>
              <CardTitle className="text-sm font-medium text-gray-600">
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-gray-900">
                    {kpi.value}
                  </span>
                  <span className="ml-1 text-sm text-gray-600">{kpi.unit}</span>
                </div>
                <Progress
                  value={kpi.value}
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {kpi.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Métricas Detalladas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Métricas de Rendimiento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Métricas de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <PerformanceMetricRow 
                name="Tiempo de Respuesta" 
                value={245} 
                unit="ms" 
                threshold={{ good: 200, poor: 1000 }}
              />
              <PerformanceMetricRow 
                name="Tasa de Error" 
                value={0.8} 
                unit="%" 
                threshold={{ good: 1, poor: 5 }}
              />
              <PerformanceMetricRow 
                name="Throughput" 
                value={1250} 
                unit="req/s" 
                threshold={{ good: 1000, poor: 500 }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Métricas de Usuario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Métricas de Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <UserMetricRow 
                name="Usuarios Activos" 
                value={1847} 
                trend="up" 
                trendValue={12}
              />
              <UserMetricRow 
                name="Duración de Sesión" 
                value={4.2} 
                unit="min" 
                trend="stable" 
              />
              <UserMetricRow 
                name="Tasa de Rebote" 
                value={32} 
                unit="%" 
                trend="down" 
                trendValue={8}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y Recomendaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Alertas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AlertItem 
                level="warning" 
                message="Uso de CPU elevado en servidor principal" 
                time="Hace 5 min"
              />
              <AlertItem 
                level="info" 
                message="Backup programado para las 2:00 AM" 
                time="Hace 1 hora"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Servicios Saludables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ServiceStatus name="API Gateway" status="healthy" uptime="99.9%" />
              <ServiceStatus name="Base de Datos" status="healthy" uptime="99.8%" />
              <ServiceStatus name="CDN" status="healthy" uptime="99.95%" />
              <ServiceStatus name="Cache Redis" status="warning" uptime="98.5%" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Tendencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <TrendItem 
                metric="Rendimiento" 
                trend="up" 
                value={5.2} 
                period="últimos 7 días"
              />
              <TrendItem 
                metric="Errores" 
                trend="down" 
                value={12.8} 
                period="últimos 7 días"
              />
              <TrendItem 
                metric="Usuarios" 
                trend="up" 
                value={8.1} 
                period="últimos 7 días"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componentes auxiliares
const PerformanceMetricRow: React.FC<{
  name: string;
  value: number;
  unit?: string;
  threshold: { good: number; poor: number };
}> = ({ name, value, unit = '', threshold }) => {
  const getStatus = () => {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'warning';
    return 'critical';
  };

  const status = getStatus();
  const statusColor = status === 'good' ? 'text-green-600' : status === 'warning' ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{name}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${statusColor}`}>
          {value}{unit}
        </span>
        <div className={`w-2 h-2 rounded-full ${
          status === 'good' ? 'bg-green-500' :
          status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
      </div>
    </div>
  );
};

const UserMetricRow: React.FC<{
  name: string;
  value: number;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
}> = ({ name, value, unit = '', trend, trendValue }) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{name}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">
          {value}{unit}
        </span>
        {trendValue && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span className="text-xs">{trendValue}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

const AlertItem: React.FC<{
  level: 'critical' | 'warning' | 'info';
  message: string;
  time: string;
}> = ({ level, message, time }) => {
  const levelColors = {
    critical: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  };

  return (
    <div className={`p-3 rounded-lg border ${levelColors[level]}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          <p className="text-xs opacity-75 mt-1">{time}</p>
        </div>
      </div>
    </div>
  );
};

const ServiceStatus: React.FC<{
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
}> = ({ name, status, uptime }) => {
  const statusColors = {
    healthy: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800'
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{name}</span>
      <div className="flex items-center gap-2">
        <Badge className={statusColors[status]}>
          {status === 'healthy' ? 'OK' : status === 'warning' ? 'Alerta' : 'Crítico'}
        </Badge>
        <span className="text-xs text-gray-500">{uptime}</span>
      </div>
    </div>
  );
};

const TrendItem: React.FC<{
  metric: string;
  trend: 'up' | 'down';
  value: number;
  period: string;
}> = ({ metric, trend, value, period }) => {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{metric}</span>
      <div className={`flex items-center gap-1 ${trendColor}`}>
        <TrendIcon className="w-3 h-3" />
        <span className="text-sm font-medium">{value}%</span>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;