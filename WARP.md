# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Comandos Comunes de Desarrollo

### Instalación y Configuración Inicial
```bash
# Instalar todas las dependencias
npm install
```

### Desarrollo
```bash
# Iniciar servidor unificado (Express + Next.js)
npm run dev

# Verificar tipos de TypeScript
npm run type-check

# Ejecutar linter
npm run lint

# Compilar para producción
npm run build

# Iniciar en modo producción
npm start
```

### Base de Datos (Supabase)
```bash
# El schema está definido en supabase-schema.sql
# Para aplicar cambios, ejecutar el SQL directamente en el editor SQL de Supabase Dashboard
# Dashboard: https://supabase.com/dashboard/project/[tu-project-id]

# Las migraciones se gestionan manualmente a través de Supabase
# No se usa Prisma en este proyecto
```

## Arquitectura del Proyecto

### Estructura General
Este es un proyecto **monorepo unificado** que combina:
- **Backend**: Express.js API REST (en `server/backend/`)
- **Frontend**: Next.js 16 con React 19 (en raíz del proyecto)
- **Servidor Unificado**: `server.js` que maneja ambos

### Arquitectura del Backend

**Ubicación**: `server/backend/src/`

#### Capas de la Aplicación
1. **Routes** (`routes/`): Define endpoints de la API
2. **Controllers** (`controllers/`): Maneja lógica de solicitudes HTTP
3. **Services** (`services/`): Contiene lógica de negocio
4. **Middleware** (`middleware/`): Autenticación, manejo de errores, rate limiting
5. **Utils** (`utils/`): Funciones auxiliares reutilizables

#### Servicios Clave
- **`scraping.service.js`**: Scraping de páginas web (Cheerio/Puppeteer)
- **`ai.service.js`**: Integración con Chutes AI (antes Groq)
- **`entityAnalyzer.service.js`**: Análisis de entidades y sentimiento en noticias
- **`autoScraper.service.js`**: Scraping automático programado
- **`duplicateDetector.service.js`**: Detección de contenido duplicado
- **`tokenTracker.service.js`**: Monitoreo de uso de tokens de IA
- **`queueService.js`**: Cola de trabajos con BullMQ/Redis

#### Base de Datos
- **Base de Datos**: Supabase (PostgreSQL)
- **Schema**: `supabase-schema.sql` (ejecutar en Supabase Dashboard)
- **Tablas principales**:
  - `users`: Usuarios del sistema
  - `scraping_results`: Resultados de scraping con contenido
  - `public_urls`: URLs globales para scraping
  - `saved_articles`: Artículos guardados por usuarios
  - `entities`: Entidades monitoreadas (personas, empresas, temas)
  - `entity_mentions`: Menciones de entidades en noticias
  - `entity_snapshots`: Métricas diarias de entidades
  - `site_configurations`: Configuraciones de selectores por dominio
  - `ai_usage_logs`: Registro de uso de tokens de IA

### Arquitectura del Frontend

**Ubicación raíz y `src/`**

#### Estructura de Next.js
- **App Router**: `app/` (Next.js 13+)
  - `app/dashboard/`: Dashboard principal (admin y usuario)
  - `app/login/`: Autenticación
  - `app/test-simple/`: Pruebas de URLs
  - `app/test-ai-tokens/`: Monitoreo de tokens de IA

#### Componentes Organizados
- **`src/components/ui/`**: Componentes Radix UI (Button, Input, Table, etc.)
- **`src/components/layout/`**: Header, Sidebar
- **`src/components/admin/`**: Componentes del panel de administración
- **`src/components/entities/`**: Gestión de entidades monitoreadas
- **`src/components/highlights/`**: Highlights/noticias destacadas
- **`src/components/common/`**: ErrorBoundary, LoadingStates, SkeletonLoader

#### Gestión de Estado y Datos
- **React Query** (`@tanstack/react-query`): Cache y sincronización de datos del servidor
- **Zustand** (`src/stores/`): Estado global del cliente
- **Custom Hooks** (`src/hooks/`): Lógica reutilizable (useEntities, useDebounce, etc.)

#### Servicios de API
**Ubicación**: `src/services/`
- Todos los servicios usan axios para comunicarse con el backend
- Configuración centralizada en `src/lib/api.ts`
- Servicios principales: `auth.service.ts`, `scraping.service.ts`, `entity.service.ts`, `metrics.service.ts`

### Flujo de Datos

```
Usuario → Frontend (Next.js)
         ↓
    API Request (axios)
         ↓
    Backend Express API
         ↓
    Controller → Service → Supabase Client
         ↓
    Supabase (PostgreSQL)
```

### Servidor Unificado (`server.js`)

El archivo `server.js` en la raíz:
1. Inicia aplicación Next.js
2. Crea servidor Express para API
3. Enruta `/api/*` al backend Express
4. Enruta todo lo demás a Next.js
5. Configura cron jobs para scraping automático
6. Inicializa Token Tracker y Worker de BullMQ

**Nota**: El proyecto NO usa Prisma. La base de datos es gestionada directamente con Supabase.

### Características Principales del Sistema

#### 1. Web Scraping Inteligente
- Scraping con selectores personalizados por dominio
- Detección automática de estructuras de páginas
- Soporte para páginas dinámicas (Puppeteer) y estáticas (Cheerio)
- Sistema de configuración de sitios (`SiteConfiguration`)
- Límites configurables de noticias por URL

#### 2. Análisis con IA (Chutes AI)
- Extracción de títulos cuando no están disponibles
- Categorización automática de contenido
- Análisis de sentimiento en menciones de entidades
- Generación de resúmenes
- Tracking de tokens consumidos

