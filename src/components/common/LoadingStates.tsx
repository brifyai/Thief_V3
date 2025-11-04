'use client';

import { Loader2 } from 'lucide-react';
import { Skeleton, SkeletonCard, SkeletonArticle } from './SkeletonLoader';

// Componente de carga para páginas completas
export function PageLoading({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

// Componente de carga para contenido específico
export function ContentLoading({ text = 'Cargando contenido...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

// Componente de carga inline
export function InlineLoading({ size = 'sm', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex items-center gap-2">
      <Loader2 className={`animate-spin text-primary ${sizeClasses[size]}`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

// Componente de carga para tablas
export function TableLoading({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b">
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton
              key={colIndex}
              width={colIndex === 0 ? 40 : 120}
              height={16}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Componente de carga para cards
export function CardsLoading({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

// Componente de carga para listas
export function ListLoading({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={14} />
          </div>
          <Skeleton width={80} height={32} />
        </div>
      ))}
    </div>
  );
}

// Componente de carga para formularios
export function FormLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton width={120} height={16} />
        <Skeleton width="100%" height={40} />
      </div>
      <div className="space-y-2">
        <Skeleton width={100} height={16} />
        <Skeleton width="100%" height={40} />
      </div>
      <div className="space-y-2">
        <Skeleton width={80} height={16} />
        <Skeleton width="100%" height={80} />
      </div>
      <div className="flex gap-4">
        <Skeleton width={120} height={40} />
        <Skeleton width={100} height={40} />
      </div>
    </div>
  );
}

// Componente de carga con fallback
export function LoadingFallback({ 
  children, 
  isLoading, 
  fallback, 
  text 
}: { 
  children: React.ReactNode;
  isLoading: boolean;
  fallback?: React.ReactNode;
  text?: string;
}) {
  if (isLoading) {
    return fallback || <ContentLoading text={text} />;
  }
  return <>{children}</>;
}

// Componente de carga para stats
export function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="border rounded-lg p-6">
          <Skeleton width="60%" height={16} className="mb-2" />
          <Skeleton width="40%" height={32} />
        </div>
      ))}
    </div>
  );
}

// Componente de carga para gráficos
export function ChartLoading({ height = 300 }: { height?: number }) {
  return (
    <div className="w-full border rounded-lg p-6">
      <Skeleton width="100%" height={height} />
    </div>
  );
}

// Componente de carga para búsqueda
export function SearchLoading() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton width="100%" height={40} />
        <Skeleton width={120} height={40} />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} width={80} height={32} />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonArticle key={i} />
        ))}
      </div>
    </div>
  );
}