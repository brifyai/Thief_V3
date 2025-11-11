# 📋 Guía para Obtener Credenciales de Google Vision API

## 🎯 Resumen Rápido

1. **Crear cuenta en Google Cloud** (si no tienes)
2. **Crear un nuevo proyecto** o usar uno existente
3. **Activar Cloud Vision API**
4. **Crear cuenta de servicio**
5. **Descargar clave JSON**
6. **Configurar variable de entorno**

---

## 🚀 Paso a Paso Detallado

### 1. Crear Cuenta Google Cloud

Si no tienes cuenta en Google Cloud:

1. Ve a [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Haz clic en "Crear cuenta" o "Iniciar sesión"
3. Selecciona "Cloud" (no Firebase)
4. Completa el registro (necesitarás tarjeta de crédito, pero tienen $300 gratis)

### 2. Crear Nuevo Proyecto

1. En la consola de Google Cloud, haz clic en el selector de proyectos (arriba izquierda)
2. Haz clic en "NUEVO PROYECTO"
3. Nombre: `LUN-Scraper-OCR` (o el que prefieras)
4. Haz clic en "CREAR"

### 3. Activar Cloud Vision API

1. En el menú izquierdo, ve a **APIs y servicios > Biblioteca**
2. Busca: **"Cloud Vision API"**
3. Haz clic en el resultado y luego en **"ACTIVAR"**
4. Espera unos minutos mientras se activa

### 4. Crear Cuenta de Servicio

1. En el menú izquierdo, ve a **IAM y administración > Cuentas de servicio**
2. Haz clic en **"CREAR CUENTA DE SERVICIO"**
3. Completa los campos:
   - **Nombre**: `vision-api-service`
   - **ID de cuenta de servicio**: `vision-api-service@tu-proyecto-id.iam.gserviceaccount.com` (se genera solo)
   - **Descripción**: `Servicio para OCR de LUN scraper`
4. Haz clic en **"CREAR Y CONTINUAR"**

### 5. Asignar Permisos

1. En la sección "Conceder a esta cuenta de servicio acceso al proyecto":
2. Selecciona el rol: **"Vision AI Admin"** o **"Editor"**
3. Haz clic en **"CONTINUAR"**
4. Omite el paso 3 (usuarios) y haz clic en **"HECHO"**

### 6. Crear y Descargar Clave JSON

1. En la lista de cuentas de servicio, encuentra tu `vision-api-service`
2. Haz clic en los 3 puntos (⋮) al final de la fila
3. Selecciona **"Administrar claves"**
4. Haz clic en **"AGREGAR CLAVE" > "Crear nueva clave"**
5. Selecciona **"JSON"** (ya viene seleccionado)
6. Haz clic en **"CREAR"**
7. **¡IMPORTANTE!** Se descargará un archivo `.json` - ¡guárdalo bien!

### 7. Configurar Variable de Entorno

#### Opción A: Temporal (solo para esta sesión de terminal)

```bash
# En Windows (CMD)
set GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\completa\a\tu-archivo.json"

# En Windows (PowerShell)
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\completa\a\tu-archivo.json"

# En Linux/Mac
export GOOGLE_APPLICATION_CREDENTIALS="/ruta/completa/a/tu-archivo.json"
```

#### Opción B: Permanente (recomendado)

**Windows:**
1. Busca "Variables de entorno" en el menú inicio
2. Haz clic en "Editar las variables de entorno del sistema"
3. Haz clic en "Variables de entorno..."
4. En "Variables del sistema", haz clic en "Nueva"
5. Nombre: `GOOGLE_APPLICATION_CREDENTIALS`
6. Valor: `C:\ruta\completa\a\tu-archivo.json`
7. Acepta todo y reinicia tu terminal

**Linux/Mac:**
```bash
# Agregar a ~/.bashrc o ~/.zshrc
echo 'export GOOGLE_APPLICATION_CREDENTIALS="/ruta/completa/a/tu-archivo.json"' >> ~/.bashrc
source ~/.bashrc
```

### 8. Probar Configuración

1. **Instalar dependencias si no las tienes:**
   ```bash
   npm install @google-cloud/vision
   ```

2. **Ejecutar prueba:**
   ```bash
   node test-google-vision-ocr.js
   ```

Si todo está configurado correctamente, deberías ver:
```
✅ Google Vision API está configurada
📸 Procesando imagen...
✅ Google Vision: 1234 caracteres, confianza: 95.2%
```

---

## 💰 Costos de Google Vision API

- **Precio**: ~$1.50 por cada 1000 imágenes
- **Límite gratuito**: 1000 imágenes por mes
- **Para LUN scraper**: Si procesas 100 noticias/día = ~3000/mes = ~$3/mes

---

## 🔧 Solución de Problemas

### Error: "Google Vision API no está configurada"
- Verifica que la variable de entorno esté configurada correctamente
- Reinicia tu terminal después de configurar la variable
- Verifica que la ruta al archivo JSON sea correcta

### Error: "Permission denied"
- Asegúrate de que la cuenta de servicio tenga el rol "Vision AI Admin"
- Verifica que la API esté activada en tu proyecto

### Error: "API not enabled"
- Ve a APIs y servicios > Biblioteca
- Busca "Cloud Vision API" y actívala

---

## 📁 Estructura de Archivos Recomendada

```
Thief_V3/
├── server/backend/
│   ├── .env
│   └── src/services/enhancedOCR.service.js
├── credentials/
│   └── google-vision-credentials.json  ← Tu archivo JSON aquí
└── test-google-vision-ocr.js
```

Luego configura la variable de entorno apuntando a este archivo:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./credentials/google-vision-credentials.json"
```

---

## ✅ Checklist Final

- [ ] Cuenta Google Cloud creada
- [ ] Proyecto creado
- [ ] Cloud Vision API activada
- [ ] Cuenta de servicio creada
- [ ] Permisos asignados
- [ ] Clave JSON descargada
- [ ] Variable de entorno configurada
- [ ] Prueba ejecutada exitosamente

---

## 🆘 Ayuda Adicional

Si tienes problemas:

1. **Verifica la configuración:**
   ```bash
   echo $GOOGLE_APPLICATION_CREDENTIALS
   ```

2. **Revisa los logs del servicio:**
   ```bash
   node test-google-vision-ocr.js
   ```

3. **Documentación oficial:**
   - [Google Cloud Vision Quickstart](https://cloud.google.com/vision/docs/quickstart)
   - [Service Accounts Guide](https://cloud.google.com/iam/docs/creating-managing-service-accounts)

Una vez configurado, el servicio OCR funcionará con ~95% de precisión para el scraping de LUN.com 🎉