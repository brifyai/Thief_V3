-- =============================================
-- SOLUCIÓN DEFINITIVA PARA ESTADÍSTICAS DE INTERACCIONES
-- =============================================

-- 1. VERIFICAR Y ACTUALIZAR ESTRUCTURA EXISTENTE
-- No eliminamos tablas existentes para preservar datos

-- 2. VERIFICAR Y CREAR ESTRUCTURA DE TABLAS

-- Crear tabla user_balances si no existe (con estructura correcta desde el inicio)
CREATE TABLE IF NOT EXISTS user_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    balance INTEGER NOT NULL DEFAULT 100,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrar datos si existe tabla antigua con estructura diferente
DO $$
BEGIN
    -- Verificar si la tabla ya existe y tiene estructura incorrecta
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_balances')
       AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_balances' AND column_name = 'user_id' AND data_type = 'uuid') THEN
        
        -- Primero renombrar tabla existente
        ALTER TABLE user_balances RENAME TO user_balances_old;
        
        -- Ahora migrar datos desde la tabla renombrada
        INSERT INTO user_balances (user_id, balance, updated_at, created_at)
        SELECT
            CASE
                WHEN user_id::text ~ '^[0-9]+$' THEN ('00000000-0000-0000-0000-' || LPAD(user_id::text, 12, '0'))::uuid
                ELSE COALESCE(user_id::text::uuid, gen_random_uuid())
            END,
            COALESCE(balance, 100),
            COALESCE(updated_at, NOW()),
            COALESCE(created_at, NOW())
        FROM user_balances_old;
    END IF;
END $$;

-- Migrar datos si existe tabla antigua con estructura diferente
DO $$
BEGIN
    -- Verificar si la tabla ya existe y tiene estructura incorrecta
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_usage_logs')
       AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'user_id' AND data_type = 'uuid') THEN
        
        -- Primero renombrar tabla existente
        ALTER TABLE ai_usage_logs RENAME TO ai_usage_logs_old;
        
        -- Crear tabla nueva con estructura correcta
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
        
        -- Ahora migrar datos desde la tabla renombrada
        INSERT INTO ai_usage_logs (user_id, operation, tokens_used, cost, model, response_time, metadata, created_at)
        SELECT
            CASE
                WHEN user_id::text ~ '^[0-9]+$' THEN ('00000000-0000-0000-0000-' || LPAD(user_id::text, 12, '0'))::uuid
                ELSE COALESCE(user_id::text::uuid, gen_random_uuid())
            END,
            COALESCE(operation, COALESCE(operation_id, 'unknown')),
            COALESCE(tokens_used, tokens, 0),
            COALESCE(cost, 0),
            COALESCE(model, 'unknown'),
            response_time,
            metadata,
            COALESCE(created_at, NOW())
        FROM ai_usage_logs_old;
    ELSE
        -- Crear tabla solo si no existe
        CREATE TABLE IF NOT EXISTS ai_usage_logs (
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
    END IF;
END $$;

-- Crear tabla user_interactions si no existe (con estructura correcta desde el inicio)
CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    interaction_type VARCHAR(50) NOT NULL DEFAULT 'unknown',
    tokens_deducted INTEGER NOT NULL DEFAULT 0,
    balance_before INTEGER NOT NULL DEFAULT 0,
    balance_after INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrar datos si existe tabla antigua con estructura diferente
DO $$
BEGIN
    -- Verificar si la tabla ya existe y tiene estructura incorrecta
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_interactions')
       AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'user_id' AND data_type = 'uuid') THEN
        
        -- Primero renombrar tabla existente
        ALTER TABLE user_interactions RENAME TO user_interactions_old;
        
        -- Ahora migrar datos desde la tabla renombrada
        INSERT INTO user_interactions (user_id, interaction_type, tokens_deducted, balance_before, balance_after, description, metadata, created_at)
        SELECT
            CASE
                WHEN user_id::text ~ '^[0-9]+$' THEN ('00000000-0000-0000-0000-' || LPAD(user_id::text, 12, '0'))::uuid
                ELSE COALESCE(user_id::text::uuid, gen_random_uuid())
            END,
            COALESCE(interaction_type, COALESCE(interaction_type_id, COALESCE(type, 'unknown'))),
            COALESCE(tokens_deducted, tokens, 0),
            COALESCE(balance_before, 0),
            COALESCE(balance_after, 0),
            description,
            metadata,
            COALESCE(created_at, NOW())
        FROM user_interactions_old;
    END IF;
END $$;

-- 3. CREAR ÍNDICES OPTIMIZADOS
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created ON ai_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_created ON user_interactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);

-- 4. CONFIGURAR USUARIOS DEMO CON UUIDS (solo si no existen)

