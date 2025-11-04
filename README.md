# AI Scraper - Monorepo

Aplicación completa de Web Scraping con Backend (Node.js/Express) y Frontend (Next.js/React).

## 📁 Estructura del Proyecto

```
.
├── backend/                 # API REST (Node.js + Express)
│   ├── src/
│   ├── public/             # Archivos estáticos
│   ├── scripts/            # Scripts de utilidad
│   └── package.json
├── frontend/               # Aplicación web (Next.js + React)
│   ├── app/
│   ├── src/
│   ├── public/
│   └── package.json
├── package.json            # Configuración raíz (monorepo)
└── README.md
```

## 🚀 Instalación Rápida

### Opción 1: Instalación Automática (Recomendado)

```bash
npm run install:all
```

Este comando instala todas las dependencias del proyecto raíz, backend y frontend.

### Opción 2: Instalación Manual

```bash
# Instalar dependencias del proyecto raíz
npm install

# Instalar dependencias del backend
cd backend
npm install
cd ..

# Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

## 🛠️ Desarrollo

### Ejecutar ambas aplicaciones simultáneamente

```bash
npm run dev
```

Esto iniciará:
- **Backend**: http://localhost:3000 (o el puerto configurado en .env)
- **Frontend**: http://localhost:3000 (Next.js dev server)

### Ejecutar solo el backend

```bash
npm run dev:backend
```

### Ejecutar solo el frontend

```bash
npm run dev:frontend
```

## 📦 Build para Producción

```bash
npm run build
```

Esto compilará tanto el backend como el frontend.

## 🚀 Ejecutar en Producción

```bash
npm start
```

## 📋 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run install:all` | Instala todas las dependencias |
| `npm run dev` | Inicia backend y frontend en modo desarrollo |
| `npm run dev:backend` | Inicia solo el backend |
| `npm run dev:frontend` | Inicia solo el frontend |
| `npm run build` | Compila ambas aplicaciones |
| `npm run build:backend` | Compila solo el backend |
| `npm run build:frontend` | Compila solo el frontend |
| `npm start` | Inicia ambas aplicaciones en producción |
| `npm run start:backend` | Inicia solo el backend en producción |
| `npm run start:frontend` | Inicia solo el frontend en producción |

## ⚙️ Configuración

### Backend

1. Copia el archivo `.env.example` a `.env` en la carpeta `backend/`:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Configura las variables de entorno necesarias:
   - `DATABASE_URL`: Conexión a Supabase
   - `SUPABASE_URL`: URL de tu proyecto Supabase
   - `SUPABASE_ANON_KEY`: Anon key de Supabase
   - `JWT_SECRET`: Clave secreta para JWT
   - `CHUTES_API_KEY`: Clave API de Chutes AI
   - Otras variables según sea necesario

### Frontend

1. Copia el archivo `.env.example` a `.env.local` en la carpeta `frontend/`:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

2. Configura la URL del backend:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

## 📚 Documentación Adicional

- **Backend**: Ver `backend/README.md` o `backend/src/config/README.md`
- **Frontend**: Ver `frontend/README.md`

## 🔧 Requisitos

- Node.js >= 18.x
- npm >= 9.x
- Base de datos (PostgreSQL recomendado para el backend)

## 📝 Notas Importantes

- Asegúrate de tener las variables de entorno configuradas antes de ejecutar la aplicación
- El backend debe estar ejecutándose para que el frontend funcione correctamente
- Usa `npm run install:all` para una instalación limpia y completa

## 🤝 Contribución

Para contribuir al proyecto, por favor:

1. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
2. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
3. Push a la rama (`git push origin feature/AmazingFeature`)
4. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia ISC.