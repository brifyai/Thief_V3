# AI Scraper - Proyecto Unificado

🎉 **¡Proyecto unificado con éxito!** Backend y frontend ahora funcionan en un solo servidor.

## 📁 Estructura del Proyecto

```
├── app/                    # Páginas de Next.js (App Router)
├── components/             # Componentes de React
├── src/                    # Código fuente del frontend
│   ├── components/         # Componentes reutilizables
│   ├── hooks/              # Hooks personalizados
│   ├── lib/                # Utilidades y configuración
│   ├── services/           # Servicios de API
│   └── types/              # Definiciones de TypeScript
├── server/                 # Backend unificado
│   └── backend/            # Código del backend Express
│       ├── prisma/         # Schema y migraciones
│       ├── src/
│       │   ├── config/     # Configuración
│       │   ├── controllers/# Controladores
│       │   ├── middleware/ # Middleware
│       │   ├── routes/     # Rutas de API
│       │   ├── services/   # Servicios del backend
│       │   └── utils/      # Utilidades
│       └── index.js        # Servidor Express original
├── public/                 # Archivos estáticos
├── server.js               # 🚀 Servidor unificado (Next.js + Express)
├── package.json            # Dependencias unificadas
├── next.config.ts          # Configuración de Next.js
├── tsconfig.json           # Configuración de TypeScript
├── .env                    # Variables de entorno del backend
└── .env.local              # Variables de entorno del frontend
```

## 🚀 Iniciar la Aplicación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar base de datos
```bash
# Generar cliente de Prisma
npm run db:generate

# Ejecutar migraciones (si es necesario)
npm run db:migrate

# Ver base de datos (opcional)
npm run db:studio
```

### 3. Iniciar servidor unificado
```bash
npm run dev
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api/*
- **Documentación API**: http://localhost:3000/api-docs

## 📝 Variables de Entorno

### Backend (.env)
```env
# API Keys
CHUTES_API_KEY=your_chutes_api_key
AI_MODEL=openai/gpt-oss-20b

# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/scraper_db

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRATION=24h

# Servidor
PORT=3000
NODE_ENV=development

# Redis (opcional)
REDIS_URL=redis://localhost:6379
ENABLE_WORKER=true

# Scraping
SCRAPING_ENABLED=true
SCRAPING_SCHEDULES=0 2 * * *
SCRAPING_TIMEZONE=America/Santiago
```

### Frontend (.env.local)
```env
# URL de la API (apunta al mismo servidor unificado)
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_ENV=development
```

## 🔧 Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar servidor unificado
npm run build            # Build para producción
npm run start            # Iniciar servidor de producción

# Base de datos
npm run db:generate      # Generar cliente Prisma
npm run db:migrate       # Ejecutar migraciones
npm run db:studio        # Abrir Prisma Studio

# Calidad de código
npm run lint             # Linting de código
npm run type-check       # Verificación de tipos
```

## 🌟 Ventajas de la Unificación

1. **✅ Sin errores de CORS**: Frontend y backend en el mismo origen
2. **🚀 Un solo servidor**: Menos complejidad en el despliegue
3. **📦 Menos dependencias**: Solo un package.json
4. **🔄 Desarrollo más rápido**: Un solo comando para iniciar todo
5. **🎯 Configuración simplificada**: Menos archivos de configuración

## 📡 Endpoints de la API

Todos los endpoints del backend están disponibles bajo `/api/*`:

- **Autenticación**: `/api/auth/*`
- **Scraping**: `/api/scraping/*`, `/scrape`, `/scrape-single`
- **URLs**: `/api/urls/*`
- **Estadísticas**: `/api/stats/*`
- **Búsqueda**: `/api/search/*`
- **Entidades**: `/api/entities/*`
- **Colas**: `/api/queue/*`
- **Y más...**

## 🐛 Solución de Problemas

### Error: "No se encuentra el módulo 'next'"
```bash
npm install
```

### Error: "Database connection failed"
1. Verifica que PostgreSQL esté corriendo
2. Configura correctamente `DATABASE_URL` en `.env`
3. Ejecuta `npm run db:migrate`

### Error: "JWT_SECRET no configurado"
1. Genera un JWT secret seguro:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Agrégalo a tu archivo `.env`

## 🚀 Despliegue en Producción

### Vercel (Recomendado)
```bash
npm run build
vercel --prod
```

### Railway/Render
1. Conecta tu repositorio
2. Configura las variables de entorno
3. Despliega automáticamente

### Docker (Opcional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📚 Documentación Adicional

- [Documentación de la API](http://localhost:3000/api-docs)
- [Guía de Desarrollo](./DEVELOPMENT.md)
- [Guía de Despliegue](./DEPLOYMENT.md)

---

🎯 **¡Listo para usar!** El proyecto ahora está completamente unificado y listo para desarrollo y producción.