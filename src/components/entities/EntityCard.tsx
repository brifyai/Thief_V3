'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, Edit, Trash2, Power, MoreVertical, Bell, BellOff, TrendingUp, Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAnalyzeEntity } from '@/hooks/useEntities';
import type { Entity } from '@/types/entities';

interface EntityCardProps {
  entity: Entity;
  onDelete: () => void;
  onToggle: () => void;
}

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  PERSON: {
    icon: '👤',
    label: 'Persona',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  COMPANY: {
    icon: '🏢',
    label: 'Empresa',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  TOPIC: {
    icon: '📍',
    label: 'Tema',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  EVENT: {
    icon: '📅',
    label: 'Evento',
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  }
};

export default function EntityCard({ entity, onDelete, onToggle }: EntityCardProps) {
  const { analyzeEntity, isLoading: isAnalyzing, error } = useAnalyzeEntity();

  // Obtener config con fallback
  const config = typeConfig[entity.type] || {
    icon: '📄',
    label: entity.type || 'Desconocido',
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const handleAnalyze = () => {
    // Usar la función de mutación del hook
    analyzeEntity({ 
      id: entity.id.toString(), 
      options: { days: 30, limit: 100 } 
    });
  };

  return (
    <Card 
      className={`transition-all duration-300 hover:shadow-lg ${
        !entity.is_active ? 'opacity-60' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-3xl shrink-0">{config.icon}</div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{entity.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`${config.color} text-xs`}>
                  {config.label}
                </Badge>
                {!entity.is_active && (
                  <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                    Inactiva
                  </Badge>
                )}
                {entity.alert_enabled && (
                  <Bell className="w-3 h-3 text-yellow-600" />
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/entities/${entity.id}`} className="cursor-pointer">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalles
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/entities/${entity.id}/edit`} className="cursor-pointer">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggle}>
                <Power className="mr-2 h-4 w-4" />
                {entity.is_active ? 'Desactivar' : 'Activar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Aliases */}
        {entity.aliases && entity.aliases.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entity.aliases.slice(0, 3).map((alias, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {alias}
              </Badge>
            ))}
            {entity.aliases.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{entity.aliases.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {entity._count?.mentions || 0}
            </div>
            <div className="text-xs text-muted-foreground">Menciones</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              (entity._count?.alerts || 0) > 0 ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              {entity._count?.alerts || 0}
            </div>
            <div className="text-xs text-muted-foreground">Alertas</div>
          </div>
        </div>



        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button asChild className="flex-1" size="sm" variant="outline">
            <Link href={`/dashboard/entities/${entity.id}`}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Ver análisis
            </Link>
          </Button>
          <Button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !entity.is_active}
            size="sm"
            className="flex-1"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            {isAnalyzing ? 'Analizando...' : 'Analizar Ahora'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