#### 3. Sistema de Entidades
- Monitoreo de personas, empresas, temas y eventos
- Detección automática de menciones en noticias
- Análisis de sentimiento contextual
- Snapshots diarios con métricas agregadas
- Alertas configurables por entidad

#### 4. Detección de Duplicados
- Hash SHA-256 de contenido para identificar duplicados
- Prevención de almacenamiento redundante

#### 5. Scraping Automático
- Configuración por cron expressions
- Múltiples horarios programables
- Scraping de URLs públicas configuradas por admin
- Limpieza automática de noticias antiguas

## Convenciones de Código

### Backend (JavaScript/Node.js)
- Usar `require()` para imports (CommonJS)
- Nombres de archivos en camelCase (ej: `scraping.service.js`)
- Async/await para operaciones asíncronas
- Try-catch para manejo de errores
- JSDoc para documentación de funciones complejas

### Frontend (TypeScript/React)
- Usar imports ES6
- Componentes funcionales con hooks
- Nombres de archivos en PascalCase para componentes (ej: `EntityCard.tsx`)
- Props tipadas con TypeScript interfaces
- Usar `@/` como alias para `src/` directory

### Base de Datos (Supabase)
- Nombres de tablas en snake_case (ej: `scraping_results`)
- Schema definido en `supabase-schema.sql`
- Cambios de schema se aplican ejecutando SQL en Supabase Dashboard
- Incluir índices para campos frecuentemente consultados
- Usar conexión directa a PostgreSQL vía Supabase Client

## Variables de Entorno Requeridas

### Backend (.env en raíz o server/backend/.env)
```
# Base de datos Supabase (requerido)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=tu_supabase_anon_key

# Autenticación (requerido)
JWT_SECRET=clave_secreta_minimo_32_caracteres
JWT_EXPIRATION=24h

# IA (requerido)
CHUTES_API_KEY=tu_api_key_de_chutes_ai
AI_MODEL=gpt-4-turbo
AI_REASONING_EFFORT=medium

# CORS (requerido en producción)
ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com

# Redis (opcional, para BullMQ)
REDIS_URL=redis://localhost:6379
ENABLE_WORKER=true

# Scraping automático
SCRAPING_ENABLED=true
SCRAPING_SCHEDULES=0 2 * * *,0 14 * * *
SCRAPING_TIMEZONE=America/Santiago

# Limpieza automática
CLEANUP_ENABLED=true
CLEANUP_RETENTION_DAYS=30
CLEANUP_SCHEDULE=0 3 * * 0
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Patrones Importantes

### Autenticación
- JWT almacenado en localStorage
- Middleware `auth.js` valida tokens en backend
- `AuthGuard` en frontend protege rutas

### Manejo de Errores
- Backend: Middleware `errorHandler.js` centraliza respuestas de error
- Frontend: `ErrorBoundary` captura errores de React

### Rate Limiting
- Global: 500 req/15min
- Scraping: 20 req/15min
- Search con IA: 10 req/15min
- Configurado en `rateLimiter.middleware.js`

### Validación de Datos
- Backend: Validaciones en controllers y services
- Frontend: Validación en formularios antes de enviar

## Solución de Problemas Comunes

### Error: "JWT_SECRET not configured"
El sistema valida JWT_SECRET al iniciar. Debe tener mínimo 32 caracteres.

### Error: "CHUTES_API_KEY not configured"
Requerido para funcionalidades de IA. Obtener en https://api.chutes.ai

### Puerto 3000 en uso
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Problemas con Base de Datos
- Verificar que DATABASE_URL apunta a Supabase correctamente
- Verificar credenciales en Supabase Dashboard
- Para aplicar cambios de schema, ejecutar SQL en Supabase Dashboard
- El archivo `supabase-schema.sql` contiene el schema completo

### Base de datos en modo demo
Si DATABASE_URL no está configurado en desarrollo, el sistema arranca en modo demo sin BD.

## Testing

El proyecto actualmente no tiene suite de tests configurada. Para agregar tests:
- Backend: Considerar Jest o Mocha
- Frontend: Considerar Jest + React Testing Library
- E2E: Considerar Playwright o Cypress

## Deployment

### Vercel (Recomendado para Frontend)
- Configurado en `vercel.json`
- Variables de entorno deben configurarse en dashboard de Vercel
- Worker de BullMQ se deshabilita automáticamente en Vercel

### Backend Independiente
- Puede desplegarse en Railway, Render, o servidor propio
- Usa Supabase como base de datos (PostgreSQL gestionado)
- Requiere opcionalmente Redis para BullMQ
- Configurar variables de entorno de producción (DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY)
- Usar `npm start` para producción

## Seguridad

- JWT con expiración configurable
- Helmet.js para headers de seguridad
- CORS estricto en producción (solo HTTPS)
- Rate limiting por endpoint
- Validación de inputs
- Sanitización de contenido HTML con DOMPurify
- Bcrypt para hasheo de contraseñas

## Notas Adicionales

- **Base de Datos**: Supabase (PostgreSQL). NO se usa Prisma en este proyecto
- El schema completo está en `supabase-schema.sql`
- El sistema usa Chutes AI (anteriormente Groq) para funcionalidades de IA
- Todos los tokens de IA se trackean en la tabla `ai_usage_logs`
- El scraping puede ser manual o automático (cron)
- Las configuraciones de sitio se aprenden y reutilizan
- El sistema detecta y previene duplicados por hash de contenido
- Para cambios en la base de datos, ejecutar SQL directamente en Supabase Dashboard
