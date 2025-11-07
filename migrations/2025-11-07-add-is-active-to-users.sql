-- ============================================
-- Agregar columna is_active a la tabla users
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Garantizar que los valores actuales no queden en NULL
UPDATE users
SET is_active = true
WHERE is_active IS NULL;

-- Índice opcional para consultas por estado
CREATE INDEX IF NOT EXISTS users_is_active_idx ON users(is_active);