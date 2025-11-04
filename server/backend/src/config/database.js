const { PrismaClient } = require('@prisma/client');

// Singleton para evitar múltiples instancias de PrismaClient
let prisma;

// Modo demo - no usar base de datos real
if (process.env.DEMO_MODE === 'true') {
  console.log('🎭 Modo demo activado - usando mock de base de datos');
  
  // Crear un mock de PrismaClient para modo demo
  prisma = {
    $connect: async () => Promise.resolve(),
    $disconnect: async () => Promise.resolve(),
    $queryRaw: async () => Promise.resolve([{ result: 'mock' }]),
    user: {
      findMany: async () => Promise.resolve([]),
      findUnique: async () => Promise.resolve(null),
      create: async () => Promise.resolve({ id: 1, email: 'demo@example.com' }),
      update: async () => Promise.resolve({ id: 1, email: 'demo@example.com' }),
      delete: async () => Promise.resolve({ id: 1, email: 'demo@example.com' }),
    },
    scraping_results: {
      findMany: async () => Promise.resolve([]),
      findUnique: async () => Promise.resolve(null),
      create: async () => Promise.resolve({ id: 1, title: 'Demo Article' }),
      update: async () => Promise.resolve({ id: 1, title: 'Demo Article' }),
      delete: async () => Promise.resolve({ id: 1, title: 'Demo Article' }),
    },
    // Agregar más mocks según sea necesario
  };
} else {
  // Configuración normal de Prisma
  const prismaConfig = {
    // Connection pooling optimizado
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Logging condicional
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
    errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
    // Timeout y retry configuración
    transactionOptions: {
      timeout: 10000,
      maxWait: 5000,
    },
  };

  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient(prismaConfig);
  } else {
    // En desarrollo, usar variable global para hot-reload
    if (!global.prisma) {
      global.prisma = new PrismaClient(prismaConfig);
    }
    prisma = global.prisma;
  }

  // Manejo de desconexión graceful
  process.on('beforeExit', async () => {
    console.log('🔌 Cerrando conexiones de base de datos...');
    await prisma.$disconnect();
  });

  // Manejo de errores de conexión
  prisma.$connect()
    .then(() => {
      console.log('✅ Conexión a base de datos establecida');
    })
    .catch((error) => {
      console.error('❌ Error conectando a base de datos:', error);
      if (process.env.NODE_ENV !== 'development') {
        process.exit(1);
      } else {
        console.warn('⚠️ Continuando en desarrollo sin base de datos');
      }
    });
}

module.exports = prisma;
