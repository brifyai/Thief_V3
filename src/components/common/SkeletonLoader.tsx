'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  lines = 1,
  animate = true,
}: SkeletonProps) {
  const baseClasses = cn(
    'bg-muted',
    animate && 'animate-pulse',
    {
      'rounded-full': variant === 'circular',
      'rounded-md': variant === 'rectangular' || variant === 'default',
      'rounded': variant === 'text',
    },
    className
  );

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : undefined),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              i === lines - 1 ? 'w-3/4' : 'w-full'
            )}
            style={style}
          />
        ))}
      </div>
    );
  }

  return <div className={baseClasses} style={style} />;
}

// Componentes específicos para casos comunes

export function SkeletonCard() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="40%" height={20} />
          <Skeleton width="60%" height={16} />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton lines={3} height={16} />
      </div>
      <div className="flex justify-between">
        <Skeleton width={80} height={32} />
        <Skeleton width={80} height={32} />
      </div>
    </div>
  );
}

export function SkeletonArticle() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="space-y-3">
        <Skeleton width="80%" height={24} />
        <div className="flex flex-wrap gap-2">
          <Skeleton width={100} height={24} />
          <Skeleton width={80} height={24} />
          <Skeleton width={120} height={24} />
        </div>
      </div>
      <Skeleton lines={4} height={16} />
      <div className="flex gap-2">
        <Skeleton width={120} height={36} />
        <Skeleton width={100} height={36} />
        <Skeleton width={80} height={36} />
      </div>
    </div>
  );
}

export function SkeletonEntity() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={16} />
        </div>
        <div className="flex gap-2">
          <Skeleton width={60} height={24} />
          <Skeleton width={60} height={24} />
        </div>
      </div>
      <div className="flex gap-4 text-sm">
        <Skeleton width={80} height={16} />
        <Skeleton width={60} height={16} />
      </div>
      <div className="flex gap-2">
        <Skeleton width={60} height={32} />
        <Skeleton width={40} height={32} />
        <Skeleton width={40} height={32} />
        <Skeleton width={40} height={32} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={`header-${i}`} width={120} height={20} />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 p-4 border-b">
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              width={colIndex === 0 ? 40 : 120} 
              height={16} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
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

export function SkeletonForm() {
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

export function SkeletonSearchResults() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonArticle key={i} />
      ))}
    </div>
  );
}

// Loader de pantalla completa
export function FullPageLoader({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

// Loader para contenido específico
export function ContentLoader({ text = 'Cargando contenido...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

// Loader inline
export function InlineLoader({ size = 'sm', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`}></div>
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}