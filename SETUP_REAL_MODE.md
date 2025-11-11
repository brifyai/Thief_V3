# 🚀 Configuración para Modo Real (100% Funcional)

## 📋 Requisitos Previos

### 1. **Base de Datos Supabase**
- Cuenta en [Supabase](https://supabase.com)
- Nuevo proyecto creado

### 2. **Redis Server**
- Redis instalado localmente o servicio Redis en la nube
- [Descargar Redis](https://redis.io/download) para Windows/Mac/Linux

### 3. **Node.js y npm**
- Node.js v16 o superior
- npm v8 o superior

---

## 🔧 Paso 1: Configurar Supabase

### 1.1 Crear Proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Crea un nuevo proyecto
4. Anota las credenciales:

```
Project URL: https://[project-id].supabase.co
Anon Key: [anon-key]
Service Role Key: [service-role-key]
```

### 1.2 Ejecutar Esquema de Base de Datos
1. En tu proyecto Supabase, ve a **SQL Editor**
2. Copia y pega el contenido del archivo `supabase-news-schema.sql`
3. Ejecuta el script SQL

### 1.3 Configurar Row Level Security (RLS)
```sql
-- Habilitar RLS para tablas de noticias
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_humanizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_exports ENABLE ROW LEVEL SECURITY;
```

---

## 🔧 Paso 2: Configurar Variables de Entorno

### 2.1 Actualizar archivo `.env`
Reemplaza los valores marcados con `your_..._here`:

```env
# Modo real activado
DEMO_MODE=false

# Supabase - Configuración real
SUPABASE_URL=https://your_project_id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Redis - Configuración real
REDIS_URL=redis://localhost:6379

# Chutes AI (ya configurado)
CHUTES_API_KEY=cpk_178f36e444794015a6c6765c24569340.73d645ff58545311aa226d6de7ec2a15.W0WaeOgYQRVOVskEVTtzWUstJEUcl2Ls

# Puerto del backend
PORT=3005
BACKEND_PORT=3005

# JWT (mantener el existente)
JWT_SECRET=0747ad562eb065511a9d3e0a3426f0fa09369a1b80fc04881f42ee139f9dc57f
JWT_EXPIRE=7d

# Configuración de CORS
CORS_ORIGIN=http://localhost:3005

# Modo de ejecución
NODE_ENV=development
LOG_LEVEL=info

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3005
NEXT_PUBLIC_ENV=development
```

---

## 🔧 Paso 3: Configurar Redis

### 3.1 Instalar Redis Localmente

#### Windows:
1. Descarga Redis para Windows desde [GitHub](https://github.com/microsoftarchive/redis/releases)
2. Extrae el archivo ZIP
3. Ejecuta `redis-server.exe`

#### Mac:
```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

### 3.2 Verificar Redis
```bash
redis-cli ping
# Debe responder: PONG
```

---

## 🔧 Paso 4: Instalar Dependencias y Ejecutar

### 4.1 Instalar dependencias del backend
```bash
cd server/backend
npm install
```

### 4.2 Instalar dependencias del frontend
```bash
cd ../../
npm install
```

### 4.3 Ejecutar la aplicación
```bash
npm run dev
```

---

## 🔧 Paso 5: Verificar Configuración

### 5.1 Health Check
Abre en tu navegador:
```
http://localhost:3005/health
```

Deberías ver una respuesta como:
```json
{
  "uptime": 1234.567,
  "timestamp": 1234567890123,
  "status": "ok",
  "services": {
    "database": "ok"
  },
  "demoMode": false
}
```

### 5.2 Probar Endpoints de Noticias
```bash
# Obtener estadísticas
curl http://localhost:3005/api/news/stats

# Obtener noticias (con autenticación demo)
curl -H "Authorization: Bearer demo-token" http://localhost:3005/api/news
```

---

## 🔧 Paso 6: Configurar Fuentes de Scraping

### 6.1 Agregar Fuentes de Noticias
Usa el endpoint para agregar fuentes:

```bash
curl -X POST http://localhost:3005/api/news/scrape/sources \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "El Mercurio",
    "url": "https://www.emol.com",
    "type": "scraping",
    "config": {
      "newsSelector": "article h2 a",
      "titleSelector": "h1",
      "contentSelector": ".article-content",
      "authorSelector": ".author-name",
      "dateSelector": ".date"
    },
    "scraping_interval": 3600
  }'
```

### 6.2 Fuentes Chilenas Preconfiguradas
- El Mercurio
- La Tercera
- La Cuarta
- Biobío Chile
- DF (Diario Financiero)
- CNN Chile
- 24 Horas
- Publimetro

---

## 🔧 Paso 7: Probar Funcionalidades

### 7.1 Acceder a la Aplicación
```
http://localhost:3000/news
```

### 7.2 Funcionalidades para Probar:
1. **Ver noticias** - Listado inicial
2. **Seleccionar noticias** - Checkboxes y botones
3. **Buscar noticias** - Barra de búsqueda
4. **Filtrar** - Por categoría, fuente, fecha
5. **Humanizar** - Botón de humanización con IA
6. **Exportar** - Diferentes formatos
7. **Scraping** - Agregar nuevas fuentes

---

## 🔧 Paso 8: Monitoreo y Logs

### 8.1 Ver Logs del Servidor
Los logs aparecerán en la terminal donde ejecutaste `npm run dev`

### 8.2 Monitorear Redis
```bash
redis-cli monitor
```

### 8.3 Verificar Base de Datos
En el dashboard de Supabase, ve a:
- **Table Editor** → Ver tablas de noticias
- **Logs** → Ver actividad de la API

---

## 🚨 Solución de Problemas Comunes

### Problema: "Database connection failed"
**Solución:**
- Verifica que las credenciales de Supabase sean correctas
- Asegúrate que el proyecto Supabase esté activo
- Revisa las políticas RLS

### Problema: "Redis connection failed"
**Solución:**
- Verifica que Redis esté corriendo: `redis-cli ping`
- Revisa la URL de Redis en `.env`
- Asegúrate de que el puerto 6379 esté disponible

### Problema: "Chutes AI API error"
**Solución:**
- La API key ya está configurada
- Verifica conexión a internet
- Revisa límites de uso de la API

### Problema: "Scraping no funciona"
**Solución:**
- Verifica los selectores CSS para cada fuente
- Revisa políticas CORS de los sitios web
- Asegúrate de que las URLs sean accesibles

---

## 📊 Arquitectura en Modo Real

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   Supabase      │
│   (Next.js)      │◄──►│   (Express)      │◄──►│   (PostgreSQL)   │
│                 │    │                 │    │                 │
│ - UI Components │    │ - API Routes     │    │ - News Tables   │
│ - Hooks         │    │ - Services      │    │ - User Data     │
│ - State Mgmt    │    │ - Auth           │    │ - Exports       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Redis        │
                       │   (Cache/Queue)  │
                       │                 │
                       │ - User Sessions │
                       │ - Selections    │
                       │ - Cache         │
                       └─────────────────┘
```

---

## ✅ Checklist Final

- [ ] Cuenta Supabase creada
- [ ] Esquema SQL ejecutado
- [ ] Variables de entorno configuradas
- [ ] Redis instalado y corriendo
- [ ] Dependencias instaladas
- [ ] Aplicación ejecutándose
- [ ] Health check funcionando
- [ ] Noticias visibles en frontend
- [ ] Selección persistente funcionando
- [ ] Humanización con IA funcionando
- [ ] Scraping de noticias funcionando

¡Listo! Tu sistema ahora funciona 100% real y no en modo demo. 🎉