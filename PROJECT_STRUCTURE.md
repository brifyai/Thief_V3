# 📂 Estructura del Proyecto - AI Scraper Monorepo

## Vista General

```
Scraperv3/
├── 📄 package.json              # Configuración raíz (monorepo)
├── 📄 README.md                 # Documentación principal
├── 📄 SETUP_GUIDE.md           # Guía de configuración
├── 📄 PROJECT_STRUCTURE.md     # Este archivo
├── 📄 .env.example             # Variables de entorno de ejemplo
├── 📄 .gitignore               # Archivos ignorados por git
├── 🔧 setup.sh                 # Script de instalación automática
│
├── 📁 backend/                 # API REST (Node.js + Express)
│   ├── 📄 index.js             # Punto de entrada
│   ├── 📄 package.json         # Dependencias del backend
│   ├── 📄 .env.example         # Variables de ejemplo
│   ├── 📄 .gitignore
│   ├── 📄 vercel.json          # Configuración Vercel
│   │
│   ├── 📁 src/
│   │   ├── 📁 config/          # Configuración
│   │   │   ├── database.js     # Conexión a BD
│   │   │   ├── env.js          # Variables de entorno
│   │   │   ├── swagger.js      # Documentación API
│   │   │   └── site-configs.json
│   │   │
│   │   ├── 📁 controllers/     # Controladores (lógica de rutas)
│   │   │   ├── auth.controller.js
│   │   │   ├── scraping.controller.js
│   │   │   ├── search.controller.js
│   │   │   ├── entity.controller.js
│   │   │   ├── metrics.controller.js
│   │   │   └── ... (más controladores)
│   │   │
│   │   ├── 📁 routes/          # Definición de rutas
│   │   │   ├── auth.routes.js
│   │   │   ├── scraping.routes.js
│   │   │   ├── search.routes.js
│   │   │   ├── entity.routes.js
│   │   │   └── ... (más rutas)
│   │   │
│   │   ├── 📁 services/        # Lógica de negocio
│   │   │   ├── auth.service.js
│   │   │   ├── scraping.service.js
│   │   │   ├── aiSearch.service.js
│   │   │   ├── entityAnalyzer.service.js
│   │   │   ├── duplicateDetector.service.js
│   │   │   └── ... (más servicios)
│   │   │
│   │   ├── 📁 middleware/      # Middleware Express
│   │   │   ├── auth.js         # Autenticación
│   │   │   ├── errorHandler.js # Manejo de errores
│   │   │   ├── rateLimiter.middleware.js
│   │   │   └── cacheInvalidation.js
│   │   │
│   │   └── 📁 utils/           # Utilidades
│   │       ├── logger.js
│   │       ├── jwtHelper.js
│   │       ├── cacheService.js
│   │       ├── contentCleaner.js
│   │       ├── aiWrapper.js
│   │       └── ... (más utilidades)
│   │
│   │
│   ├── 📁 public/              # Archivos estáticos
│   │   ├── 📁 css/
│   │   │   ├── global.css
│   │   │   ├── design-system.css
│   │   │   └── article-reader.css
│   │   ├── 📁 js/
│   │   │   ├── auth.js
│   │   │   ├── admin-dashboard.js
│   │   │   └── ... (más scripts)
│   │   └── 📁 html/
│   │       ├── login.html
│   │       ├── scraper.html
│   │       ├── admin-dashboard.html
│   │       └── ... (más páginas)
│   │
│   ├── 📁 scripts/             # Scripts de utilidad
│   │   ├── create-admin.js     # Crear usuario admin
│   │   ├── create-user.js      # Crear usuario
│   │   ├── cleanup-old-news.js # Limpiar noticias antiguas
│   │   └── calculate-snapshots.js
│   │
│   └── 📁 node_modules/        # Dependencias instaladas
│
├── 📁 frontend/                # Aplicación web (Next.js + React)
│   ├── 📄 package.json         # Dependencias del frontend
│   ├── 📄 .env.example         # Variables de ejemplo
│   ├── 📄 .gitignore
│   ├── 📄 tsconfig.json        # Configuración TypeScript
│   ├── 📄 next.config.ts       # Configuración Next.js
│   ├── 📄 postcss.config.mjs   # Configuración PostCSS
│   ├── 📄 components.json      # Configuración de componentes
│   ├── 📄 eslint.config.mjs    # Configuración ESLint
│   ├── 📄 README.md
│   │
│   ├── 📁 app/                 # App Router (Next.js 13+)
│   │   ├── layout.tsx          # Layout raíz
│   │   ├── page.tsx            # Página principal
│   │   ├── globals.css         # Estilos globales
│   │   ├── favicon.ico
│   │   ├── 📁 login/           # Página de login
│   │   │   └── page.tsx
│   │   ├── 📁 test-simple/     # Página de prueba
│   │   │   └── page.tsx
│   │   └── 📁 test-ai-tokens/  # Página de prueba AI
│   │       └── page.tsx
│   │
│   ├── 📁 src/
│   │   ├── 📁 components/      # Componentes React
│   │   │   ├── 📁 layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── 📁 admin/
│   │   │   │   ├── AdminHeader.tsx
│   │   │   │   ├── AdminTable.tsx
│   │   │   │   ├── Charts.tsx
│   │   │   │   └── MetricCard.tsx
│   │   │   ├── 📁 entities/
│   │   │   │   ├── EntityCard.tsx
│   │   │   │   ├── EntityForm.tsx
│   │   │   │   ├── EntityStats.tsx
│   │   │   │   └── MentionsList.tsx
│   │   │   ├── 📁 highlights/
│   │   │   │   ├── HighlightCard.tsx
│   │   │   │   └── HighlightsSection.tsx
│   │   │   ├── 📁 stats/
│   │   │   │   ├── QuickStats.tsx
│   │   │   │   └── StatCard.tsx
│   │   │   ├── 📁 ui/          # Componentes UI (Radix UI)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   └── ... (más componentes)
│   │   │   ├── 📁 common/
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── LoadingStates.tsx
│   │   │   │   └── SkeletonLoader.tsx
│   │   │   └── 📁 theme/
│   │   │       ├── ThemeProvider.tsx
│   │   │       └── ThemeToggle.tsx
│   │   │
│   │   ├── 📁 hooks/           # Custom React Hooks
│   │   │   ├── useDebounce.ts
│   │   │   ├── useEntities.ts
│   │   │   ├── useHighlights.ts
│   │   │   ├── useScrapingStats.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   └── ... (más hooks)
│   │   │
│   │   ├── 📁 services/        # Servicios API
│   │   │   ├── api.ts          # Cliente HTTP
│   │   │   ├── auth.service.ts
│   │   │   ├── scraping.service.ts
│   │   │   ├── entity.service.ts
│   │   │   ├── search.service.ts
│   │   │   ├── metrics.service.ts
│   │   │   └── ... (más servicios)
│   │   │
│   │   ├── 📁 lib/             # Utilidades
│   │   │   ├── api.ts          # Configuración API
│   │   │   ├── config.ts       # Configuración general
│   │   │   ├── error-handler.ts
│   │   │   ├── react-query.tsx # Configuración React Query
│   │   │   └── utils.ts
│   │   │
│   │   ├── 📁 types/           # Tipos TypeScript
│   │   │   ├── entities.ts
│   │   │   ├── highlights.ts
│   │   │   └── stats.ts
│   │   │
│   │   ├── 📁 middleware/      # Middleware
│   │   │   └── auth-guard.tsx
│   │   │
│   │   └── 📁 utils/           # Funciones auxiliares
│   │       └── formatDate.ts
│   │
│   ├── 📁 public/              # Archivos estáticos
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── ... (más assets)
│   │
│   └── 📁 node_modules/        # Dependencias instaladas
│
└── 📁 node_modules/            # Dependencias raíz (concurrently)
```

