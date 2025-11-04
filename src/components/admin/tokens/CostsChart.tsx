'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface OperationData {
  [key: string]: {
    operations: number;
    tokens: number;
    cost: number;
  };
}

interface CostsChartProps {
  data: OperationData | undefined;
  loading: boolean;
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#F97316', // orange
];

export function CostsChart({ data, loading }: CostsChartProps) {
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
      value: data[key].cost,
      operations: data[key].operations,
      tokens: data[key].tokens,
    };
  }).filter(item => item.value > 0); // Filtrar costos con valor 0

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [`$${value.toFixed(6)} USD`, 'Costo']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}