# 🪟 Configurar Variables de Entorno Permanentemente en Windows

## 🎯 ¿Qué acaba de pasar?

Acabo de abrir la ventana de **Variables de Entorno de Windows**. Ahora sigue estos pasos:

---

## 📋 Pasos para Configurar Permanentemente

### 1. **En la ventana que se abrió:**
- Busca la sección **"Variables del sistema"** (la de abajo)
- Haz clic en el botón **"Variables de entorno..."**

### 2. **En Variables del sistema:**
- Haz clic en **"Nueva..."** (en Variables del sistema, no en Variables de usuario)

### 3. **Configura la variable:**
- **Nombre de la variable:** `GOOGLE_APPLICATION_CREDENTIALS`
- **Valor de la variable:** `C:\Users\admin\Desktop\AIntelligence\scraper\Thief_V3\master-scope-463121-d4-b1a71fa937ed.json`

### 4. **Finaliza:**
- Haz clic en **"Aceptar"** en todas las ventanas
- **Reinicia tu terminal** (ciérrala y ábrela de nuevo)

---

## ✅ Verificación

Abre una terminal **nueva** y ejecuta:

```bash
node check-google-vision-setup.js
```

Deberías ver:
```
✅ Google Vision API está configurada
🎉 ¡Todo está configurado correctamente!
```

---

## 🔄 Si no funciona:

### Opción A: Variables de usuario (si las de sistema no funcionan)
Repite los pasos pero en **"Variables de usuario"** en lugar de "Variables del sistema".

### Opción B: Verificar la ruta
Asegúrate que el archivo JSON existe en:
```
C:\Users\admin\Desktop\AIntelligence\scraper\Thief_V3\master-scope-463121-d4-b1a71fa937ed.json
```

---

## 🚀 Una vez configurado:

Podrás usar el scraper **sin necesidad de configurar nada más**:

```bash
# El scraper funcionará automáticamente con Google Vision
node test-deep-lun.js

# O cualquier otro script que use el OCR
node server/backend/src/services/lunComScraper-v2.service.js
```

## 💡 Beneficios:

- ✅ **Permanente:** No necesitas ejecutar comandos cada vez
- ✅ **Automático:** El scraper detectará Google Vision automáticamente
- ✅ **Global:** Funciona en cualquier terminal que abras

---

## 🆘 ¿Necesitas ayuda?

Si tienes problemas con los pasos:
1. Toma una captura de pantalla de la ventana de variables de entorno
2. Dime qué paso te da problemas
3. Te ayudaré específicamente con ese paso

**Importante:** Después de configurar, **reinicia tu terminal** para que los cambios tengan efecto.