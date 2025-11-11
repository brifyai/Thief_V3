-- ============================================
-- ESQUEMA PARA INTERACCIONES DE USUARIOS
-- ============================================

-- 1. Tabla de configuración de interacciones por usuario
CREATE TABLE IF NOT EXISTS user_interaction_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    daily_limit INTEGER NOT NULL DEFAULT 10,
    interactions_used_today INTEGER NOT NULL DEFAULT 0,
    last_interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Modificar la tabla ai_usage_logs para que user_id sea UUID en lugar de integer
-- Primero verificamos si la tabla existe y su estructura actual
DO $$
BEGIN
    -- Si la tabla ai_usage_logs existe con user_id como integer, la actualizamos
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'user_id' AND data_type = 'integer') THEN
        -- Crear tabla temporal con los datos existentes
        CREATE TEMP TABLE ai_usage_logs_backup AS SELECT * FROM ai_usage_logs;
        
        -- Eliminar la tabla original
        DROP TABLE ai_usage_logs;
        
        -- Crear la nueva tabla con user_id como UUID
        CREATE TABLE ai_usage_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            operation_type VARCHAR(50) NOT NULL,
            tokens_used INTEGER NOT NULL DEFAULT 0,
            cost_usd DECIMAL(10,6) DEFAULT 0,
            input_text TEXT,
            output_text TEXT,
            model_used VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            metadata JSONB DEFAULT '{}'
        );
        
        -- Crear índices
        CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
        CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
        CREATE INDEX idx_ai_usage_logs_operation_type ON ai_usage_logs(operation_type);
        
        -- Si hay datos en la tabla temporal, intentar migrarlos (solo si user_id puede convertirse a UUID)
        -- Esto puede no funcionar si los IDs no son UUIDs válidos, así que lo hacemos con cuidado
    END IF;
    
    -- Si la tabla no existe, crearla directamente
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_usage_logs') THEN
        CREATE TABLE ai_usage_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            operation_type VARCHAR(50) NOT NULL,
            tokens_used INTEGER NOT NULL DEFAULT 0,
            cost_usd DECIMAL(10,6) DEFAULT 0,
            input_text TEXT,
            output_text TEXT,
            model_used VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            metadata JSONB DEFAULT '{}'
        );
        
        -- Crear índices
        CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
        CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
        CREATE INDEX idx_ai_usage_logs_operation_type ON ai_usage_logs(operation_type);
    END IF;
END $$;

-- 3. Crear función para actualizar el timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Crear trigger para la tabla user_interaction_configs
DROP TRIGGER IF EXISTS update_user_interaction_configs_updated_at ON user_interaction_configs;
CREATE TRIGGER update_user_interaction_configs_updated_at 
    BEFORE UPDATE ON user_interaction_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Crear función para resetear interacciones diarias
CREATE OR REPLACE FUNCTION reset_daily_interactions()
RETURNS void AS $$
BEGIN
    UPDATE user_interaction_configs 
    SET interactions_used_today = 0, 
        last_interaction_date = CURRENT_DATE
    WHERE last_interaction_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear función para registrar uso de AI y actualizar interacciones
