'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, AlertCircle, Check } from 'lucide-react';
import type { EntityAlert } from '@/types/entities';

interface AlertsListProps {
  alerts: EntityAlert[];
  onMarkAsRead?: (alertId: number) => void;
}

const severityConfig = {
  LOW: {
    icon: Info,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600'
  },
  MEDIUM: {
    icon: AlertCircle,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: 'text-yellow-600'
  },
  HIGH: {
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600'
  }
};

export default function AlertsList({ alerts, onMarkAsRead }: AlertsListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Check className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin alertas</h3>
          <p className="text-sm text-muted-foreground text-center">
            No hay alertas pendientes para esta entidad
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;

        return (
          <Card 
            key={alert.id} 
            className={`transition-all ${
              alert.is_read ? 'opacity-60' : 'border-l-4'
            }`}
            style={!alert.is_read ? { borderLeftColor: config.iconColor.replace('text-', '#') } : {}}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className={`w-5 h-5 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base">
                        {alert.title}
                      </CardTitle>
                      {!alert.is_read && (
                        <Badge variant="default" className="text-xs">
                          Nueva
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      {alert.message}
                    </CardDescription>
                  </div>
                </div>
                
                {!alert.is_read && onMarkAsRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkAsRead(alert.id)}
                    className="shrink-0"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Marcar leída
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`${config.color} text-xs`}>
                    {alert.severity}
                  </Badge>
                  <span>{alert.type}</span>
                </div>
                <span>{formatDate(alert.created_at)}</span>
              </div>

              {/* Metadata adicional */}
              {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Ver detalles
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(alert.metadata, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
