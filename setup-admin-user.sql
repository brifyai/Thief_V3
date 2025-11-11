-- ============================================
-- CONFIGURAR USUARIO ADMIN
-- ============================================

-- 1. Insertar usuario en la tabla users con rol admin
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES ('a96da5d7-33fa-4768-b963-b3ba8ed72eee', 'camiloalegriabarra@gmail.com', 'Camilo Alegría', 'admin', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET role = 'admin', updated_at = NOW();

-- 2. Verificar que se creó correctamente
SELECT id, email, name, role, created_at
FROM users
WHERE email = 'camiloalegriabarra@gmail.com';