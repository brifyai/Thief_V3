# 📖 Guía de Configuración - AI Scraper

Esta guía te ayudará a configurar y ejecutar la aplicación completa de Web Scraping.

## 🚀 Inicio Rápido (5 minutos)

### 1. Instalación Automática

```bash
# Hacer el script ejecutable (solo la primera vez en macOS/Linux)
chmod +x setup.sh

# Ejecutar el script de instalación
./setup.sh
```

El script hará automáticamente:
- ✅ Verificar Node.js y npm
- ✅ Instalar dependencias del proyecto raíz
- ✅ Instalar dependencias del backend
- ✅ Instalar dependencias del frontend
- ✅ Crear archivos `.env` si no existen

### 2. Configurar Variables de Entorno

#### Backend (`backend/.env`)

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/scraper_db

# JWT
JWT_SECRET=tu_clave_secreta_aqui

# Redis
REDIS_URL=redis://localhost:6379

# APIs
GROQ_API_KEY=tu_api_key_aqui

# Servidor
BACKEND_PORT=3000
NODE_ENV=development
```

#### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_ENV=development
```

### 3. Configurar Base de Datos (Supabase)

Este proyecto usa Supabase como base de datos. No requiere migraciones locales.

1. Ve a https://supabase.com y crea un proyecto
2. Copia el archivo `supabase-schema.sql` y ejecútalo en el Editor SQL de Supabase
3. Obtén tus credenciales (SUPABASE_URL y SUPABASE_ANON_KEY)
4. Configura las variables de entorno en `.env`

### 4. Iniciar la Aplicación

```bash
# Inicia backend y frontend simultáneamente
npm run dev
```

Accede a:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3000/api

## 📋 Instalación Manual (Alternativa)

Si prefieres instalar manualmente:

```bash
# 1. Instalar dependencias raíz
npm install

# 2. Backend
cd backend
npm install
cp .env.example .env
# Edita backend/.env con tus valores
npx prisma migrate dev
cd ..

# 3. Frontend
cd frontend
npm install
cp .env.example .env.local
# Edita frontend/.env.local con tus valores
cd ..

# 4. Iniciar
npm run dev
```

## 🛠️ Comandos Útiles

### Desarrollo

```bash
# Ambas aplicaciones
npm run dev

# Solo backend
npm run dev:backend

# Solo frontend
npm run dev:frontend
```

### Build

```bash
# Compilar ambas
npm run build

# Solo backend
npm run build:backend

# Solo frontend
npm run build:frontend
```

### Producción

```bash
# Iniciar ambas en producción
npm start

# Solo backend
npm run start:backend

# Solo frontend
npm run start:frontend
```

### Base de Datos (Supabase)

La base de datos está gestionada por Supabase. Para hacer cambios:

1. Edita `supabase-schema.sql` con tus cambios
2. Ejecuta el SQL actualizado en Supabase Dashboard
3. No se usan migraciones locales

## 🔍 Troubleshooting

### Error: "Cannot find module 'concurrently'"

```bash
npm install
```

### Error: "EADDRINUSE: address already in use :::3000"

El puerto 3000 ya está en uso. Opciones:

```bash
# Cambiar puerto del backend en backend/.env
BACKEND_PORT=3001

# O matar el proceso que usa el puerto
lsof -ti:3000 | xargs kill -9
```

### Error: "DATABASE_URL is not set"

Asegúrate de que `backend/.env` existe y tiene `DATABASE_URL` configurado:

```bash
cd backend
cp .env.example .env
# Edita .env con tu URL de BD
cd ..
```

### Error: "NEXT_PUBLIC_API_URL is not set"

Asegúrate de que `frontend/.env.local` existe:

```bash
cd frontend
cp .env.example .env.local
cd ..
```

## 📁 Estructura de Carpetas

```
.
├── backend/                    # API REST (Node.js + Express)
│   ├── src/
│   │   ├── config/            # Configuración
│   │   ├── controllers/       # Controladores
│   │   ├── routes/            # Rutas
│   │   ├── services/          # Servicios
│   │   ├── middleware/        # Middleware
│   │   └── utils/             # Utilidades
│   ├── prisma/                # ORM y migraciones
│   ├── public/                # Archivos estáticos
│   ├── scripts/               # Scripts de utilidad
│   ├── index.js               # Punto de entrada
│   └── package.json
│
├── frontend/                   # App web (Next.js + React)
│   ├── app/                   # Rutas y layouts
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # Servicios API
│   │   ├── lib/               # Utilidades
│   │   ├── types/             # TypeScript types
│   │   └── middleware/        # Middleware
│   ├── public/                # Archivos estáticos
│   └── package.json
│
├── package.json               # Configuración monorepo
├── README.md                  # Documentación principal
├── SETUP_GUIDE.md            # Esta guía
├── setup.sh                   # Script de instalación
├── .env.example              # Variables de ejemplo
└── .gitignore                # Archivos ignorados por git
```

## 🔐 Seguridad

### Antes de Producción

- [ ] Cambiar `JWT_SECRET` a una clave fuerte
- [ ] Cambiar `DATABASE_URL` a una BD segura
- [ ] Configurar `CORS_ORIGIN` correctamente
- [ ] Usar HTTPS en producción
- [ ] Configurar variables de entorno en el servidor
- [ ] Revisar permisos de archivos
- [ ] Ejecutar `npm audit` para verificar vulnerabilidades

```bash
npm audit
npm audit fix
```

## 📚 Documentación Adicional

- **Backend**: Ver `backend/src/config/README.md`
- **Frontend**: Ver `frontend/README.md`
- **Prisma**: https://www.prisma.io/docs/
- **Next.js**: https://nextjs.org/docs

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs en la terminal
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que los puertos no estén en uso
4. Intenta limpiar `node_modules` y reinstalar:

```bash
rm -rf backend/node_modules frontend/node_modules node_modules
npm run install:all
```

## ✅ Checklist de Configuración

- [ ] Node.js >= 18.x instalado
- [ ] npm >= 9.x instalado
- [ ] Base de datos configurada
- [ ] `backend/.env` creado y configurado
- [ ] `frontend/.env.local` creado y configurado
- [ ] Migraciones de Prisma ejecutadas
- [ ] `npm run dev` funciona sin errores
- [ ] Frontend accesible en http://localhost:3000
- [ ] Backend accesible en http://localhost:3000/api

¡Listo! 🎉 Tu aplicación está configurada y lista para usar.