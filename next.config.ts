import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimizaciones
  swcMinify: true,
  output: 'standalone',
  
  // Configuración de imágenes
  images: {
    domains: ['localhost'],
  },

  // Configuración experimental para desarrollo
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
};

export default nextConfig;