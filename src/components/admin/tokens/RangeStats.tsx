'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, BarChart3, TrendingUp, Activity, DollarSign } from 'lucide-react';
import { aiTokensService, type RangeStats } from '@/services/ai-tokens.service';
import toast from 'react-hot-toast';

interface RangeStatsProps {
  onStatsUpdate: () => void;
}

export function RangeStats({ onStatsUpdate }: RangeStatsProps) {
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [rangeStats, setRangeStats] = useState<RangeStats | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!startDate || !endDate) {
      toast.error('Por favor selecciona ambas fechas');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('La fecha de inicio no puede ser mayor a la fecha de fin');
      return;
    }

    setLoading(true);
    try {
      const stats = await aiTokensService.getRangeStats(startDate, endDate);
      setRangeStats(stats);
      toast.success('Estadísticas obtenidas exitosamente');
    } catch (error) {
      console.error('Error getting range stats:', error);
      toast.error('Error al obtener las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Estadísticas por Rango de Fechas
        </CardTitle>
        <CardDescription>
          Consulta estadísticas de uso de tokens IA en un período específico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date">Fecha de Inicio</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">Fecha de Fin</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <Button 
          onClick={handleQuery} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Consultando...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4 mr-2" />
              Consultar Estadísticas
            </>
          )}
        </Button>

        {rangeStats && (
          <div className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-600">Operaciones</span>
                </div>
                <div className="text-2xl font-bold">
                  {aiTokensService.formatNumber(rangeStats.totals.operations)}
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-600">Tokens</span>
                </div>
                <div className="text-2xl font-bold">
                  {aiTokensService.formatNumber(rangeStats.totals.tokens)}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                  <span className="font-semibold text-yellow-600">Costo Total</span>
                </div>
                <div className="text-2xl font-bold">
                  {aiTokensService.formatCost(rangeStats.totals.cost)}
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-3">Resumen del Período</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Período:</span>
                  <Badge variant="outline">
                    {aiTokensService.formatDate(rangeStats.range.start)} - {aiTokensService.formatDate(rangeStats.range.end)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Cache Hit Rate:</span>
                  <Badge variant={rangeStats.cache.hit_rate > 70 ? 'default' : 'secondary'}>
                    {aiTokensService.formatPercentage(rangeStats.cache.hit_rate)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Cache Hits:</span>
                  <span>{aiTokensService.formatNumber(rangeStats.cache.hits)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Misses:</span>
                  <span>{aiTokensService.formatNumber(rangeStats.cache.misses)}</span>
                </div>
              </div>
            </div>

            {rangeStats.by_operation.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-3">Operaciones por Tipo</h4>
                <div className="space-y-2">
                  {rangeStats.by_operation.map((operation, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-background rounded">
                      <div>
                        <div className="font-medium">
                          {aiTokensService.getOperationLabel(operation.operation_type)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Costo promedio: {aiTokensService.formatCost(operation.avg_cost)} | 
                          Duración: {aiTokensService.formatDuration(operation.avg_duration_ms)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{aiTokensService.formatNumber(operation.operations)}</div>
                        <div className="text-xs text-muted-foreground">
                          {aiTokensService.formatNumber(operation.tokens)} tokens
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}