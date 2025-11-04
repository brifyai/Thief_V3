'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OperationData {
  [key: string]: {
    operations: number;
    tokens: number;
    cost: number;
  };
}

interface OperationsChartProps {
  data: OperationData | undefined;
  loading: boolean;
}

export function OperationsChart({ data, loading }: OperationsChartProps) {
  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        No hay datos disponibles
      </div>
    );
  }

  // Transformar datos para el formato de Recharts
  const chartData = Object.keys(data).map(key => {
    const operationLabels: { [key: string]: string } = {
      search: 'Búsqueda',
      sentiment: 'Sentimiento',
      entity: 'Entidades',
      clustering: 'Clustering',
      synonym: 'Sinónimos',
      pattern: 'Patrones',
      other: 'Otro'
    };

    return {
      name: operationLabels[key] || key,
      operaciones: data[key].operations,
      tokens: Math.round(data[key].tokens / 1000), // Convertir a miles para mejor visualización
    };
  }).filter(item => item.operaciones > 0); // Filtrar operaciones con valor 0

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'tokens') {
                return [`${(value * 1000).toLocaleString('es-CL')} tokens`, 'Tokens'];
              }
              return [value.toLocaleString('es-CL'), 'Operaciones'];
            }}
          />
          <Legend />
          <Bar 
            yAxisId="left" 
            dataKey="operaciones" 
            fill="#3B82F6" 
            name="Operaciones"
            radius={[8, 8, 0, 0]}
          />
          <Bar 
            yAxisId="right" 
            dataKey="tokens" 
            fill="#10B981" 
            name="Tokens (miles)"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}