# 📰 LUN.COM Scraping System

Sistema completo de scraping automático para **lun.com** que se ejecuta automáticamente entre las **00:01 y 06:00 AM** (horario de Santiago, UTC-3) en horarios aleatorios. Utiliza **Puppeteer** para capturar pantallas y **Tesseract.js OCR** para extraer texto de las imágenes.

## ✨ Características

✅ **Automatización Completa**: 00:01-06:00 AM diariamente  
✅ **Horarios Aleatorios**: Dentro de 00:01-06:00 AM, siempre en horarios distintos  
✅ **Tesseract.js OCR**: Extracción de texto local, gratuita, sin APIs externas  
✅ **Puppeteer**: Captura de pantalla completa con scroll agresivo  
✅ **Scheduler Inteligente**: Evita ejecución múltiple el mismo día  
✅ **API REST**: Endpoints para acceso a datos y control manual  
✅ **UI Integrada**: Panel de administración con botón de scraping  
✅ **Almacenamiento Local**: Screenshots y resultados en JSON  

## 🏗️ Arquitectura

### Componentes del Sistema

#### 1. **TesseractOCRService** (`server/backend/src/services/tesseractOCR.service.js`)
- Servicio de OCR local usando Tesseract.js
- Extrae texto de imágenes sin APIs externas
- Soporte para idioma español (spa)

#### 2. **LunComScraperService** (`server/backend/src/services/lunComScraper.service.js`)
- Scraping principal con Puppeteer
- Scheduler automático
- Captura de pantalla con Puppeteer
- Extracción de texto con Tesseract.js OCR
- Almacenamiento de resultados en JSON

#### 3. **LunCom Routes** (`server/backend/src/routes/lunCom.routes.js`)
- GET `/api/lun-com/today` - Obtener noticias de hoy
- POST `/api/lun-com/scrape-now` - Ejecutar scraping manual
- GET `/api/lun-com/status` - Estado del scheduler

#### 4. **UI Panel** (`app/dashboard/admin/scraper/page.tsx`)
- Integración en panel de administración
- Botón de scraping manual
- Estado del sistema en tiempo real

## 📋 Instalación

### 1. Dependencias

```bash
npm install tesseract.js puppeteer
```

### 2. Configuración

#### Variables de Entorno

```bash
# Tesseract.js OCR
# No requiere API keys - funciona completamente offline
TESSERACT_DATA_PATH=./
```

#### Configuración de Tesseract.js OCR

```javascript
{
  lang: 'spa',
  oem: 1,
  psm: 6,
}
```

### 3. Iniciar el Sistema

```bash
# Iniciar servidor con LUN.COM scraping
npm run dev

# Verificar estado
curl http://localhost:3000/api/lun-com/status
```

## 🔄 Funcionamiento

### Scheduler Automático

El sistema se ejecuta **automáticamente una vez al día** entre las 00:01 y 06:00 AM (horario Santiago):

```
⏰ Ventana de Ejecución: 00:01 - 06:00 AM
🕐 Horario: Aleatorio dentro de la ventana
🔄 Frecuencia: 1 vez por día
📍 Zona Horaria: America/Santiago (UTC-3)
```

### Flujo de Ejecución

```
1. ⏰ Scheduler verifica cada minuto si está en ventana de ejecución
2. 🌐 Puppeteer abre navegador y navega a lun.com
3. 📸 Captura screenshot optimizado (1280x720 JPEG, calidad 85%)
4. 🤖 Tesseract.js OCR extrae texto de la imagen
5. 📰 Procesa texto para identificar noticias
6. 💾 Guarda resultados en JSON con timestamp
7. 📊 Retorna estadísticas de extracción
```

### Diagrama de Flujo

```
Scheduler (00:01-06:00 AM)
         │
         ▼
    ┌─────────────┐
    │  Puppeteer  │
    │  Browser    │
    └─────────────┘
         │
         ▼
    ┌─────────────┐
    │ Screenshot  │
    │ 1280x720    │
    │ JPEG 85%    │
    └─────────────┘
         │
         ▼
    ┌─────────────┐
    │ Tesseract   │
    │   OCR       │
    └─────────────┘
         │
         ▼
    ┌─────────────┐
    │ Text        │
    │ Processing  │
    └─────────────┘
         │
         ▼
    ┌─────────────┐
    │ JSON        │
    │ Storage     │
    └─────────────┘
```

## 📊 API Endpoints

### GET /api/lun-com/today

Obtener las noticias scrapeadas de hoy.

**Respuesta:**
```json
{
  "success": true,
  "count": 16,
  "noticias": [
    {
      "titulo": "Título de la noticia",
      "descripcion": "Descripción extraída",
      "fuente": "lun.com",
      "url": "https://www.lun.com/...",
      "fechaExtraccion": "2025-11-07T20:55:45.437Z"
    }
  ],
  "timestamp": "2025-11-07T20:55:45.437Z"
}
```

### POST /api/lun-com/scrape-now

Ejecutar scraping manual inmediato.

**Respuesta:**
```json
{
  "success": true,
  "count": 16,
  "noticias": [...],
  "processingTime": 8.71,
  "timestamp": "2025-11-07T20:55:45.437Z"
}
```

### GET /api/lun-com/status

Estado actual del scheduler y sistema.