## 📊 Descripción de Carpetas Principales

### Backend (`/backend`)

**Propósito**: API REST que maneja toda la lógica de scraping, análisis de datos y autenticación.

**Tecnologías**:
- Node.js + Express
- Supabase (PostgreSQL)
- Redis (caché)
- Chutes AI (IA)

**Responsabilidades**:
- Scraping de sitios web
- Análisis de entidades
- Búsqueda con IA
- Gestión de usuarios
- Almacenamiento de datos

### Frontend (`/frontend`)

**Propósito**: Interfaz web moderna para interactuar con la API.

**Tecnologías**:
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Radix UI
- React Query
- Zustand (estado)

**Responsabilidades**:
- Interfaz de usuario
- Autenticación
- Visualización de datos
- Gestión de búsquedas
- Dashboard de administración

## 🔄 Flujo de Datos

```
Usuario
   ↓
Frontend (Next.js)
   ↓
API REST (Express)
   ↓
Servicios (Lógica)
   ↓
Base de Datos (Prisma)
   ↓
PostgreSQL
```

## 📦 Dependencias Principales

### Backend
- `express`: Framework web
- `@supabase/supabase-js`: Cliente de Supabase
- `axios`: Cliente HTTP
- `jsonwebtoken`: Autenticación
- `bullmq`: Cola de trabajos
- `cheerio`: Parsing HTML
- `puppeteer`: Navegador automatizado
- `groq-sdk`: API de IA

### Frontend
- `next`: Framework React
- `react`: Librería UI
- `@tanstack/react-query`: Gestión de datos
- `tailwindcss`: Estilos
- `@radix-ui/*`: Componentes accesibles
- `zustand`: Gestión de estado
- `recharts`: Gráficos

## 🚀 Scripts Disponibles

Ver `README.md` para la lista completa de scripts.

## 📝 Notas

- Ambas aplicaciones pueden ejecutarse simultáneamente con `npm run dev`
- El backend debe estar ejecutándose para que el frontend funcione
- El schema de BD se encuentra en `supabase-schema.sql`
- Los componentes UI reutilizables están en `frontend/src/components/ui/`

## 🔗 Relaciones entre Carpetas

```
frontend/src/services/ ←→ backend/src/routes/
frontend/src/hooks/    ←→ backend/src/controllers/
frontend/src/types/    ←→ backend/src/services/
```

---

Para más información, consulta:
- [`README.md`](README.md) - Documentación general
- [`SETUP_GUIDE.md`](SETUP_GUIDE.md) - Guía de configuración
- `backend/src/config/README.md` - Documentación del backend
- `frontend/README.md` - Documentación del frontend