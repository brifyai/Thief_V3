-- ========================================
-- SCHEMA: User Interactions Management
-- Gestión de interacciones de Chutes AI
-- ========================================

-- Tabla: user_interactions
-- Almacena el saldo de interacciones por usuario
CREATE TABLE IF NOT EXISTS user_interactions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_limit INT NOT NULL DEFAULT 250,
  available_interactions INT NOT NULL DEFAULT 250,
  consumed_today INT NOT NULL DEFAULT 0,
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_last_reset ON user_interactions(last_reset);

-- Tabla: interaction_logs
-- Historial detallado de consumo de interacciones
CREATE TABLE IF NOT EXISTS interaction_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type VARCHAR(100) NOT NULL,
  interactions_deducted INT NOT NULL DEFAULT 1,
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_interaction_logs_user_id ON interaction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_at ON interaction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_operation_type ON interaction_logs(operation_type);

-- Tabla: interaction_settings
-- Configuración global de interacciones
CREATE TABLE IF NOT EXISTS interaction_settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(500) NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración por defecto
INSERT INTO interaction_settings (setting_key, setting_value, description)
VALUES 
  ('daily_limit', '250', 'Límite diario de interacciones por usuario'),
  ('reset_hour', '0', 'Hora del día (UTC-3) para resetear interacciones'),
  ('enabled', 'true', 'Sistema de interacciones habilitado')
ON CONFLICT (setting_key) DO NOTHING;

-- Función: reset_daily_interactions
-- Resetea las interacciones diarias para todos los usuarios
CREATE OR REPLACE FUNCTION reset_daily_interactions()
RETURNS TABLE(users_reset INT, timestamp_reset TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  v_reset_count INT;
  v_daily_limit INT;
BEGIN
  -- Obtener límite diario de configuración
  SELECT CAST(setting_value AS INT) INTO v_daily_limit
  FROM interaction_settings
  WHERE setting_key = 'daily_limit';
  
  -- Si no existe, usar valor por defecto
  IF v_daily_limit IS NULL THEN
    v_daily_limit := 250;
  END IF;
  
  -- Resetear interacciones
  UPDATE user_interactions
  SET 
    available_interactions = v_daily_limit,
    consumed_today = 0,
    last_reset = NOW(),
    updated_at = NOW()
  WHERE DATE(last_reset AT TIME ZONE 'America/Santiago') < DATE(NOW() AT TIME ZONE 'America/Santiago');
  
  GET DIAGNOSTICS v_reset_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_reset_count, NOW();
END;
$$ LANGUAGE plpgsql;

-- Función: deduct_interaction
-- Deduce una interacción del usuario
CREATE OR REPLACE FUNCTION deduct_interaction(
  p_user_id UUID,
  p_operation_type VARCHAR,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  balance_after INT,
  message VARCHAR
) AS $$
DECLARE
  v_current_balance INT;
  v_balance_before INT;
  v_daily_limit INT;
BEGIN
  -- Obtener límite diario
  SELECT CAST(setting_value AS INT) INTO v_daily_limit
  FROM interaction_settings
  WHERE setting_key = 'daily_limit';
  
  IF v_daily_limit IS NULL THEN
    v_daily_limit := 250;
  END IF;
  
  -- Inicializar usuario si no existe
  INSERT INTO user_interactions (user_id, daily_limit, available_interactions)
  VALUES (p_user_id, v_daily_limit, v_daily_limit)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Obtener saldo actual
  SELECT available_interactions INTO v_current_balance
  FROM user_interactions
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  v_balance_before := v_current_balance;
  
  -- Verificar si hay saldo
  IF v_current_balance <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'No hay interacciones disponibles'::VARCHAR;
    RETURN;
  END IF;
  
  -- Deducir interacción
  UPDATE user_interactions
  SET 
    available_interactions = available_interactions - 1,
    consumed_today = consumed_today + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Registrar en logs
  INSERT INTO interaction_logs (
    user_id,
    operation_type,
    interactions_deducted,
    balance_before,
    balance_after,
    metadata
  )
  VALUES (
    p_user_id,
    p_operation_type,
    1,
    v_balance_before,
    v_balance_before - 1,
    p_metadata
  );
  
  RETURN QUERY SELECT TRUE, v_balance_before - 1, 'Interacción deducida'::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- Función: assign_interactions
-- Asigna interacciones a un usuario (admin)
CREATE OR REPLACE FUNCTION assign_interactions(
  p_user_id UUID,
  p_amount INT,
  p_admin_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance INT,
  message VARCHAR
) AS $$
DECLARE
  v_new_balance INT;
BEGIN
  -- Inicializar usuario si no existe
  INSERT INTO user_interactions (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Asignar interacciones
  UPDATE user_interactions
  SET 
    available_interactions = available_interactions + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING available_interactions INTO v_new_balance;
  
  -- Registrar en logs
  INSERT INTO interaction_logs (
    user_id,
    operation_type,
    interactions_deducted,
    balance_before,
    balance_after,
    metadata
  )
  SELECT 
    p_user_id,
    'admin_assign',
    -p_amount,
    v_new_balance - p_amount,
    v_new_balance,
    jsonb_build_object('admin_id', p_admin_id, 'amount', p_amount)
  WHERE v_new_balance IS NOT NULL;
  
  RETURN QUERY SELECT TRUE, v_new_balance, 'Interacciones asignadas'::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- Función: get_user_balance
-- Obtiene el saldo actual de un usuario
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID)
RETURNS TABLE(
  available_interactions INT,
  consumed_today INT,
  daily_limit INT,
  last_reset TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Inicializar usuario si no existe
  INSERT INTO user_interactions (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN QUERY
  SELECT 
    ui.available_interactions,
    ui.consumed_today,
    ui.daily_limit,
    ui.last_reset
  FROM user_interactions ui
  WHERE ui.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Comentarios de documentación
COMMENT ON TABLE user_interactions IS 'Almacena el saldo de interacciones de Chutes AI por usuario';
COMMENT ON TABLE interaction_logs IS 'Historial detallado de consumo de interacciones';
COMMENT ON TABLE interaction_settings IS 'Configuración global del sistema de interacciones';
COMMENT ON FUNCTION reset_daily_interactions() IS 'Resetea las interacciones diarias para todos los usuarios';
COMMENT ON FUNCTION deduct_interaction(UUID, VARCHAR, JSONB) IS 'Deduce una interacción del usuario';
COMMENT ON FUNCTION assign_interactions(UUID, INT, UUID) IS 'Asigna interacciones a un usuario (admin)';
COMMENT ON FUNCTION get_user_balance(UUID) IS 'Obtiene el saldo actual de un usuario';

-- ========================================
-- DOCUMENTACIÓN: QUÉ CUENTA COMO INTERACCIÓN
-- ========================================
-- Según Chutes AI API, una INTERACCIÓN = 1 llamada a la API
-- Esto incluye:
-- ✅ Humanización de artículos (1 interacción)
-- ✅ Búsqueda semántica (1 interacción)
-- ✅ Categorización de contenido (1 interacción)
-- ✅ Análisis de entidades (1 interacción)
-- ✅ Cualquier otra operación que use IA (1 interacción)
--
-- NO cuenta como interacción:
-- ❌ Lectura de artículos
-- ❌ Navegación en la UI
-- ❌ Operaciones de base de datos sin IA
-- ========================================