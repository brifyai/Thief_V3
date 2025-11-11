-- =============================================
-- SETUP SIMPLE Y DIRECTO PARA INTERACCIONES
-- =============================================

-- 1. Eliminar vistas y tablas si existen para empezar limpio
DROP VIEW IF EXISTS daily_interaction_stats;
DROP VIEW IF EXISTS daily_ai_stats;
DROP VIEW IF EXISTS current_balances;

DROP FUNCTION IF EXISTS deduct_interactions(UUID, INTEGER, VARCHAR(50), TEXT);
DROP FUNCTION IF EXISTS get_user_stats(UUID);

DROP TABLE IF EXISTS user_interactions CASCADE;
DROP TABLE IF EXISTS ai_usage_logs CASCADE;
DROP TABLE IF EXISTS user_balances CASCADE;

-- 2. Crear tablas con estructura correcta
CREATE TABLE user_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    balance INTEGER NOT NULL DEFAULT 100,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    operation VARCHAR(50) NOT NULL,
    tokens_used INTEGER NOT NULL,
    cost DECIMAL(10,6) NOT NULL DEFAULT 0,
    model VARCHAR(50) NOT NULL DEFAULT 'unknown',
    response_time INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    tokens_deducted INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices
CREATE INDEX idx_ai_usage_logs_user_created ON ai_usage_logs(user_id, created_at);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX idx_user_interactions_user_created ON user_interactions(user_id, created_at);
CREATE INDEX idx_user_interactions_created_at ON user_interactions(created_at);
CREATE INDEX idx_user_balances_user_id ON user_balances(user_id);

-- 4. Insertar usuarios demo
INSERT INTO user_balances (user_id, balance) 
VALUES 
    ('00000000-0000-0000-0000-000000000001', 100),  -- Demo user
    ('00000000-0000-0000-0000-000000000002', 1000) -- Admin user
ON CONFLICT (user_id) DO NOTHING;

-- 5. Crear vistas simples
CREATE OR REPLACE VIEW daily_ai_stats AS
SELECT 
    DATE(created_at) as date,
    user_id,
    COUNT(*) as total_operations,
    SUM(tokens_used) as total_tokens,
    SUM(cost) as total_cost,
    AVG(response_time) as avg_response_time
FROM ai_usage_logs
GROUP BY DATE(created_at), user_id
ORDER BY date DESC;

CREATE OR REPLACE VIEW daily_interaction_stats AS
SELECT 
    DATE(created_at) as date,
    user_id,
    COUNT(*) as total_interactions,
    SUM(tokens_deducted) as total_tokens_deducted,
    interaction_type
FROM user_interactions
GROUP BY DATE(created_at), user_id, interaction_type
ORDER BY date DESC;

CREATE OR REPLACE VIEW current_balances AS
SELECT 
    user_id,
    balance,
    updated_at
FROM user_balances
ORDER BY balance DESC;

-- 6. Crear funciones simples
CREATE OR REPLACE FUNCTION deduct_interactions(
    p_user_id UUID,
    p_tokens INTEGER,
    p_operation VARCHAR(50),
    p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
BEGIN
    -- Obtener balance actual
    SELECT balance INTO current_balance 
    FROM user_balances 
    WHERE user_id = p_user_id;
    
    -- Verificar si existe el usuario
    IF current_balance IS NULL THEN
        -- Crear usuario con balance inicial
        INSERT INTO user_balances (user_id, balance) 
        VALUES (p_user_id, 100);
        current_balance := 100;
    END IF;
    
    -- Verificar si hay suficientes interacciones
    IF current_balance < p_tokens THEN
        RETURN FALSE;
    END IF;
    
    -- Actualizar balance
    UPDATE user_balances 
    SET balance = balance - p_tokens,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Registrar interacción
    INSERT INTO user_interactions (
        user_id, 
        interaction_type, 
        tokens_deducted, 
        balance_before, 
        balance_after, 
        description
    ) VALUES (
        p_user_id, 
        p_operation, 
        p_tokens, 
        current_balance, 
        current_balance - p_tokens, 
        p_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'current_balance', COALESCE(ub.balance, 0),
        'today_interactions', COALESCE(ui.today_count, 0),
        'today_tokens_used', COALESCE(ai.today_tokens, 0),
        'total_interactions', COALESCE(ui.total_count, 0),
        'total_tokens_used', COALESCE(ai.total_tokens, 0)
    ) INTO result
    FROM user_balances ub
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as today_count,
            SUM(tokens_deducted) as today_tokens
        FROM user_interactions 
        WHERE DATE(created_at) = CURRENT_DATE
        GROUP BY user_id
    ) ui ON ub.user_id = ui.user_id
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as total_count,
            SUM(tokens_used) as total_tokens
        FROM ai_usage_logs 
        GROUP BY user_id
    ) ai ON ub.user_id = ai.user_id
    WHERE ub.user_id = p_user_id;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 7. Insertar datos de prueba
INSERT INTO user_interactions (user_id, interaction_type, tokens_deducted, balance_before, balance_after, description)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'rewrite', 5, 100, 95, 'Reescritura de noticia'),
    ('00000000-0000-0000-0000-000000000001', 'categorize', 3, 95, 92, 'Categorización de contenido'),
    ('00000000-0000-0000-0000-000000000001', 'search', 2, 92, 90, 'Búsqueda inteligente');

INSERT INTO ai_usage_logs (user_id, operation, tokens_used, cost, model, response_time)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'rewrite', 150, 0.0003, 'gpt-3.5-turbo', 1200),
    ('00000000-0000-0000-0000-000000000001', 'categorize', 80, 0.00016, 'gpt-3.5-turbo', 800),
    ('00000000-0000-0000-0000-000000000001', 'search', 60, 0.00012, 'gpt-3.5-turbo', 600);

-- Actualizar balance del usuario demo
UPDATE user_balances 
SET balance = 90 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 8. Verificación final
SELECT 'Setup completado correctamente' as status;

SELECT 'user_balances' as table_name, COUNT(*) as rows FROM user_balances
UNION ALL
SELECT 'ai_usage_logs' as table_name, COUNT(*) as rows FROM ai_usage_logs
UNION ALL
SELECT 'user_interactions' as table_name, COUNT(*) as rows FROM user_interactions;

-- =============================================
-- SETUP SIMPLE COMPLETADO
-- =============================================