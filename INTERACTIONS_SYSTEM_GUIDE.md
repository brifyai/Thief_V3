# 📊 Sistema de Gestión de Interacciones de Chutes AI

## 📋 Descripción General

El sistema de gestión de interacciones permite controlar y limitar el uso de la API de Chutes AI por usuario. Cada usuario tiene un límite diario de **250 interacciones** (editable por administrador) que se descuentan con cada operación de IA.

---

## 🎯 ¿Qué es una Interacción?

Según la documentación de Chutes AI, una **interacción = 1 llamada a la API** (1 request/response).

### ✅ Operaciones que cuentan como interacción:

- **Humanización de artículos** (1 interacción por artículo)
- **Búsqueda semántica** (1 interacción por búsqueda)
- **Categorización de contenido** (1 interacción por categorización)
- **Análisis de entidades** (1 interacción por análisis)
- **Cualquier otra operación que use IA** (1 interacción)

### ❌ Operaciones que NO cuentan como interacción:

- Lectura de artículos
- Navegación en la UI
- Operaciones de base de datos sin IA
- Consultas de saldo o historial

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  InteractionsPanel (Admin Dashboard)                 │   │
│  │  - Ver saldo por usuario                             │   │
│  │  - Asignar/editar interacciones                      │   │
│  │  - Ver historial de consumo                          │   │
│  │  - Configurar límite global                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes (/api/interactions)                      │   │
│  │  - GET /balance - Saldo del usuario                  │   │
│  │  - GET /history - Historial de consumo               │   │
│  │  - GET /stats - Estadísticas                         │   │
│  │  - POST /validate - Validar saldo                    │   │
│  │  - POST /admin/interactions/assign - Asignar (admin) │   │
│  │  - PUT /admin/interactions/limit - Límite (admin)    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  InteractionManager Service                          │   │
│  │  - deductInteraction()                               │   │
│  │  - getBalance()                                      │   │
│  │  - validateBalance()                                 │   │
│  │  - assignInteractions()                              │   │
│  │  - resetDailyInteractions()                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  user_interactions                                   │   │
│  │  - user_id, daily_limit, available_interactions      │   │
│  │  - consumed_today, last_reset                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  interaction_logs (historial)                        │   │
│  │  - user_id, operation_type, interactions_deducted    │   │
│  │  - balance_before, balance_after                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Esquema de Base de Datos

### Tabla: `user_interactions`

Almacena el saldo de interacciones por usuario.

```sql
CREATE TABLE user_interactions (
  id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  daily_limit INT DEFAULT 250,
  available_interactions INT DEFAULT 250,
  consumed_today INT DEFAULT 0,
  last_reset TIMESTAMP,
  updated_at TIMESTAMP,
  created_at TIMESTAMP
);
```

**Campos:**
- `user_id`: ID del usuario (UUID)
- `daily_limit`: Límite diario de interacciones (default: 250)
- `available_interactions`: Interacciones disponibles actualmente
- `consumed_today`: Interacciones consumidas hoy
- `last_reset`: Última vez que se resetearon las interacciones

### Tabla: `interaction_logs`

Historial detallado de consumo de interacciones.

```sql
CREATE TABLE interaction_logs (
  id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL,
  operation_type VARCHAR(100),
  interactions_deducted INT DEFAULT 1,
  balance_before INT,
  balance_after INT,
  metadata JSONB,
  created_at TIMESTAMP
);
```

**Campos:**
- `operation_type`: Tipo de operación (humanize, search, categorize, etc.)
- `interactions_deducted`: Cantidad deducida (siempre 1)
- `balance_before`: Saldo antes de la operación
- `balance_after`: Saldo después de la operación
- `metadata`: Información adicional en JSON

### Tabla: `interaction_settings`

Configuración global del sistema.

```sql
CREATE TABLE interaction_settings (
  id BIGINT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE,
  setting_value VARCHAR(500),
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP,
  created_at TIMESTAMP
);
```

**Configuraciones disponibles:**
- `daily_limit`: Límite diario global (default: 250)
- `reset_hour`: Hora del día para resetear (default: 0 UTC-3)
- `enabled`: Sistema habilitado (default: true)

---

## 🔄 Flujo de Operación

### Cuando un usuario realiza una operación de IA:

```
1. Usuario solicita humanización/búsqueda/etc
   ↓
2. Middleware validateInteractions verifica saldo
   ├─ Si saldo < 1 → Retorna 429 "No hay interacciones disponibles"
   └─ Si saldo ≥ 1 → Continúa
   ↓
3. Se ejecuta la operación de IA
   ↓
4. En tokenTracker.trackUsage():
   - Registra uso de tokens
   - Llama a interactionManager.deductInteraction()
   ↓
5. interactionManager.deductInteraction():
   - Decrementa available_interactions
   - Incrementa consumed_today
   - Crea registro en interaction_logs
   ↓
6. Respuesta al usuario con éxito
```

### Reset automático diario:

```
Cada día a las 00:00 (UTC-3):
1. Función SQL o Job ejecuta reset
2. Para cada usuario:
   - available_interactions = daily_limit
   - consumed_today = 0
   - last_reset = NOW()
3. Registra evento en logs
```

---

## 📡 API Endpoints

### Endpoints Públicos (requieren autenticación)

