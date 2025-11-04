'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TopOperation } from '@/services/ai-tokens.service';
import { aiTokensService } from '@/services/ai-tokens.service';
import { Activity, Clock, DollarSign, Zap, User } from 'lucide-react';

interface TopOperationsTableProps {
  operations: TopOperation[];
  loading: boolean;
}

export function TopOperationsTable({ operations, loading }: TopOperationsTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Operaciones Más Costosas
          </CardTitle>
          <CardDescription>
            Cargando operaciones...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                    <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
                  </div>
                </div>
                <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
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
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Operaciones Más Costosas
        </CardTitle>
        <CardDescription>
          Las 10 operaciones de IA con mayor costo en los últimos 7 días
        </CardDescription>
      </CardHeader>
      <CardContent>
        {operations.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">No hay operaciones</h3>
            <p className="text-muted-foreground">
              No se encontraron operaciones de IA en el período seleccionado.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operación</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Cache</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((operation, index) => (
                  <TableRow key={operation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <div>
                          <div className="font-medium">
                            {aiTokensService.getOperationLabel(operation.operation_type)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {operation.endpoint}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {operation.model_used}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {aiTokensService.formatNumber(operation.total_tokens)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          I: {aiTokensService.formatNumber(operation.input_tokens)} / 
                          O: {aiTokensService.formatNumber(operation.output_tokens)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-sm">
                          {aiTokensService.formatDuration(operation.duration_ms)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {operation.cache_hit ? (
                        <Badge variant="default" className="gap-1">
                          <Zap className="h-3 w-3" />
                          Hit
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          Miss
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-medium text-sm">
                          {aiTokensService.formatCost(operation.total_cost)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{aiTokensService.formatDate(operation.created_at)}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Usuario {operation.user_id}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}