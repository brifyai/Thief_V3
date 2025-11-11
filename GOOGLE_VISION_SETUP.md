# 🧠 Guía de Configuración - Google Vision API para OCR Mejorado

## 📋 Resumen

Esta guía te ayudará a configurar Google Vision API para obtener resultados de OCR mucho más precisos en el scraping de LUN.com y otros sitios.

## 🎯 Beneficios

- **Precisión superior**: Google Vision tiene >95% de precisión vs ~40% de Tesseract
- **Mejor manejo de idiomas**: Reconocimiento óptimo de español con acentos y caracteres especiales
- **Menos caracteres corruptos**: Elimina casi por completo los errores de reconocimiento
- **Procesamiento en la nube**: Más rápido y no consume recursos locales

## 🔧 Pasos de Configuración

### 1. Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el ID del proyecto (lo necesitarás más tarde)

### 2. Habilitar Cloud Vision API

1. En el menú de navegación, ve a **APIs y Servicios** > **Biblioteca**
2. Busca "**Cloud Vision API**"
3. Haz clic en **Habilitar**
4. Espera a que se active (puede tardar unos minutos)

### 3. Crear Cuenta de Servicio

1. Ve a **APIs y Servicios** > **Credenciales**
2. Haz clic en **+ Crear credenciales** > **Cuenta de servicio**
3. Dale un nombre (ej: `ocr-service-account`)
4. Selecciona el rol: **Visor de Cloud Vision** (`roles/vision.imageViewer`)
5. Haz clic en **Listo**

### 4. Crear Clave JSON

1. En la lista de cuentas de servicio, encuentra la que acabas de crear
2. Haz clic en el correo electrónico > **Claves** > **Agregar clave** > **Crear nueva clave**
3. Selecciona **JSON** como tipo de clave
4. Haz clic en **Crear**
5. Se descargará un archivo `.json` - **guárdalo en un lugar seguro**

### 5. Configurar en el Proyecto

#### Opción A: Archivo de Credenciales (Recomendado)

1. Copia el archivo JSON descargado a:
   ```
   server/backend/google-credentials.json
   ```
2. Asegúrate que el archivo se llame exactamente `google-credentials.json`

#### Opción B: Variable de Entorno

1. Edita tu archivo `.env`:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/ruta/completa/a/tu/archivo.json
   ```

### 6. Verificar Configuración

Ejecuta este comando para verificar que todo funciona:

```bash
cd server/backend
node -e "
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();
console.log('✅ Google Vision API configurado correctamente');
"
```

Si ves el mensaje ✅, ¡está listo!

## 💰 Costos

Google Vision API tiene un generoso plan gratuito:
- **Primeros 1000 unidades/mes**: Gratis
- **Después**: $1.50 por 1000 unidades
- **1 imagen = 1 unidad**

Para scraping de noticias, típicamente usarás 6-12 imágenes por ejecución.

## 🚀 Probar el Mejorado OCR

Una vez configurado, ejecuta:

```bash
node test-enhanced-ocr-lun.js
```

Deberías ver en los logs:
```
🧠 Google Vision API: Habilitado
✅ Google Vision: 1234 caracteres, confianza: 96.5%
```

## 📊 Comparación de Resultados

| Característica | Tesseract.js | Google Vision API |
|---------------|---------------|-------------------|
| Precisión | ~40% | ~95% |
| Caracteres corruptos | Muchos | Casi ninguno |
| Velocidad | Rápido (local) | Rápido (nube) |
| Costo | Gratis | $1.50/1000 imágenes |
| Configuración | Automática | Requiere setup |

## 🔧 Solución de Problemas

### Error: "Google Vision API no configurada"

- Verifica que el archivo `google-credentials.json` exista
- Revisa que la variable de entorno `GOOGLE_APPLICATION_CREDENTIALS` apunte al archivo correcto
- Asegúrate que la API esté habilitada en Google Cloud Console

### Error: "Permission denied"

- Verifica que la cuenta de servicio tenga el rol correcto
- Asegúrate que la API Vision esté habilitada
- Revisa que el proyecto ID sea correcto

### Error: "Quota exceeded"

- Has alcanzado el límite del plan gratuito
- Considera habilitar facturación para continuar usando el servicio

## 🎛️ Configuración Avanzada

### Variables de Entorno Adicionales

Puedes agregar estas a tu `.env` para ajustar el comportamiento:

```bash
# Prioridad de motores OCR (separados por coma)
# Opciones: google-vision, ocr-space, tesseract
OCR_ENGINES_PRIORITY=google-vision,ocr-space,tesseract

# Confianza mínima aceptable (0-100)
OCR_MIN_CONFIDENCE=85

# Habilitar/deshabilitar preprocesamiento de imágenes
OCR_ENABLE_PREPROCESSING=true
```

## 📝 Notas Finales

- Google Vision API da los mejores resultados para texto impreso
- Para texto manuscrito o muy estilizado, considera OCR Space como alternativa
- El sistema fallback automático usará Tesseract si Google Vision falla
- Los screenshots de alta resolución (2560x1440) son óptimos para Google Vision

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs del sistema para errores específicos
2. Verifica la configuración en Google Cloud Console
3. Asegúrate que las credenciales sean válidas y no hayan expirado
4. Consulta la documentación oficial de [Google Vision API](https://cloud.google.com/vision/docs)