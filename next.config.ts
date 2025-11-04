import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración de variables de entorno
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },

  // Optimizaciones
  swcMinify: true,
  
  // Configuración de imágenes
  images: {
    domains: ['localhost'],
  },

  // Configuración experimental para desarrollo
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;