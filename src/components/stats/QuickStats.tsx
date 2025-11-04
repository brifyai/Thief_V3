'use client';

import { useQuickStats } from '@/hooks/useQuickStats';
import StatCard from './StatCard';
import StatSkeleton from './StatSkeleton';
import type { StatCardConfig } from '@/types/stats';

const statsConfig: StatCardConfig[] = [
  {
    key: 'total',
    icon: '📰',
    label: 'Total de Noticias',
    color: '#2563eb',
    bgColor: '#eff6ff'
  },
  {
    key: 'today',
    icon: '🔥',
    label: 'Noticias de Hoy',
    color: '#dc2626',
    bgColor: '#fef2f2'
  },
  {
    key: 'thisWeek',
    icon: '📅',
    label: 'Esta Semana',
    color: '#059669',
    bgColor: '#f0fdf4'
  },
  {
    key: 'categories',
    icon: '🏷️',
    label: 'Categorías',
    color: '#d97706',
    bgColor: '#fffbeb'
  }
];

export default function QuickStats() {
  const { data, isLoading, error } = useQuickStats();

  // Error silencioso
  if (error) {
    console.error('Error loading stats:', error);
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsConfig.map((_, index) => (
          <StatSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Sin datos
  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statsConfig.map((config) => (
        <StatCard
          key={config.key}
          icon={config.icon}
          value={data[config.key]}
          label={config.label}
          color={config.color}
          bgColor={config.bgColor}
        />
      ))}
    </div>
  );
}
