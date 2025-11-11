/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = withBundleAnalyzer({
  // Configuración optimizada para estabilidad y rendimiento
  experimental: {
    // Deshabilitar features experimentales que causan inestabilidad
    optimizeCss: false,
    scrollRestoration: false,
    // Optimizaciones de compilación
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    webpackBuildWorker: true,
  },
  
  // Paquetes externos del servidor
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Optimización avanzada de webpack
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Configuración de split chunks optimizada
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-query)[\\/]/,
            name: 'react',
            priority: 20,
            chunks: 'all',
          },
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|@tanstack)[\\/]/,
            name: 'ui',
            priority: 15,
            chunks: 'all',
          },
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3|chart\.js)[\\/]/,
            name: 'charts',
            priority: 10,
            chunks: 'all',
          },
          utils: {
            test: /[\\/]node_modules[\\/](date-fns|clsx|class-variance-authority)[\\/]/,
            name: 'utils',
            priority: 5,
            chunks: 'all',
          },
        },
      };
      
      // Optimización de módulos
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname),
      };
      
      // Tree shaking para producción
      if (!dev) {
        config.optimization.usedExports = true;
        config.optimization.sideEffects = false;
      }
    }
    
    return config;
  },
  
  // Headers de seguridad y rendimiento
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Configuración de on-demand entries optimizada
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 1 minuto
    pagesBufferLength: 5,
  },
  
  // Optimización de imágenes avanzada
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  
  // Configuración de output para producción
  output: 'standalone',
  
  // Configuración de trailing slash
  trailingSlash: false,
  
  // Configuración de distDir
  distDir: '.next',
  
  // Optimización de compilación
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn', 'info']
    } : false,
  },
  
  // Configuración de compresión
  compress: true,
  
  // Configuración de power by headers
  poweredByHeader: false,
  
  // Indicadores de desarrollo optimizados
  devIndicators: {
    buildActivity: false,
  },
  
  // Source maps en producción
  productionBrowserSourceMaps: false,
});

module.exports = nextConfig;