# Guía de Configuración de Sitios

## 📖 Formato del Archivo `site-configs.json`

### Estructura Básica

```json
{
  "sites": [
    {
      "domain": "string",
      "name": "string",
      "enabled": boolean,
      "priority": number,
      "selectors": {
        "listing": { ... },
        "article": { ... }
      },
      "cleaningRules": [ ... ],
      "metadata": { ... }
    }
  ]
}
```

## 🔧 Campos Principales

### `domain` (requerido)
- **Tipo:** String
- **Descripción:** Dominio del sitio (sin http/https)
- **Ejemplo:** `"emol.com"`, `"puromarketing.com"`

### `name` (requerido)
- **Tipo:** String
- **Descripción:** Nombre legible del sitio
- **Ejemplo:** `"Emol"`, `"PuroMarketing"`

### `enabled` (opcional)
- **Tipo:** Boolean
- **Default:** `true`
- **Descripción:** Si el sitio está activo
- **Ejemplo:** `true`, `false`

### `priority` (opcional)
- **Tipo:** Number
- **Descripción:** Prioridad del sitio (menor = mayor prioridad)
- **Ejemplo:** `1`, `2`, `3`

## 📋 Selectores

### `selectors.listing` (para listados de noticias)

```json
{
  "listing": {
    "container": "string | array",
    "title": "string | array",
    "link": "string | array",
    "description": "string | array"
  }
}
```

**Campos:**
- `container`: Selector del contenedor de cada noticia
- `title`: Selector del título
- `link`: Selector del enlace
- `description`: Selector de la descripción

**Nota:** Todos los selectores pueden ser:
- String único: `".news-title"`
- Array de selectores: `["h1 a", "h3 a", ".title a"]`

### `selectors.article` (para artículos individuales)

```json
{
  "article": {
    "title": "string | array",
    "subtitle": "string | array",
    "content": "string | array",
    "date": "string | array",
    "author": "string | array",
    "images": "string | array"
  }
}
```

**Campos:**
- `title`: Selector del título del artículo
- `subtitle`: Selector del subtítulo/bajada (opcional)
- `content`: Selector del contenido principal
- `date`: Selector de la fecha de publicación
- `author`: Selector del autor
- `images`: Selector de imágenes del artículo

## 🧹 Reglas de Limpieza

```json
{
  "cleaningRules": [
    {
      "type": "regex",
      "pattern": "string",
      "description": "string"
    }
  ]
}
```

**Campos:**
- `type`: Tipo de regla (actualmente solo "regex")
- `pattern`: Patrón regex a aplicar
- `description`: Descripción de qué hace la regla

**Ejemplo:**
```json
{
  "type": "regex",
  "pattern": "^\\d{2}:\\d{2}\\s*\\|\\s*",
  "description": "Remover timestamps del inicio"
}
```

## 📊 Metadata

```json
{
  "metadata": {
    "dateFormat": "string",
    "authorSeparator": "string",
    "encoding": "string"
  }
}
```

**Campos opcionales:**
- `dateFormat`: Formato de fecha usado por el sitio
- `authorSeparator`: Separador entre fecha y autor
- `encoding`: Codificación del sitio

## 📝 Ejemplos Completos

### Ejemplo 1: Sitio Simple

```json
{
  "domain": "ejemplo.com",
  "name": "Ejemplo News",
  "enabled": true,
  "priority": 1,
  "selectors": {
    "listing": {
      "container": ".news-item",
      "title": ".news-title",
      "link": ".news-title a",
      "description": ".news-excerpt"
    },
    "article": {
      "title": "h1.article-title",
      "content": ".article-body",
      "date": ".publish-date",
      "author": ".author-name",
      "images": ".article-body img"
    }
  },
  "cleaningRules": [],
  "metadata": {
    "encoding": "utf-8"
  }
}
```

### Ejemplo 2: Sitio con Múltiples Selectores

```json
{
  "domain": "noticias.com",
  "name": "Noticias",
  "enabled": true,
  "priority": 2,
  "selectors": {
    "listing": {
      "container": [".news-card", ".article-preview", ".post-item"],
      "title": ["h2.title", "h3.headline", ".post-title"],
      "link": ["h2.title a", "h3.headline a", ".post-title a"],
      "description": [".excerpt", ".summary", "p.description"]
    },
    "article": {
      "title": ["h1.main-title", "h1.article-title", ".page-title"],
      "content": [".article-content", ".post-body", ".entry-content"],
      "date": ["time.published", ".post-date", "[datetime]"],
      "author": [".author-name", ".byline", "[rel='author']"],
      "images": [".article-content img", ".post-body img"]
    }
  },
  "cleaningRules": [
    {
      "type": "regex",
      "pattern": "^Publicado:\\s*",
      "description": "Remover prefijo 'Publicado:'"
    }
  ],
  "metadata": {
    "dateFormat": "DD/MM/YYYY",
    "encoding": "utf-8"
  }
}
```

## ✅ Validación

El sistema valida automáticamente:
- ✅ Que exista el array `sites`
- ✅ Que cada sitio tenga `domain`
- ✅ Que cada sitio tenga `selectors`
- ✅ Estructura JSON válida

## 🚨 Errores Comunes

### 1. JSON Inválido
```json
// ❌ MAL - Coma extra
{
  "domain": "ejemplo.com",
}

// ✅ BIEN
{
  "domain": "ejemplo.com"
}
```

### 2. Selectores Vacíos
```json
// ❌ MAL
{
  "listing": {
    "container": ""
  }
}

// ✅ BIEN
{
  "listing": {
    "container": ".news-item"
  }
}
```

### 3. Regex Sin Escapar
```json
// ❌ MAL
{
  "pattern": "\d{2}:\d{2}"
}

// ✅ BIEN
{
  "pattern": "\\d{2}:\\d{2}"
}
```

## 🔄 Recargar Configuraciones

### Desde Código:
```javascript
const configLoader = require('./services/configLoader.service');
configLoader.reloadConfigs();
```

### Verificar Estado:
```javascript
const status = configLoader.getStatus();
console.log(status);
// {
//   configsLoaded: true,
//   totalSites: 2,
//   enabledSites: 2,
//   lastLoadTime: "2025-10-16T13:02:00.000Z",
//   configPath: "/path/to/site-configs.json"
// }
```

## 📚 Recursos

- **Selectores CSS:** https://developer.mozilla.org/es/docs/Web/CSS/CSS_Selectors
- **Regex JavaScript:** https://developer.mozilla.org/es/docs/Web/JavaScript/Guide/Regular_Expressions
- **Cheerio Docs:** https://cheerio.js.org/

## 💡 Tips

1. **Usa selectores específicos** para evitar falsos positivos
2. **Prueba selectores** en DevTools del navegador primero
3. **Array de selectores** como fallback para sitios que cambian estructura
4. **Reglas de limpieza** para normalizar texto extraído
5. **Deshabilita sitios** temporalmente con `"enabled": false`

---

**Última actualización:** 16 de Octubre, 2025
