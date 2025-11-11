-- ============================================
-- CORREGIR ESQUEMA DE TABLA USERS
-- ============================================

-- 1. Eliminar la tabla users actual si existe (con cuidado)
DROP TABLE IF EXISTS users CASCADE;

-- 2. Crear la tabla users con el esquema correcto
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices para mejorar el rendimiento
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- 4. Insertar el usuario admin
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES ('a96da5d7-33fa-4768-b963-b3ba8ed72eee', 'camiloalegriabarra@gmail.com', 'Camilo Alegría', 'admin', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET role = 'admin', name = 'Camilo Alegría', updated_at = NOW();

-- 5. Verificar que se creó correctamente
SELECT id, email, name, role, created_at
FROM users
WHERE email = 'camiloalegriabarra@gmail.com';