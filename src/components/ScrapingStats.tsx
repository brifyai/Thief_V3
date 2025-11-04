'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  FileText, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Activity,
  Database,
  Zap
} from 'lucide-react';
import { useScrapingStats } from '@/hooks/useScrapingStats';

interface ScrapingStatsProps {
  refreshTrigger?: number;
}

export const ScrapingStats: React.FC<ScrapingStatsProps> = ({ refreshTrigger }) => {
  const { stats, loading: isLoading, error } = useScrapingStats(refreshTrigger);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error || 'No se pudieron cargar las estadísticas'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRate = stats.totalScrapings > 0 
    ? Math.round((stats.successfulScrapings / stats.totalScrapings) * 100)
    : 0;

  const avgProcessingTime = stats.totalScrapings > 0
    ? Math.round(stats.totalProcessingTime / stats.totalScrapings)
    : 0;

  return (
    <div className="space-y-6">
      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Scrapings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scrapings</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScrapings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Desde el inicio del sistema
            </p>
          </CardContent>
        </Card>

        {/* Artículos Extraídos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Artículos Extraídos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalArticles.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Contenido procesado exitosamente
            </p>
          </CardContent>
        </Card>

        {/* Tasa de Éxito */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successRate}%</div>
            <Progress value={successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.successfulScrapings} de {stats.totalScrapings} exitosos
            </p>
          </CardContent>
        </Card>

        {/* Tiempo Promedio */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProcessingTime}s</div>
            <p className="text-xs text-muted-foreground">
              Por scraping completado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas Detalladas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado del Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Estado del Sistema
            </CardTitle>
            <CardDescription>
              Información en tiempo real del sistema de scraping
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">URLs Activas</span>
              <Badge variant="default">{stats.activeUrls}</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Scrapings Hoy</span>
              <Badge variant="secondary">{stats.scrapingsToday}</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Errores Recientes</span>
              <Badge variant={stats.recentErrors > 0 ? "destructive" : "default"}>
                {stats.recentErrors}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Última Actividad</span>
              <span className="text-sm text-muted-foreground">
                {stats.lastActivity ? new Date(stats.lastActivity).toLocaleString() : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Rendimiento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Rendimiento
            </CardTitle>
            <CardDescription>
              Métricas de eficiencia del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Velocidad Promedio</span>
                <span className="text-sm font-medium">
                  {stats.averageSpeed ? `${stats.averageSpeed} art/min` : 'N/A'}
                </span>
              </div>
              <Progress 
                value={Math.min((stats.averageSpeed || 0) * 10, 100)} 
                className="h-2" 
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Uso de Memoria</span>
                <span className="text-sm font-medium">
                  {stats.memoryUsage ? `${stats.memoryUsage}%` : 'N/A'}
                </span>
              </div>
              <Progress 
                value={stats.memoryUsage || 0} 
                className="h-2" 
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Carga del Sistema</span>
                <span className="text-sm font-medium">
                  {stats.systemLoad ? `${stats.systemLoad}%` : 'N/A'}
                </span>
              </div>
              <Progress 
                value={stats.systemLoad || 0} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendencias Recientes */}
      {stats.recentTrends && stats.recentTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendencias Recientes (Últimos 7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.recentTrends.map((trend, index) => (
                <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold">{trend.value}</div>
                  <div className="text-sm text-muted-foreground">{trend.label}</div>
                  {trend.change && (
                    <div className={`text-xs mt-1 ${
                      trend.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trend.change > 0 ? '↗' : '↘'} {Math.abs(trend.change)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información Adicional */}
      <div className="text-xs text-muted-foreground text-center">
        <Database className="h-4 w-4 inline mr-1" />
        Estadísticas actualizadas en tiempo real • 
        Última actualización: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}