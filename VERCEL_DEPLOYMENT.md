# Guía de Deployment en Vercel

## 📋 Descripción

Esta guía explica cómo desplegar la aplicación ProyectoWebScrapper en Vercel. La aplicación está configurada para desplegar el frontend (Next.js) en Vercel.

---

## 🚀 Pasos para Desplegar en Vercel

### 1. Conectar Repositorio GitHub

1. Ve a https://vercel.com
2. Inicia sesión con tu cuenta GitHub
3. Haz clic en "New Project"
4. Selecciona el repositorio `brifyai/Thief_V2`
5. Haz clic en "Import"

### 2. Configurar Variables de Entorno

En la pantalla de configuración del proyecto, agrega las siguientes variables:

```
NEXT_PUBLIC_API_URL=https://tu-backend.com
CHUTES_API_KEY=cpk_178f36e444794015a6c6765c24569340.73d645ff58545311aa226d6de7ec2a15.W0WaeOgYQRVOVskEVTtzWUstJEUcl2Ls
```

### 3. Configurar Build Settings

- **Framework Preset**: Next.js
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/.next`
- **Install Command**: `npm install`

### 4. Desplegar

Haz clic en "Deploy" y espera a que se complete el build.

---

## 🔧 Configuración de vercel.json

El archivo `vercel.json` en la raíz del proyecto contiene la configuración necesaria:

```json
{
  "version": 2,
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/.next",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url"
  }
}
```

### Explicación:
- **buildCommand**: Comando para construir el frontend
- **outputDirectory**: Directorio de salida del build
- **env**: Variables de entorno necesarias

---

## 📊 Estructura del Proyecto para Vercel

```
Thief_V2/
├── frontend/                 # Aplicación Next.js (se despliega en Vercel)
│   ├── app/
│   ├── src/
│   ├── package.json
│   └── next.config.ts
├── backend/                  # API Node.js (se despliega por separado)
│   ├── src/
│   ├── package.json
│   └── index.js
├── vercel.json              # Configuración de Vercel
└── package.json             # Configuración raíz
```

---

## 🌐 Desplegar Backend Separadamente

El backend debe desplegarse en una plataforma diferente (Railway, Render, Heroku, etc.):

### Opción 1: Railway

1. Ve a https://railway.app
2. Conecta tu repositorio GitHub
3. Selecciona la rama `main`
4. Configura las variables de entorno
5. Despliega

### Opción 2: Render

1. Ve a https://render.com
2. Crea un nuevo "Web Service"
3. Conecta tu repositorio GitHub
4. Configura:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
5. Agrega variables de entorno
6. Despliega

### Opción 3: Heroku

1. Ve a https://heroku.com
2. Crea una nueva aplicación
3. Conecta tu repositorio GitHub
4. Configura el Procfile:
   ```
   web: cd backend && npm start
   ```
5. Despliega

---

## 🔐 Variables de Entorno en Vercel

### Frontend (NEXT_PUBLIC_*)

Estas variables son públicas y se incluyen en el bundle del cliente:

```
NEXT_PUBLIC_API_URL=https://tu-backend-api.com
```

### Backend (Privadas)

Estas variables se configuran en el servicio de backend:

```
CHUTES_API_KEY=cpk_...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
```

---

## 🧪 Verificar Deployment

### 1. Verificar Frontend en Vercel

```bash
# Acceder a la URL de Vercel
https://thief-v2.vercel.app

# Verificar logs
# En el dashboard de Vercel: Deployments → Logs
```

### 2. Verificar Backend

```bash
# Acceder a la URL del backend
https://tu-backend-api.com/health

# Debe retornar:
{
  "status": "ok",
  "timestamp": "2025-11-04T15:00:00Z"
}
```

### 3. Verificar Conectividad

```bash
# Desde el frontend, probar conexión al backend
curl https://tu-backend-api.com/api/health
```

---

## 🐛 Troubleshooting

### Error: "next: command not found"

**Causa**: Next.js no está instalado en el ambiente de build

**Solución**: Verificar que `vercel.json` tiene el `buildCommand` correcto:
```json
"buildCommand": "cd frontend && npm install && npm run build"
```

### Error: "Cannot find module"

**Causa**: Dependencias no instaladas

**Solución**: 
1. Verificar `package.json` en frontend
2. Ejecutar `npm install` localmente
3. Hacer commit de `package-lock.json`

### Error: "NEXT_PUBLIC_API_URL is not defined"

**Causa**: Variable de entorno no configurada

**Solución**:
1. Ir a Vercel Dashboard
2. Settings → Environment Variables
3. Agregar `NEXT_PUBLIC_API_URL`
4. Redeploy

### Build tarda mucho tiempo

**Causa**: Dependencias grandes o build lento

**Solución**:
1. Optimizar dependencias
2. Usar `npm ci` en lugar de `npm install`
3. Aumentar timeout en Vercel

---

## 📈 Monitoreo en Producción

### 1. Logs de Vercel

```bash
# Ver logs en tiempo real
vercel logs --follow
```

### 2. Métricas

- Acceder a Vercel Dashboard
- Ver: Analytics, Performance, Deployments

### 3. Alertas

Configurar alertas en Vercel para:
- Build failures
- Performance issues
- Error rates

---

## 🔄 Actualizar Deployment

### Opción 1: Automático (Recomendado)

Cada push a `main` dispara un nuevo deployment automáticamente.

```bash
git add .
git commit -m "Cambios"
git push origin main
# Vercel automáticamente despliega
```

### Opción 2: Manual

```bash
# Instalar Vercel CLI
npm install -g vercel

# Desplegar
vercel deploy --prod
```

---

## 🎯 Checklist de Deployment

- [ ] Repositorio conectado a Vercel
- [ ] Variables de entorno configuradas
- [ ] Build command correcto
- [ ] Output directory correcto
- [ ] Frontend se compila sin errores
- [ ] Backend desplegado en otra plataforma
- [ ] Variables de entorno del backend configuradas
- [ ] Conectividad entre frontend y backend verificada
- [ ] Logs monitoreados
- [ ] Alertas configuradas

---

## 📞 Soporte

### Documentación Oficial

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs

### Problemas Comunes

Ver [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) para más problemas y soluciones.

---

## 🎉 Conclusión

Con esta guía puedes desplegar la aplicación en Vercel (frontend) y en otra plataforma (backend). El deployment es automático con cada push a GitHub.

**¡Tu aplicación está lista para producción!**

---

**Guía Creada**: 4 de Noviembre de 2025  
**Versión**: 1.0  
**Estado**: ✅ Listo para Usar