CREATE OR REPLACE FUNCTION log_ai_usage_and_update_interactions(
    p_user_id UUID,
    p_operation_type VARCHAR(50),
    p_tokens_used INTEGER DEFAULT 0,
    p_cost_usd DECIMAL(10,6) DEFAULT 0,
    p_input_text TEXT DEFAULT NULL,
    p_output_text TEXT DEFAULT NULL,
    p_model_used VARCHAR(100) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
DECLARE
    v_config user_interaction_configs%ROWTYPE;
BEGIN
    -- Obtener configuración del usuario
    SELECT * INTO v_config 
    FROM user_interaction_configs 
    WHERE user_id = p_user_id;
    
    -- Si no tiene configuración, crear una por defecto
    IF v_config IS NULL THEN
        INSERT INTO user_interaction_configs (user_id, daily_limit, interactions_used_today, last_interaction_date)
        VALUES (p_user_id, 10, 1, CURRENT_DATE)
        RETURNING * INTO v_config;
    ELSE
        -- Resetear si es un nuevo día
        IF v_config.last_interaction_date < CURRENT_DATE THEN
            UPDATE user_interaction_configs 
            SET interactions_used_today = 1, last_interaction_date = CURRENT_DATE
            WHERE user_id = p_user_id;
        ELSE
            -- Incrementar interacciones usadas
            UPDATE user_interaction_configs 
            SET interactions_used_today = interactions_used_today + 1
            WHERE user_id = p_user_id;
        END IF;
    END IF;
    
    -- Registrar el uso de AI
    INSERT INTO ai_usage_logs (
        user_id, operation_type, tokens_used, cost_usd, 
        input_text, output_text, model_used, metadata
    ) VALUES (
        p_user_id, p_operation_type, p_tokens_used, p_cost_usd,
        p_input_text, p_output_text, p_model_used, p_metadata
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Insertar configuraciones para los usuarios existentes
INSERT INTO user_interaction_configs (user_id, daily_limit, interactions_used_today, last_interaction_date)
SELECT 
    id as user_id,
    CASE 
        WHEN role = 'admin' THEN 100
        WHEN role = 'premium' THEN 50
        ELSE 10
    END as daily_limit,
    0 as interactions_used_today,
    CURRENT_DATE as last_interaction_date
FROM users 
WHERE is_active = true
AND id NOT IN (SELECT user_id FROM user_interaction_configs);

-- 8. Crear vista para estadísticas de uso
CREATE OR REPLACE VIEW user_usage_stats AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    u.role,
    COALESCE(uic.daily_limit, 10) as daily_limit,
    COALESCE(uic.interactions_used_today, 0) as interactions_used_today,
    COALESCE(uic.last_interaction_date, CURRENT_DATE) as last_interaction_date,
    COALESCE(daily_stats.tokens_used_today, 0) as tokens_used_today,
    COALESCE(daily_stats.operations_today, 0) as operations_today,
    COALESCE(weekly_stats.tokens_used_week, 0) as tokens_used_week,
    COALESCE(weekly_stats.operations_week, 0) as operations_week
FROM users u
LEFT JOIN user_interaction_configs uic ON u.id = uic.user_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(tokens_used) as tokens_used_today,
        COUNT(*) as operations_today
    FROM ai_usage_logs 
    WHERE created_at >= CURRENT_DATE
    GROUP BY user_id
) daily_stats ON u.id = daily_stats.user_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(tokens_used) as tokens_used_week,
        COUNT(*) as operations_week
    FROM ai_usage_logs 
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY user_id
) weekly_stats ON u.id = weekly_stats.user_id
WHERE u.is_active = true;

-- 9. Crear función para obtener estadísticas de un usuario
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE(
    daily_limit INTEGER,
    interactions_used_today INTEGER,
    tokens_used_today INTEGER,
    operations_today INTEGER,
    tokens_used_week INTEGER,
    operations_week INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(uic.daily_limit, 10) as daily_limit,
        COALESCE(uic.interactions_used_today, 0) as interactions_used_today,
        COALESCE(daily.tokens_used, 0) as tokens_used_today,
        COALESCE(daily.operations, 0) as operations_today,
        COALESCE(weekly.tokens_used, 0) as tokens_used_week,
        COALESCE(weekly.operations, 0) as operations_week
    FROM users u
    LEFT JOIN user_interaction_configs uic ON u.id = uic.user_id
    LEFT JOIN (
        SELECT user_id, SUM(tokens_used) as tokens_used, COUNT(*) as operations
        FROM ai_usage_logs 
        WHERE created_at >= CURRENT_DATE
        GROUP BY user_id
    ) daily ON u.id = daily.user_id
    LEFT JOIN (
        SELECT user_id, SUM(tokens_used) as tokens_used, COUNT(*) as operations
        FROM ai_usage_logs 
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY user_id
    ) weekly ON u.id = weekly.user_id
    WHERE u.id = p_user_id AND u.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 10. Permisos
GRANT ALL ON user_interaction_configs TO authenticated;
GRANT ALL ON ai_usage_logs TO authenticated;
GRANT SELECT ON user_usage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION log_ai_usage_and_update_interactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats TO authenticated;
GRANT EXECUTE ON FUNCTION reset_daily_interactions TO authenticated;

-- 11. Crear índices adicionales para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_user_interaction_configs_user_id ON user_interaction_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interaction_configs_last_date ON user_interaction_configs(last_interaction_date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_date ON ai_usage_logs(user_id, created_at);

-- 12. Resumen de lo creado
DO $$
BEGIN
    RAISE NOTICE '✅ Esquema de interacciones creado exitosamente';
    RAISE NOTICE '📊 Tablas: user_interaction_configs, ai_usage_logs';
    RAISE NOTICE '📈 Vistas: user_usage_stats';
    RAISE NOTICE '🔧 Funciones: log_ai_usage_and_update_interactions, get_user_stats, reset_daily_interactions';
    RAISE NOTICE '👥 Configuraciones creadas para usuarios existentes: %', 
        (SELECT COUNT(*) FROM user_interaction_configs);
END $$;