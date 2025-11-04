# Configuración de Supabase

Este proyecto usa Supabase como base de datos en lugar de Prisma/PostgreSQL directo.

## Pasos para configurar

### 1. Obtener las credenciales de Supabase

1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard/project/vdmbvordfslrpnbkozig
2. En el menú lateral, ve a **Settings** → **API**
3. Copia las siguientes credenciales:
   - **URL**: Ya está configurada como `https://vdmbvordfslrpnbkozig.supabase.co`
   - **anon/public key**: Esta es la clave pública (SUPABASE_KEY)
   - **service_role key**: Esta es la clave privada para el backend (SUPABASE_SERVICE_ROLE_KEY)

### 2. Configurar variables de entorno

Actualiza tu archivo `.env` en la raíz del proyecto con:

```env
# Supabase
SUPABASE_URL=https://vdmbvordfslrpnbkozig.supabase.co
SUPABASE_KEY=tu_clave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role_aqui
```

### 3. Verificar el esquema de la base de datos

El esquema completo está en el archivo `supabase-schema.sql`. Asegúrate de que la tabla `users` exista con la siguiente estructura:

```sql
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
```

### 4. Cambios realizados

- ✅ **Backend**: Ahora usa Supabase directamente en lugar de Prisma
- ✅ **Autenticación**: Login y registro usan la tabla `users` de Supabase
- ✅ **Sin tokens especiales**: Solo se usa JWT generado en el backend
- ✅ **Contraseñas hasheadas**: bcrypt se usa para hash de contraseñas

### 5. Cómo funciona ahora

1. **Registro**: Crea un usuario en la tabla `users` con contraseña hasheada
2. **Login**: Verifica email/contraseña contra la tabla `users` y genera un JWT
3. **Autenticación**: El JWT se valida en el middleware y se usa para todas las peticiones

### 6. Notas importantes

- **NO** se usa Supabase Auth (auth.users), se usa una tabla custom `users`
- Las contraseñas se hashean con bcrypt antes de guardarlas
- El JWT se genera y valida en el backend con jsonwebtoken
- La service_role_key permite operaciones admin en Supabase