#### GET `/api/interactions/balance`
Obtener saldo de interacciones del usuario actual.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "available_interactions": 245,
    "consumed_today": 5,
    "daily_limit": 250,
    "last_reset": "2025-11-07T00:00:00Z"
  }
}
```

#### GET `/api/interactions/history?limit=50&offset=0`
Obtener historial de consumo del usuario actual.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "operation_type": "humanize",
        "interactions_deducted": 1,
        "balance_before": 250,
        "balance_after": 249,
        "created_at": "2025-11-07T10:30:00Z"
      }
    ],
    "total": 5,
    "limit": 50,
    "offset": 0
  }
}
```

#### GET `/api/interactions/stats`
Obtener estadísticas de consumo del usuario actual.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "current_balance": 245,
    "consumed_today": 5,
    "daily_limit": 250,
    "last_reset": "2025-11-07T00:00:00Z",
    "total_consumed_all_time": 125,
    "by_operation": [
      {
        "operation_type": "humanize",
        "count": 3,
        "total_deducted": 3
      }
    ]
  }
}
```

#### POST `/api/interactions/validate`
Validar si el usuario tiene interacciones disponibles.

**Body:**
```json
{
  "required_interactions": 1
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "has_balance": true,
    "required_interactions": 1
  }
}
```

### Endpoints Admin (requieren rol admin)

#### GET `/api/admin/interactions?limit=50&offset=0`
Listar todos los usuarios con sus interacciones.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "user_id": "uuid-1",
        "daily_limit": 250,
        "available_interactions": 245,
        "consumed_today": 5,
        "last_reset": "2025-11-07T00:00:00Z"
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

#### GET `/api/admin/interactions/:userId`
Obtener detalles de un usuario específico.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "stats": { ... },
    "recent_history": [ ... ]
  }
}
```

#### POST `/api/admin/interactions/assign`
Asignar interacciones a un usuario.

**Body:**
```json
{
  "userId": "uuid-1",
  "amount": 100
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "new_balance": 345,
    "message": "Interacciones asignadas exitosamente"
  }
}
```

#### PUT `/api/admin/interactions/limit`
Cambiar límite diario global.

**Body:**
```json
{
  "daily_limit": 500
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "setting": {
      "setting_key": "daily_limit",
      "setting_value": "500"
    }
  }
}
```

#### GET `/api/admin/interactions/settings`
Obtener configuración global.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "daily_limit": "250",
    "reset_hour": "0",
    "enabled": "true"
  }
}
```

#### POST `/api/admin/interactions/reset`
Resetear interacciones diarias manualmente.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "users_reset": 42,
    "timestamp": "2025-11-07T00:27:00Z"
  }
}
```

---

## 🛠️ Integración en Operaciones de IA

### Ejemplo: Humanización de Artículos

```javascript
// En newsHumanization.service.js
async humanizeContent(newsId, userId, options = {}) {
  // ... código de humanización ...
  
  // Deducir interacción
  try {
    await interactionManager.deductInteraction(userId, 'news_humanization', {
      news_id: newsId,
      tone: options.tone
    });
  } catch (error) {
    loggers.general.warn('Error deducting interaction:', error);
  }
  
  return result;
}
```

### Ejemplo: Validación antes de operación

```javascript
// En rutas de IA
router.post('/humanize', 
  authenticate,
  validateInteractions,  // Middleware que valida saldo
  controller.humanize
);
```

---

## 📊 Panel de Administrador

El panel de administrador en `/dashboard/admin/interactions` permite:

1. **Ver saldo de todos los usuarios**
   - Tabla con usuario, email, saldo, límite, consumidas hoy
   - Búsqueda y filtrado

2. **Asignar interacciones**
   - Modal para seleccionar usuario y cantidad
   - Confirmación antes de asignar

3. **Ver historial de consumo**
   - Historial detallado por usuario
   - Filtrado por tipo de operación
   - Gráficos de consumo

4. **Configurar límite global**
   - Cambiar límite diario para todos los usuarios
   - Historial de cambios

5. **Resetear manualmente**
   - Botón para resetear interacciones de todos los usuarios
   - Confirmación de seguridad

---

## 🔐 Seguridad

- ✅ Solo admins pueden asignar interacciones
- ✅ Solo admins pueden cambiar configuración global
- ✅ Todas las operaciones se registran en logs
- ✅ Validación de saldo antes de operaciones IA
- ✅ Transacciones atómicas en BD

---

## 📈 Monitoreo

### Métricas disponibles:

- Consumo total por usuario
- Consumo por tipo de operación
- Tendencias de consumo
- Usuarios con saldo bajo
- Picos de consumo

### Alertas:

- Usuario sin interacciones disponibles
- Cambios en configuración global
- Asignaciones manuales de interacciones

---

## 🚀 Próximos Pasos

1. Ejecutar script SQL para crear tablas
2. Reiniciar servidor backend
3. Acceder a `/dashboard/admin/interactions`
4. Configurar límite diario si es necesario
5. Asignar interacciones a usuarios

---

## 📞 Soporte

Para preguntas o problemas:
- Revisar logs en `/api/interactions/history`
- Contactar al administrador del sistema
- Consultar documentación de Chutes AI: https://chutes.ai/docs/api-reference/overview