-- Usuario demo con UUID fijo
INSERT INTO user_balances (user_id, balance)
VALUES ('00000000-0000-0000-0000-000000000001', 100)
ON CONFLICT (user_id) DO NOTHING;

-- Usuario admin con UUID fijo
INSERT INTO user_balances (user_id, balance)
VALUES ('00000000-0000-0000-0000-000000000002', 1000)
ON CONFLICT (user_id) DO NOTHING;

-- 5. VISTAS PARA ESTADÍSTICAS EN TIEMPO REAL

-- Vista de estadísticas diarias de IA (adaptada a columnas existentes)
DO $$
DECLARE
    has_tokens_used BOOLEAN := FALSE;
    has_tokens BOOLEAN := FALSE;
    has_cost BOOLEAN := FALSE;
    has_response_time BOOLEAN := FALSE;
    has_operation BOOLEAN := FALSE;
    has_operation_id BOOLEAN := FALSE;
    view_sql TEXT;
BEGIN
    -- Verificar qué columnas existen realmente
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'tokens_used') INTO has_tokens_used;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'tokens') INTO has_tokens;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'cost') INTO has_cost;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'response_time') INTO has_response_time;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'operation') INTO has_operation;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'operation_id') INTO has_operation_id;
    
    -- Construir vista dinámica
    view_sql := 'CREATE OR REPLACE VIEW daily_ai_stats AS SELECT DATE(created_at) as date, user_id, COUNT(*) as total_operations, ';
    
    -- Agregar columna de tokens si existe
    IF has_tokens_used THEN
        view_sql := view_sql || 'SUM(tokens_used) as total_tokens, ';
    ELSIF has_tokens THEN
        view_sql := view_sql || 'SUM(tokens) as total_tokens, ';
    ELSE
        view_sql := view_sql || '0 as total_tokens, ';
    END IF;
    
    -- Agregar columna de costo si existe
    IF has_cost THEN
        view_sql := view_sql || 'SUM(cost) as total_cost, ';
    ELSE
        view_sql := view_sql || '0 as total_cost, ';
    END IF;
    
    -- Agregar columna de response_time si existe
    IF has_response_time THEN
        view_sql := view_sql || 'AVG(CASE WHEN response_time ~ ''^[0-9]+$'' THEN response_time::integer ELSE NULL END) as avg_response_time ';
    ELSE
        view_sql := view_sql || 'NULL as avg_response_time ';
    END IF;
    
    view_sql := view_sql || 'FROM ai_usage_logs GROUP BY DATE(created_at), user_id ORDER BY date DESC';
    
    -- Ejecutar creación de vista
    EXECUTE view_sql;
END $$;

-- Vista de estadísticas diarias de interacciones (adaptada a columnas existentes)
DO $$
DECLARE
    has_tokens_deducted BOOLEAN := FALSE;
    has_tokens BOOLEAN := FALSE;
    has_interaction_type BOOLEAN := FALSE;
    has_interaction_type_id BOOLEAN := FALSE;
    has_type BOOLEAN := FALSE;
    view_sql TEXT;
BEGIN
    -- Verificar qué columnas existen realmente
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'tokens_deducted') INTO has_tokens_deducted;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'tokens') INTO has_tokens;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'interaction_type') INTO has_interaction_type;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'interaction_type_id') INTO has_interaction_type_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_interactions' AND column_name = 'type') INTO has_type;
    
    -- Construir vista dinámica
    view_sql := 'CREATE OR REPLACE VIEW daily_interaction_stats AS SELECT DATE(created_at) as date, user_id, COUNT(*) as total_interactions, ';
    
    -- Agregar columna de tokens si existe
    IF has_tokens_deducted THEN
        view_sql := view_sql || 'SUM(CASE WHEN tokens_deducted ~ ''^[0-9]+$'' THEN tokens_deducted::integer ELSE 0 END) as total_tokens_deducted, ';
    ELSIF has_tokens THEN
        view_sql := view_sql || 'SUM(CASE WHEN tokens ~ ''^[0-9]+$'' THEN tokens::integer ELSE 0 END) as total_tokens_deducted, ';
    ELSE
        view_sql := view_sql || '0 as total_tokens_deducted, ';
    END IF;
    
    -- Agregar columna de tipo de interacción
    IF has_interaction_type THEN
        view_sql := view_sql || 'interaction_type ';
    ELSIF has_interaction_type_id THEN
        view_sql := view_sql || 'interaction_type_id as interaction_type ';
    ELSIF has_type THEN
        view_sql := view_sql || 'type as interaction_type ';
    ELSE
        view_sql := view_sql || '''unknown'' as interaction_type ';
    END IF;
    
    view_sql := view_sql || 'FROM user_interactions GROUP BY DATE(created_at), user_id, ';
    
    -- Agregar agrupación por tipo de interacción
    IF has_interaction_type THEN
        view_sql := view_sql || 'interaction_type ';
    ELSIF has_interaction_type_id THEN
        view_sql := view_sql || 'interaction_type_id ';
    ELSIF has_type THEN
        view_sql := view_sql || 'type ';
    ELSE
        view_sql := view_sql || '''unknown'' ';
    END IF;
    
    view_sql := view_sql || 'ORDER BY date DESC';
    
    -- Ejecutar creación de vista
    EXECUTE view_sql;
