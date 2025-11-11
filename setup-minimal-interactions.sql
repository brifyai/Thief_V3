-- ============================================
-- ESQUEMA MÍNIMO PARA INTERACCIONES (compatible con estructura existente)
-- ============================================

-- 1. Crear tabla de configuración de interacciones por usuario
-- NOTA: user_id es INTEGER para compatibilidad con ai_usage_logs existente
CREATE TABLE IF NOT EXISTS user_interaction_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    daily_limit INTEGER NOT NULL DEFAULT 10,
    interactions_used_today INTEGER NOT NULL DEFAULT 0,
    last_interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Agregar columnas faltantes a ai_usage_logs (si no existen)
-- Usar ALTER TABLE IF EXISTS para evitar errores
DO $$
BEGIN
    -- Agregar tokens_used si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'tokens_used') THEN
        ALTER TABLE ai_usage_logs ADD COLUMN tokens_used INTEGER DEFAULT 0;
    END IF;
    
    -- Agregar cost_usd si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'cost_usd') THEN
        ALTER TABLE ai_usage_logs ADD COLUMN cost_usd DECIMAL(10,6) DEFAULT 0;
    END IF;
    
    -- Agregar input_text si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'input_text') THEN
        ALTER TABLE ai_usage_logs ADD COLUMN input_text TEXT;
    END IF;
    
    -- Agregar output_text si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'output_text') THEN
        ALTER TABLE ai_usage_logs ADD COLUMN output_text TEXT;
    END IF;
    
    -- Agregar metadata si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'metadata') THEN
        ALTER TABLE ai_usage_logs ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- 3. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_user_interaction_configs_user_id ON user_interaction_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interaction_configs_last_date ON user_interaction_configs(last_interaction_date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_operation_type ON ai_usage_logs(operation_type);

-- 4. Crear función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Crear trigger para user_interaction_configs
DROP TRIGGER IF EXISTS update_user_interaction_configs_updated_at ON user_interaction_configs;
CREATE TRIGGER update_user_interaction_configs_updated_at 
    BEFORE UPDATE ON user_interaction_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Crear función simple para registrar uso de AI
CREATE OR REPLACE FUNCTION log_ai_usage_simple(
    p_user_id INTEGER,
    p_operation_type VARCHAR(50),
    p_tokens_used INTEGER DEFAULT 0,
    p_cost_usd DECIMAL(10,6) DEFAULT 0,
    p_input_text TEXT DEFAULT NULL,
    p_output_text TEXT DEFAULT NULL,
    p_model_used VARCHAR(100) DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Insertar en ai_usage_logs
    INSERT INTO ai_usage_logs (
        user_id, operation_type, tokens_used, cost_usd, 
        input_text, output_text, model_used
    ) VALUES (
        p_user_id, p_operation_type, p_tokens_used, p_cost_usd,
        p_input_text, p_output_text, p_model_used
    );
    
    -- Actualizar o crear configuración de interacciones
    INSERT INTO user_interaction_configs (user_id, daily_limit, interactions_used_today, last_interaction_date)
    VALUES (p_user_id, 10, 1, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET
        interactions_used_today = CASE 
            WHEN user_interaction_configs.last_interaction_date < CURRENT_DATE 
            THEN 1 
            ELSE user_interaction_configs.interactions_used_today + 1 
        END,
        last_interaction_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 7. Insertar configuraciones para usuarios existentes
-- NOTA: Usamos los IDs reales de los usuarios como INTEGER
INSERT INTO user_interaction_configs (user_id, daily_limit, interactions_used_today, last_interaction_date)
SELECT 
    -- Convertir UUID a INTEGER (esto es un workaround, en producción deberían ser consistentes)
    -- Por ahora usamos un hash simple del UUID
    (hashtext(id::text) & 2147483647) as user_id,
    CASE 
        WHEN role = 'admin' THEN 100
        WHEN role = 'premium' THEN 50
        ELSE 10
    END as daily_limit,
    0 as interactions_used_today,
    CURRENT_DATE as last_interaction_date
FROM users 
WHERE is_active = true
AND (hashtext(id::text) & 2147483647) NOT IN (SELECT user_id FROM user_interaction_configs);

-- 8. Crear vista para estadísticas
CREATE OR REPLACE VIEW user_usage_stats_simple AS
SELECT 
    (hashtext(u.id::text) & 2147483647) as user_id,
    u.name,
    u.email,
    u.role,
    COALESCE(uic.daily_limit, 10) as daily_limit,
    COALESCE(uic.interactions_used_today, 0) as interactions_used_today,
    COALESCE(uic.last_interaction_date, CURRENT_DATE) as last_interaction_date,
    COALESCE(daily_stats.tokens_today, 0) as tokens_today,
    COALESCE(daily_stats.operations_today, 0) as operations_today
FROM users u
LEFT JOIN user_interaction_configs uic ON (hashtext(u.id::text) & 2147483647) = uic.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COALESCE(SUM(tokens_used), 0) as tokens_today,
        COUNT(*) as operations_today
    FROM ai_usage_logs 
    WHERE created_at >= CURRENT_DATE
    GROUP BY user_id
) daily_stats ON (hashtext(u.id::text) & 2147483647) = daily_stats.user_id
WHERE u.is_active = true;

-- 9. Permisos
GRANT ALL ON user_interaction_configs TO authenticated;
GRANT ALL ON ai_usage_logs TO authenticated;
GRANT SELECT ON user_usage_stats_simple TO authenticated;
GRANT EXECUTE ON FUNCTION log_ai_usage_simple TO authenticated;

-- 10. Resumen
DO $$
BEGIN
    RAISE NOTICE '✅ Esquema mínimo de interacciones creado';
    RAISE NOTICE '📊 Tabla: user_interaction_configs (user_id como INTEGER)';
    RAISE NOTICE '📈 Columnas agregadas a ai_usage_logs: tokens_used, cost_usd, input_text, output_text, metadata';
    RAISE NOTICE '📋 Vista: user_usage_stats_simple';
    RAISE NOTICE '🔧 Función: log_ai_usage_simple';
    RAISE NOTICE '👥 Configuraciones creadas para usuarios existentes';
END $$;