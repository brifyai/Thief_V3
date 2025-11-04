# 🚀 COMIENZA AQUÍ

## Pasos para ver el menú de la izquierda

### 1. Instala las dependencias
```bash
chmod +x setup.sh
./setup.sh
```

### 2. Configura el backend
```bash
cd backend
cp .env.example .env
```

Edita `backend/.env` y agrega:
```
DATABASE_URL=postgresql://user:password@localhost:5432/scraper_db
JWT_SECRET=tu_clave_secreta_aqui
```

Luego ejecuta el schema en Supabase:
1. Ve a https://supabase.com/dashboard
2. Abre el Editor SQL
3. Ejecuta el contenido de `supabase-schema.sql`

### 3. Configura el frontend
```bash
cd frontend
cp .env.example .env.local
```

Edita `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

```bash
cd ..
```

### 4. Ejecuta la aplicación
```bash
npm run dev
```

### 5. Abre en el navegador
- Ve a http://localhost:3000
- Haz clic en "Registrarse"
- Crea una cuenta
- ¡Verás el menú lateral!

## ✅ Listo

El menú lateral aparecerá automáticamente cuando inicies sesión en el dashboard.