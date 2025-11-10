/**
 * Sistema de Optimización de Imágenes
 *
 * Este módulo proporciona utilidades para optimizar la carga y visualización
 * de imágenes en la aplicación, mejorando el rendimiento.
 */

import React from 'react';
import Image from 'next/image';
import { useState, useCallback } from 'react';

// Configuración de optimización de imágenes
export const IMAGE_CONFIG = {
  // Calidad de compresión (0-100)
  quality: {
    high: 90,
    medium: 75,
    low: 60
  },
  
  // Formatos soportados
  formats: ['webp', 'avif', 'jpg', 'png'],
  
  // Tamaños responsivos comunes
  sizes: {
    thumbnail: [150, 150],
    small: [300, 200],
    medium: [600, 400],
    large: [1200, 800],
    hero: [1920, 1080]
  },
  
  // Lazy loading threshold
  lazyThreshold: 200
};

// Componente de imagen optimizada
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: 'high' | 'medium' | 'low';
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  className?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 'medium',
  priority = false,
  placeholder = 'empty',
  className,
  sizes,
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className}`}>
        <span className="text-gray-500 text-sm">Error al cargar imagen</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={IMAGE_CONFIG.quality[quality]}
        priority={priority}
        placeholder={placeholder}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
};

// Hook para carga diferida de imágenes
export function useLazyImage(src: string, options: { threshold?: number } = {}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const threshold = options.threshold || IMAGE_CONFIG.lazyThreshold;

  const loadImage = useCallback(() => {
    if (!src) return;

    setIsLoading(true);
    setError(null);

    const img = document.createElement('img');
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setError('No se pudo cargar la imagen');
      setIsLoading(false);
    };
    
    img.src = src;
  }, [src]);

  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadImage();
      }
    });
  }, [loadImage]);

  return {
    imageSrc,
    isLoading,
    error,
    observerCallback,
    loadImage
  };
}

// Utilidad para generar srcsets responsivos
export function generateSrcSet(baseUrl: string, sizes: number[]): string {
  return sizes
    .map(size => `${baseUrl}?w=${size} ${size}w`)
    .join(', ');
}

// Utilidad para optimizar URLs de imágenes
export function optimizeImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpg' | 'png';
  } = {}
): string {
  const { width, height, quality = 75, format = 'webp' } = options;
  
  // Si es una URL externa, retornar tal cual
  if (url.startsWith('http')) {
    return url;
  }
  
  // Construir URL optimizada para imágenes locales
  let optimizedUrl = url;
  const params = new URLSearchParams();
  
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  if (quality !== 75) params.append('q', quality.toString());
  if (format !== 'webp') params.append('f', format);
  
  if (params.toString()) {
    optimizedUrl += `?${params.toString()}`;
  }
  
  return optimizedUrl;
}

// Componente de galería optimizada
interface OptimizedGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  columns?: number;
  gap?: string;
  className?: string;
}

export const OptimizedGallery: React.FC<OptimizedGalleryProps> = ({
  images,
  columns = 3,
  gap = 'gap-4',
  className = ''
}) => {
  const gridClass = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} ${gap} ${className}`;

  return (
    <div className={gridClass}>
      {images.map((image, index) => (
        <div key={index} className="relative overflow-hidden rounded-lg">
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            width={image.width || 400}
            height={image.height || 300}
            quality="medium"
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
};

// Utilidad para predecir el tamaño óptimo de imagen
export function getOptimalSize(
  containerWidth: number,
  containerHeight: number,
  imageAspectRatio: number
): { width: number; height: number } {
  const containerAspectRatio = containerWidth / containerHeight;
  
  if (imageAspectRatio > containerAspectRatio) {
    // La imagen es más ancha que el contenedor
    return {
      width: containerWidth,
      height: Math.round(containerWidth / imageAspectRatio)
    };
  } else {
    // La imagen es más alta que el contenedor
    return {
      width: Math.round(containerHeight * imageAspectRatio),
      height: containerHeight
    };
  }
}

// Hook para responsive images
export function useResponsiveImage(
  src: string,
  breakpoints: { [key: string]: number }
) {
  const [currentSize, setCurrentSize] = useState<string>('medium');
  const [windowWidth, setWindowWidth] = useState(0);

  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    const sortedBreakpoints = Object.entries(breakpoints)
      .sort(([, a], [, b]) => a - b);

    for (const [size, width] of sortedBreakpoints) {
      if (windowWidth <= width) {
        setCurrentSize(size);
        break;
      }
    }
  }, [windowWidth, breakpoints]);

  return {
    currentSize,
    optimizedSrc: optimizeImageUrl(src, {
      width: breakpoints[currentSize]
    })
  };
}

export default {
  OptimizedImage,
  useLazyImage,
  generateSrcSet,
  optimizeImageUrl,
  OptimizedGallery,
  getOptimalSize,
  useResponsiveImage,
  IMAGE_CONFIG
};