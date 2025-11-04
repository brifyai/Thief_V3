'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Alert } from '@/services/ai-tokens.service';
import { aiTokensService } from '@/services/ai-tokens.service';

interface AlertsListProps {
  alerts: Alert[];
  onResolve: (alertId: number) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function AlertsList({ alerts, onResolve, onRefresh, loading }: AlertsListProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
      default:
        return 'default';
    }
  };

  const handleResolve = async (alertId: number) => {
    try {
      await aiTokensService.resolveAlert(alertId);
      onResolve(alertId);
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas Activas
          </CardTitle>
          <CardDescription>
            Cargando alertas...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-muted animate-pulse rounded"></div>
                    <div className="h-3 w-32 bg-muted animate-pulse rounded"></div>
                  </div>
                </div>
                <div className="h-8 w-20 bg-muted animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas Activas ({alerts.length})
            </CardTitle>
            <CardDescription>
              Alertas del sistema que requieren atención
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-600">No hay alertas activas</h3>
            <p className="text-muted-foreground">
              Todas las alertas han sido resueltas o no hay problemas detectados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg ${
                  alert.severity === 'error'
                    ? 'border-red-200 bg-red-50'
                    : alert.severity === 'warning'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.alert_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {aiTokensService.formatDate(alert.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{alert.message}</p>
                      <div className="text-xs text-muted-foreground">
                        <span>Umbral: ${alert.threshold.toFixed(2)} | </span>
                        <span>Actual: ${alert.current_value.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolve(alert.id)}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Resolver
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}