**Respuesta:**
```json
{
  "success": true,
  "status": "active",
  "scheduler": {
    "isActive": true,
    "lastExecuted": "2025-11-07T20:55:45.437Z",
    "nextExecutionWindow": "00:01-06:00 AM"
  },
  "system": {
    "ocr": "Tesseract.js",
    "screenshotDir": "/path/to/temp/lun-screenshots",
    "lastScreenshot": "lun-1762548944192.jpg"
  }
}
```

## 🧪 Testing

### Test Completo

```bash
# Ejecutar test del sistema completo
node test-lun-tesseract-final.js
```

**Salida esperada:**
```
🚀 INICIANDO TEST FINAL DEL SISTEMA LUN.COM
============================================================

📋 Configuración del Sistema:
   • OCR: Tesseract.js (local, gratuito)
   • Scheduler: 00:01-06:00 AM (Santiago)
   • Screenshot: 1280x720 JPEG, calidad 85%
   • Dependencias externas: 0 (100% local)

🔄 Ejecutando scraping de LUN.COM...

📊 RESULTADOS DEL TEST:
========================================
⏱️  Tiempo total: 8.71 segundos
📰 Noticias extraídas: 16
✅ Estado: EXITOSO

🔍 VERIFICACIÓN DEL SISTEMA:
----------------------------------------
✅ Tesseract.js OCR: Operativo
✅ Sin APIs externas: Confirmado
✅ Sin dependencias de OCR.space: Confirmado
✅ Sin dependencias de DeepSeek: Confirmado
✅ Scheduler automático: Configurado
✅ API endpoints: Disponibles
✅ UI integrada: Funcional

🎯 CONCLUSIÓN:
========================================
✅ SISTEMA LUN.COM 100% OPERATIVO
✅ Extracción exitosa con Tesseract.js
✅ Costo operativo: $0.00
✅ Sin dependencias externas
```

### Test de Scheduler

```bash
# Ejecutar test específico del scheduler
node test-lun-com-scheduler.js
```

**Salida esperada:**
```
🎬 Iniciando test del Scheduler de LUN.COM

✅ Servicio de LUN.COM inicializado
   - Scheduler activo: true
   - Última ejecución: Nunca
   - Directorio de screenshots: /path/to/temp/lun-screenshots

📅 Estado del Scheduler:
   - Ventana de ejecución: 00:01 - 06:00 AM (horario de Santiago)
   - Zona horaria: America/Santiago (UTC-3)
   - Frecuencia de verificación: Cada minuto
   - Horarios aleatorios dentro de la ventana: Sí

🔌 Endpoints disponibles:
   - GET  /api/lun-com/today       → Obtener noticias de hoy
   - POST /api/lun-com/scrape-now  → Ejecutar scraping manual
   - GET  /api/lun-com/status      → Estado del scheduler

✅ Test completado exitosamente
```

---

## 🔐 Seguridad

### Protecciones Implementadas

✅ **Rate Limiting**: Máximo 1 scraping por día automático  
✅ **Validación de Contenido**: Filtrado de publicidad y spam  
✅ **Deduplicación**: Evita duplicados en base de datos  
✅ **Timeout**: 30 segundos máximo por operación  
✅ **Reintentos**: Backoff exponencial para fallos transitorios  
✅ **Logs Auditables**: Registro completo de todas las operaciones  

---

## 📊 Costos

### Tesseract.js OCR

- **Costo por imagen**: $0.00 (completamente gratuito)
- **Estimado diario**: $0.00 (procesamiento local)
- **Estimado mensual**: $0.00

### Infraestructura

- **Puppeteer**: Incluido en servidor
- **Almacenamiento**: ~10MB por mes (screenshots + JSON)
- **Ancho de banda**: Mínimo

---

## 🚨 Troubleshooting

### Problema: Scheduler no se ejecuta

**Solución:**
1. Verificar que la zona horaria sea correcta: `TZ=America/Santiago`
2. Verificar que el servidor esté corriendo
3. Verificar logs: `grep "LUN.COM" logs/scraping.log`

### Problema: OCR no extrae texto

**Solución:**
1. Verificar que Tesseract.js esté instalado
2. Verificar archivo de idioma spa.traineddata
3. Verificar que la imagen sea válida (PNG/JPG)
4. Verificar permisos de lectura del archivo

### Problema: Puppeteer falla

**Solución:**
1. Verificar que Puppeteer esté instalado: `npm list puppeteer`
2. Verificar permisos de directorio: `chmod 755 temp/lun-screenshots`
3. Verificar memoria disponible
4. Reiniciar servidor

---

## 📝 Notas Importantes

1. **Zona Horaria**: El sistema usa `America/Santiago (UTC-3)`. Ajustar si es necesario.

2. **Ventana de Ejecución**: 00:01 - 06:00 AM es cuando lun.com se actualiza. Cambiar si es necesario.

3. **Horarios Aleatorios**: Dentro de la ventana, el scheduler elige un horario aleatorio cada día para evitar patrones.

4. **Deduplicación**: Se realiza por título. Si el título cambia, se considera una noticia diferente.

5. **Almacenamiento**: Las capturas de pantalla ocupan ~200KB cada una (JPEG optimizado). Limpiar periódicamente si es necesario.

---

## 📞 Soporte

Para reportar problemas o sugerencias:
1. Revisar logs en `server/backend/logs/scraping.log`
2. Ejecutar test: `node test-lun-tesseract-final.js`
3. Verificar estado: `curl http://localhost:3000/api/lun-com/status`

---

**Última actualización:** 2025-11-07  
**Versión:** 2.0.0 (Sin APIs externas)  
**Estado:** ✅ Producción
