-- ============================================
-- SOLUCIÓN DEFINITIVA PARA INTERACCIONES
-- Ejecutar este SQL directamente en el panel de Supabase > SQL Editor
-- ============================================

-- 1. Primero, verificar y crear tablas necesarias con estructura consistente

-- Tabla de configuración de interacciones (user_id como UUID para compatibilidad con users)
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

-- Tabla de logs de interacciones (user_id como UUID)
CREATE TABLE IF NOT EXISTS interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL,
    interactions_deducted INTEGER NOT NULL DEFAULT 1,
    balance_after INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Asegurar que ai_usage_logs tenga las columnas necesarias y user_id como UUID
DO $$
BEGIN
    -- Verificar si ai_usage_logs existe y tiene user_id como integer
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_usage_logs' 
        AND column_name = 'user_id' 
        AND data_type = 'integer'
    ) THEN
        -- La tabla existe con user_id como integer, necesitamos migrar
        RAISE NOTICE '⚠️ Se detectó ai_usage_logs con user_id como integer. Se recomienda migrar a UUID para consistencia.';
        
        -- Opción 1: Crear nueva tabla con estructura correcta
        CREATE TABLE ai_usage_logs_new AS 
        SELECT 
            gen_random_uuid() as id,
            '00000000-0000-0000-0000-000000000001'::uuid as user_id, -- Temporal
            operation_type,
            tokens_used,
            cost_usd,
            input_text,
            output_text,
            model_used,
            created_at,
            metadata
        FROM ai_usage_logs 
        WHERE false; -- Crear estructura vacía
        
        -- Opción 2: Modificar columna existente (más simple pero puede perder datos)
        -- ALTER TABLE ai_usage_logs ALTER COLUMN user_id TYPE UUID USING '00000000-0000-0000-0000-000000000001'::uuid;
        
    ELSE
        -- La tabla no existe o ya tiene la estructura correcta
        CREATE TABLE IF NOT EXISTS ai_usage_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            operation_type VARCHAR(50) NOT NULL,
            tokens_used INTEGER DEFAULT 0,
            cost_usd DECIMAL(10,6) DEFAULT 0,
            input_text TEXT,
            output_text TEXT,
            model_used VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            metadata JSONB DEFAULT '{}'
        );
    END IF;
END $$;

-- 3. Crear funciones SQL para el interaction manager

-- Función para deducir interacción
CREATE OR REPLACE FUNCTION deduct_interaction(
    p_user_id UUID,
    p_operation_type VARCHAR(50),
    p_metadata TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    balance_after INTEGER,
    message TEXT
) AS $$
DECLARE
    v_config user_interaction_configs%ROWTYPE;
    v_new_balance INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Obtener configuración del usuario
    SELECT * INTO v_config 
    FROM user_interaction_configs 
    WHERE user_id = p_user_id;
    
    -- Si no tiene configuración, crear una por defecto
    IF v_config IS NULL THEN
        INSERT INTO user_interaction_configs (user_id, daily_limit, interactions_used_today, last_interaction_date)
        VALUES (p_user_id, 10, 1, v_today)
        RETURNING * INTO v_config;
    ELSE
        -- Resetear si es un nuevo día
        IF v_config.last_interaction_date < v_today THEN
            UPDATE user_interaction_configs 
            SET interactions_used_today = 1, last_interaction_date = v_today
            WHERE user_id = p_user_id
            RETURNING * INTO v_config;
        ELSE
            -- Verificar si tiene interacciones disponibles
            IF v_config.interactions_used_today >= v_config.daily_limit THEN
                RETURN NEXT;
            END IF;
            
            -- Incrementar interacciones usadas
            UPDATE user_interaction_configs 
            SET interactions_used_today = interactions_used_today + 1
            WHERE user_id = p_user_id
            RETURNING * INTO v_config;
        END IF;
    END IF;
    
    -- Calcular nuevo balance
    v_new_balance := v_config.daily_limit - v_config.interactions_used_today;
    
    -- Registrar log de interacción
    INSERT INTO interaction_logs (
        user_id, operation_type, interactions_deducted, balance_after, metadata
    ) VALUES (
        p_user_id, p_operation_type, 1, v_new_balance, p_metadata::jsonb
    );
    
    -- Retornar éxito
    RETURN NEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 0, ERROR::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener balance de usuario
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID)
RETURNS TABLE(
    available_interactions INTEGER,
    consumed_today INTEGER,
    daily_limit INTEGER,
    last_reset TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        GREATEST(0, daily_limit - interactions_used_today) as available_interactions,
        interactions_used_today as consumed_today,
        daily_limit,
        last_interaction_date::timestamp with time zone as last_reset
    FROM user_interaction_configs 
    WHERE user_id = p_user_id;
    
    -- Si no tiene configuración, retornar valores por defecto
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 10 as available_interactions, 0 as consumed_today, 10 as daily_limit, NOW() as last_reset;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_user_interaction_configs_user_id ON user_interaction_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interaction_configs_last_date ON user_interaction_configs(last_interaction_date);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_user_id ON interaction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_at ON interaction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);

-- 5. Crear trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_interaction_configs_updated_at ON user_interaction_configs;
CREATE TRIGGER update_user_interaction_configs_updated_at 
    BEFORE UPDATE ON user_interaction_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Insertar configuraciones para usuarios existentes
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

-- 7. Crear vista para estadísticas combinadas
CREATE OR REPLACE VIEW user_stats_complete AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    u.role,
    COALESCE(uic.daily_limit, 10) as daily_limit,
    COALESCE(uic.interactions_used_today, 0) as interactions_used_today,
    COALESCE(uic.last_interaction_date, CURRENT_DATE) as last_interaction_date,
    COALESCE(daily_ai.tokens_used, 0) as ai_tokens_today,
    COALESCE(daily_ai.operations_count, 0) as ai_operations_today,
    COALESCE(daily_ai.total_cost, 0) as ai_cost_today
FROM users u
LEFT JOIN user_interaction_configs uic ON u.id = uic.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as operations_count,
        COALESCE(SUM(tokens_used), 0) as tokens_used,
        COALESCE(SUM(cost_usd), 0) as total_cost
    FROM ai_usage_logs 
    WHERE created_at >= CURRENT_DATE
    GROUP BY user_id
) daily_ai ON u.id = daily_ai.user_id
WHERE u.is_active = true;

-- 8. Permisos
GRANT ALL ON user_interaction_configs TO authenticated;
GRANT ALL ON interaction_logs TO authenticated;
GRANT ALL ON ai_usage_logs TO authenticated;
GRANT SELECT ON user_stats_complete TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_interaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_balance TO authenticated;

-- 9. Resumen
DO $$
BEGIN
    RAISE NOTICE '✅ Solución definitiva de interacciones implementada';
    RAISE NOTICE '📊 Tablas creadas: user_interaction_configs, interaction_logs';
    RAISE NOTICE '📈 Funciones SQL: deduct_interaction, get_user_balance';
    RAISE NOTICE '👥 Configuraciones creadas para usuarios existentes: %', 
        (SELECT COUNT(*) FROM user_interaction_configs);
    RAISE NOTICE '🔮 Vista creada: user_stats_complete';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Próximos pasos:';
    RAISE NOTICE '1. Reiniciar el servidor backend';
    RAISE NOTICE '2. Probar las operaciones de AI y humanización';
    RAISE NOTICE '3. Verificar estadísticas en el panel admin';
END $$;