END $$;

-- Vista de balances actuales
CREATE OR REPLACE VIEW current_balances AS
SELECT 
    user_id,
    balance,
    updated_at
FROM user_balances
ORDER BY balance DESC;

-- 6. FUNCIONES PARA GESTIÓN DE INTERACCIONES

-- Función para deducir interacciones
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

-- Función para obtener estadísticas de usuario
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

-- 7. DATOS DE PRUEBA (solo si no existen datos)

-- Insertar datos de prueba solo si no hay interacciones para el usuario demo
INSERT INTO user_interactions (user_id, interaction_type, tokens_deducted, balance_before, balance_after, description)
SELECT
    '00000000-0000-0000-0000-000000000001',
    'rewrite',
    5,
    100,
    95,
    'Reescritura de noticia'
WHERE NOT EXISTS (
    SELECT 1 FROM user_interactions
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
    LIMIT 1
);

INSERT INTO user_interactions (user_id, interaction_type, tokens_deducted, balance_before, balance_after, description)
SELECT
    '00000000-0000-0000-0000-000000000001',
    'categorize',
    3,
    95,
    92,
    'Categorización de contenido'
WHERE NOT EXISTS (
    SELECT 1 FROM user_interactions
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
    AND interaction_type = 'categorize'
    LIMIT 1
);

INSERT INTO user_interactions (user_id, interaction_type, tokens_deducted, balance_before, balance_after, description)
SELECT
    '00000000-0000-0000-0000-000000000001',
    'search',
    2,
    92,
    90,
    'Búsqueda inteligente'
WHERE NOT EXISTS (
    SELECT 1 FROM user_interactions
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
    AND interaction_type = 'search'
    LIMIT 1
);

-- Insertar logs de IA de prueba solo si no existen
INSERT INTO ai_usage_logs (user_id, operation, tokens_used, cost, model, response_time)
SELECT
    '00000000-0000-0000-0000-000000000001',
    'rewrite',
    150,
    0.0003,
    'gpt-3.5-turbo',
    1200
WHERE NOT EXISTS (
    SELECT 1 FROM ai_usage_logs
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
    AND operation = 'rewrite'
    LIMIT 1
);

INSERT INTO ai_usage_logs (user_id, operation, tokens_used, cost, model, response_time)
SELECT
    '00000000-0000-0000-0000-000000000001',
    'categorize',
    80,
    0.00016,
    'gpt-3.5-turbo',
    800
WHERE NOT EXISTS (
    SELECT 1 FROM ai_usage_logs
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
    AND operation = 'categorize'
    LIMIT 1
);

INSERT INTO ai_usage_logs (user_id, operation, tokens_used, cost, model, response_time)
SELECT
    '00000000-0000-0000-0000-000000000001',
    'search',
    60,
    0.00012,
    'gpt-3.5-turbo',
    600
WHERE NOT EXISTS (
    SELECT 1 FROM ai_usage_logs
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
    AND operation = 'search'
    LIMIT 1
);

-- Actualizar balance del usuario demo solo si no ha sido actualizado
UPDATE user_balances
SET balance = 90
WHERE user_id = '00000000-0000-0000-0000-000000000001'
AND balance = 100;

-- 8. VERIFICACIÓN

-- Verificar configuración
SELECT 'user_balances' as table_name, COUNT(*) as rows FROM user_balances
UNION ALL
SELECT 'ai_usage_logs' as table_name, COUNT(*) as rows FROM ai_usage_logs
UNION ALL
SELECT 'user_interactions' as table_name, COUNT(*) as rows FROM user_interactions;

-- Verificar usuarios configurados
SELECT user_id, balance, updated_at FROM user_balances ORDER BY user_id;

-- Verificar estadísticas del día
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_interactions,
    SUM(tokens_deducted) as total_tokens
FROM user_interactions 
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Verificar vista de estadísticas diarias
SELECT * FROM daily_ai_stats LIMIT 5;

-- Verificar función de estadísticas
SELECT get_user_stats('00000000-0000-0000-0000-000000000001') as demo_user_stats;

-- =============================================
-- CONFIGURACIÓN COMPLETA
-- =============================================