/**
 * Sistema de Lazy Loading Avanzado
 *
 * Este módulo proporciona utilidades para cargar componentes y módulos
 * de forma diferida, optimizando el rendimiento de la aplicación.
 */

import React from 'react';
import { lazy, ComponentType, Suspense, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Componente de carga optimizado
const OptimizedLoader = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={`animate-spin text-blue-500 ${sizeClasses[size]}`} />
    </div>
  );
};

// Componente de carga con skeleton
const SkeletonLoader = ({ lines = 3 }: { lines?: number }) => (
  <div className="p-4 space-y-3">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </div>
    ))}
  </div>
);

// Tipos para el lazy loading
type LazyComponentOptions = {
  fallback?: ReactNode;
  loadingComponent?: ComponentType<any>;
  errorComponent?: ComponentType<{ error: Error; retry: () => void }>;
  preload?: boolean;
  ssr?: boolean;
};

// Componente de error para lazy loading
const LazyErrorBoundary = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
    <div className="text-red-800">
      <h3 className="font-semibold mb-2">Error al cargar componente</h3>
      <p className="text-sm mb-3">{error.message}</p>
      <button
        onClick={retry}
        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  </div>
);

/**
 * Carga un componente de forma lazy con opciones avanzadas
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
) {
  const {
    fallback = <OptimizedLoader />,
    errorComponent = LazyErrorBoundary,
    preload = false,
    ssr = false
  } = options;

  // Crear componente lazy
  const LazyComponent = lazy(importFunc);

  // Preload si se solicita
  if (preload) {
    importFunc();
  }

  // Componente con Suspense y manejo de errores
  const WrappedComponent = (props: any) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );

  return WrappedComponent;
}

/**
 * Carga un componente dinámico de Next.js con opciones avanzadas
 */
export function createDynamicComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
) {
  const {
    fallback = <OptimizedLoader />,
    ssr = false
  } = options;

  return dynamic(importFunc, {
    ssr,
    loading: () => fallback
  });
}

/**
 * Lazy loading para componentes pesados específicos
 */
export const LazyComponents = {
  // Componentes de admin
  AdminDashboard: createLazyComponent(
    () => import('../components/admin/AdminDashboard'),
    {
      fallback: <SkeletonLoader lines={5} />,
      preload: false
    }
  ),

  // Componentes de charts
  ChartsContainer: createLazyComponent(
    () => import('../components/admin/Charts'),
    {
      fallback: <OptimizedLoader size="lg" />,
      preload: false
    }
  ),

  // Componentes de entidades
  EntityManagement: createLazyComponent(
    () => import('../components/entities/EntityManagement'),
    {
      fallback: <SkeletonLoader lines={4} />,
      preload: false
    }
  ),

  // Componentes de testing
  UrlTester: createLazyComponent(
    () => import('../components/SmartUrlTester'),
    {
      fallback: <OptimizedLoader />,
      preload: false
    }
  ),

  // Componentes de estadísticas
  StatsDashboard: createLazyComponent(
    () => import('../components/stats/QuickStats'),
    {
      fallback: <SkeletonLoader lines={3} />,
      preload: false
    }
  )
};

/**
 * Sistema de preload estratégico
 */
export class PreloadManager {
  private static preloadedComponents = new Set<string>();

  /**
   * Preload un componente basado en la ruta actual
   */
  static preloadForRoute(route: string) {
    const preloadMap: Record<string, () => Promise<any>> = {
      '/dashboard/admin': () => import('../components/admin/AdminDashboard'),
      '/dashboard/admin/sites': () => import('../components/admin/UrlsTableWithRetest'),
      '/dashboard/admin/users': () => import('../components/admin/AdminTable'),
      '/dashboard/entities': () => import('../components/entities/EntityManagement'),
      '/dashboard/testing': () => import('../components/SmartUrlTester'),
      '/dashboard/stats': () => import('../components/stats/QuickStats')
    };

    const importFunc = preloadMap[route];
    if (importFunc && !this.preloadedComponents.has(route)) {
      importFunc();
      this.preloadedComponents.add(route);
    }
  }

  /**
   * Preload componentes basado en la interacción del usuario
   */
  static preloadOnHover(importFunc: () => Promise<any>, delay = 200) {
    let timeoutId: NodeJS.Timeout;

    return {
      onMouseEnter: () => {
        timeoutId = setTimeout(() => {
          importFunc();
        }, delay);
      },
      onMouseLeave: () => {
        clearTimeout(timeoutId);
      }
    };
  }

  /**
   * Preload componentes cuando la conexión es buena
   */
  static preloadOnGoodConnection(importFunc: () => Promise<any>) {
    if (typeof window !== 'undefined') {
      const connection = (navigator as any).connection;
      if (connection && (connection.effectiveType === '4g' || connection.downlink > 1.5)) {
        importFunc();
      }
    }
  }
}

/**
 * Hook para lazy loading condicional
 */
export function useConditionalLazy<T extends ComponentType<any>>(
  condition: boolean,
  importFunc: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
) {
  if (!condition) {
    return null;
  }

  return createLazyComponent(importFunc, options);
}

/**
 * Lazy loading para imágenes con fallback
 */
export const LazyImage = ({ 
  src, 
  alt, 
  className, 
  fallbackSrc = '/placeholder.jpg',
  ...props 
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  [key: string]: any;
}) => {
  const [imageSrc, setImageSrc] = React.useState(src);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    img.onerror = () => {
      setImageSrc(fallbackSrc);
      setIsLoading(false);
    };
    img.src = src;
  }, [src, fallbackSrc]);

  if (isLoading) {
    return <div className={`animate-pulse bg-gray-200 ${className}`} />;
  }

  return (
    <img 
      src={imageSrc} 
      alt={alt} 
      className={className}
      {...props}
    />
  );
};

export default {
  createLazyComponent,
  createDynamicComponent,
  LazyComponents,
  PreloadManager,
  useConditionalLazy,
  LazyImage,
  OptimizedLoader,
  SkeletonLoader
};