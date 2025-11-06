-- =====================================================
-- ESQUEMA DE BASE DE DATOS PARA NOTICIAS HUMANIZADAS
-- Sistema de Gestión de Noticias AI Web Scraper
-- =====================================================

-- Tabla principal de noticias humanizadas
CREATE TABLE IF NOT EXISTS news_humanized (
    id SERIAL PRIMARY KEY,
    original_news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    humanized_content TEXT NOT NULL,
    url TEXT NOT NULL,
    source TEXT NOT NULL,
    domain TEXT NOT NULL,
    author TEXT,
    published_at TIMESTAMP,
    scraped_at TIMESTAMP,
    humanized_at TIMESTAMP DEFAULT NOW(),
    
    -- Configuración de humanización
    tone TEXT DEFAULT 'professional',
    style TEXT DEFAULT 'detailed', 
    complexity TEXT DEFAULT 'intermediate',
    target_audience TEXT DEFAULT 'general',
    preserve_facts BOOLEAN DEFAULT true,
    max_length INTEGER DEFAULT 500,
    
    -- Métricas de calidad
    original_readability_score REAL,
    humanized_readability_score REAL,
    readability_improvement REAL,
    word_count_original INTEGER,
    word_count_humanized INTEGER,
    content_similarity REAL,
    
    -- Costo de humanización
    ai_model_used TEXT DEFAULT 'GLM-4.6',
    humanization_cost DECIMAL(10, 6),
    tokens_used INTEGER,
    
    -- Estados
    status TEXT DEFAULT 'active', -- active, archived, deleted
    is_ready_for_use BOOLEAN DEFAULT true,
    review_status TEXT DEFAULT 'approved', -- pending, approved, rejected
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by TEXT,
    
    -- Índices para optimización
    CONSTRAINT unique_humanization UNIQUE(original_news_id, tone, style, complexity)
);

-- Tabla de versiones de humanización
CREATE TABLE IF NOT EXISTS news_humanization_versions (
    id SERIAL PRIMARY KEY,
    humanized_news_id INTEGER REFERENCES news_humanized(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    humanized_content TEXT NOT NULL,
    
    -- Configuración de esta versión
    tone TEXT NOT NULL,
    style TEXT NOT NULL,
    complexity TEXT NOT NULL,
    target_audience TEXT DEFAULT 'general',
    
    -- Métricas
    readability_score REAL,
    word_count INTEGER,
    change_percentage REAL,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_version UNIQUE(humanized_news_id, version_number)
);

-- Tabla de selección de noticias humanizadas por usuarios
CREATE TABLE IF NOT EXISTS user_selected_humanized_news (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    humanized_news_id INTEGER REFERENCES news_humanized(id) ON DELETE CASCADE,
    selection_type TEXT DEFAULT 'manual', -- manual, batch, auto
    selected_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, humanized_news_id)
);

-- Tabla de categorías para noticias humanizadas
CREATE TABLE IF NOT EXISTS news_humanized_categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de relaciones noticias-categorías humanizadas
CREATE TABLE IF NOT EXISTS news_humanized_category_relations (
    id SERIAL PRIMARY KEY,
    humanized_news_id INTEGER REFERENCES news_humanized(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES news_humanized_categories(id) ON DELETE CASCADE,
    
    UNIQUE(humanized_news_id, category_id)
);

-- Tabla de etiquetas para noticias humanizadas
CREATE TABLE IF NOT EXISTS news_humanized_tags (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de relaciones noticias-etiquetas humanizadas
CREATE TABLE IF NOT EXISTS news_humanized_tag_relations (
    id SERIAL PRIMARY KEY,
    humanized_news_id INTEGER REFERENCES news_humanized(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES news_humanized_tags(id) ON DELETE CASCADE,
    
    UNIQUE(humanized_news_id, tag_id)
);

-- Tabla de estadísticas de uso
CREATE TABLE IF NOT EXISTS humanized_news_usage_stats (
    id SERIAL PRIMARY KEY,
    humanized_news_id INTEGER REFERENCES news_humanized(id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(humanized_news_id)
);

-- Tabla de configuraciones de humanización por defecto
CREATE TABLE IF NOT EXISTS humanization_defaults (
    id SERIAL PRIMARY KEY,
    user_id TEXT UNIQUE,
    default_tone TEXT DEFAULT 'professional',
    default_style TEXT DEFAULT 'detailed',
    default_complexity TEXT DEFAULT 'intermediate',
    default_audience TEXT DEFAULT 'general',
    preserve_facts BOOLEAN DEFAULT true,
    auto_approve BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de queue para procesamiento en lote
CREATE TABLE IF NOT EXISTS humanization_batch_queue (
    id SERIAL PRIMARY KEY,
    batch_id UUID DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    news_ids INTEGER[] NOT NULL, -- Array de IDs de noticias originales
    operation_type TEXT NOT NULL, -- 'humanize' o 'reprocess'
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    
    -- Configuración
    tone TEXT DEFAULT 'professional',
    style TEXT DEFAULT 'detailed',
    complexity TEXT DEFAULT 'intermediate',
    preserve_facts BOOLEAN DEFAULT true,
    
    -- Resultado
    processed_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    errors TEXT[], -- Array de errores
    
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Tabla de resultados de procesamiento en lote
CREATE TABLE IF NOT EXISTS humanization_batch_results (
    id SERIAL PRIMARY KEY,
    batch_id UUID REFERENCES humanization_batch_queue(batch_id) ON DELETE CASCADE,
    original_news_id INTEGER,
    humanized_news_id INTEGER,
    status TEXT NOT NULL, -- 'success', 'failed', 'skipped'
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para news_humanized
CREATE INDEX IF NOT EXISTS idx_humanized_original_news_id ON news_humanized(original_news_id);
CREATE INDEX IF NOT EXISTS idx_humanized_status ON news_humanized(status);
CREATE INDEX IF NOT EXISTS idx_humanized_ready_for_use ON news_humanized(is_ready_for_use);
CREATE INDEX IF NOT EXISTS idx_humanized_created_at ON news_humanized(created_at);
CREATE INDEX IF NOT EXISTS idx_humanized_source ON news_humanized(source);
CREATE INDEX IF NOT EXISTS idx_humanized_domain ON news_humanized(domain);
CREATE INDEX IF NOT EXISTS idx_humanized_humanized_at ON news_humanized(humanized_at);
CREATE INDEX IF NOT EXISTS idx_humanized_tone ON news_humanized(tone);
CREATE INDEX IF NOT EXISTS idx_humanized_style ON news_humanized(style);
CREATE INDEX IF NOT EXISTS idx_humanized_complexity ON news_humanized(complexity);

-- Índices para versiones
CREATE INDEX IF NOT EXISTS idx_versions_humanized_news_id ON news_humanization_versions(humanized_news_id);
CREATE INDEX IF NOT EXISTS idx_versions_version_number ON news_humanization_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_versions_created_at ON news_humanization_versions(created_at);

-- Índices para selecciones de usuarios
CREATE INDEX IF NOT EXISTS idx_selected_user_id ON user_selected_humanized_news(user_id);
CREATE INDEX IF NOT EXISTS idx_selected_humanized_news_id ON user_selected_humanized_news(humanized_news_id);
CREATE INDEX IF NOT EXISTS idx_selected_selection_type ON user_selected_humanized_news(selection_type);

-- Índices para categorías
CREATE INDEX IF NOT EXISTS idx_categories_name ON news_humanized_categories(name);
CREATE INDEX IF NOT EXISTS idx_relations_humanized_news_id ON news_humanized_category_relations(humanized_news_id);
CREATE INDEX IF NOT EXISTS idx_relations_category_id ON news_humanized_category_relations(category_id);

-- Índices para etiquetas
CREATE INDEX IF NOT EXISTS idx_tags_name ON news_humanized_tags(name);
CREATE INDEX IF NOT EXISTS idx_tag_relations_humanized_news_id ON news_humanized_tag_relations(humanized_news_id);
CREATE INDEX IF NOT EXISTS idx_tag_relations_tag_id ON news_humanized_tag_relations(tag_id);

-- Índices para estadísticas
CREATE INDEX IF NOT EXISTS idx_usage_stats_humanized_news_id ON humanized_news_usage_stats(humanized_news_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_view_count ON humanized_news_usage_stats(view_count);
CREATE INDEX IF NOT EXISTS idx_usage_stats_last_accessed ON humanized_news_usage_stats(last_accessed);

-- Índices para configuraciones
CREATE INDEX IF NOT EXISTS idx_defaults_user_id ON humanization_defaults(user_id);

-- Índices para queue de batch
CREATE INDEX IF NOT EXISTS idx_batch_queue_batch_id ON humanization_batch_queue(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_queue_user_id ON humanization_batch_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_queue_status ON humanization_batch_queue(status);
CREATE INDEX IF NOT EXISTS idx_batch_queue_created_at ON humanization_batch_queue(created_at);

-- Índices para resultados de batch
CREATE INDEX IF NOT EXISTS idx_batch_results_batch_id ON humanization_batch_results(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_results_original_news_id ON humanization_batch_results(original_news_id);
CREATE INDEX IF NOT EXISTS idx_batch_results_status ON humanization_batch_results(status);

-- =====================================================
-- TRIGGERS PARA AUTOMATIZACIÓN
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a tablas relevantes
CREATE TRIGGER update_humanized_news_updated_at BEFORE UPDATE ON news_humanized
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_defaults_updated_at BEFORE UPDATE ON humanization_defaults
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_stats_updated_at BEFORE UPDATE ON humanized_news_usage_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para incrementar contador de uso de etiquetas
CREATE OR REPLACE FUNCTION increment_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE news_humanized_tags 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.tag_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_tag_usage_trigger AFTER INSERT ON news_humanized_tag_relations
    FOR EACH ROW EXECUTE FUNCTION increment_tag_usage();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de noticias humanizadas con información completa
CREATE OR REPLACE VIEW v_news_humanized_complete AS
SELECT 
    hn.*,
    -- Categorías
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'id', nc.id,
            'name', nc.name,
            'color', nc.color
        ) ORDER BY nc.name) FILTER (WHERE nc.id IS NOT NULL),
        '[]'::json
    ) as categories,
    
    -- Etiquetas
    COALESCE(
        json_agg(DISTINCT nht.name) FILTER (WHERE nht.name IS NOT NULL),
        '[]'::json
    ) as tags,
    
    -- Estadísticas de uso
    us.view_count,
    us.download_count,
    us.share_count,
    us.last_accessed,
    
    -- Última versión
    (
        SELECT hn2.version_number 
        FROM news_humanization_versions hn2 
        WHERE hn2.humanized_news_id = hn.id 
        ORDER BY hn2.version_number DESC 
        LIMIT 1
    ) as latest_version,
    
    -- Número de versiones
    (
        SELECT COUNT(*) 
        FROM news_humanization_versions hn2 
        WHERE hn2.humanized_news_id = hn.id
    ) as version_count

FROM news_humanized hn
LEFT JOIN news_humanized_category_relations hncr ON hn.id = hncr.humanized_news_id
LEFT JOIN news_humanized_categories nc ON hncr.category_id = nc.id
LEFT JOIN news_humanized_tag_relations hntr ON hn.id = hntr.humanized_news_id
LEFT JOIN news_humanized_tags nht ON hntr.tag_id = nht.id
LEFT JOIN humanized_news_usage_stats us ON hn.id = us.humanized_news_id
GROUP BY hn.id, us.view_count, us.download_count, us.share_count, us.last_accessed;

-- Vista de estadísticas generales
CREATE OR REPLACE VIEW v_humanized_stats AS
SELECT 
    COUNT(*) as total_humanized,
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    COUNT(*) FILTER (WHERE is_ready_for_use = true) as ready_count,
    COUNT(*) FILTER (WHERE review_status = 'approved') as approved_count,
    COUNT(DISTINCT source) as total_sources,
    COUNT(DISTINCT domain) as total_domains,
    AVG(readability_improvement) as avg_readability_improvement,
    SUM(humanization_cost) as total_cost,
    AVG(humanization_cost) as avg_cost,
    SUM(tokens_used) as total_tokens
FROM news_humanized;

-- Vista de noticias por categoría
CREATE OR REPLACE VIEW v_news_by_category AS
SELECT 
    nc.name as category,
    nc.color,
    COUNT(hn.id) as count,
    COUNT(hn.id) FILTER (WHERE hn.is_ready_for_use = true) as ready_count,
    AVG(hn.readability_improvement) as avg_readability_improvement
FROM news_humanized_categories nc
LEFT JOIN news_humanized_category_relations hncr ON nc.id = hncr.category_id
LEFT JOIN news_humanized hn ON hncr.humanized_news_id = hn.id AND hn.status = 'active'
GROUP BY nc.id, nc.name, nc.color
ORDER BY count DESC;

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar categorías por defecto
INSERT INTO news_humanized_categories (name, description, color) VALUES
('Tecnología', 'Noticias sobre tecnología e innovación', '#3B82F6'),
('Economía', 'Noticias económicas y financieras', '#10B981'),
('Política', 'Noticias políticas y gubernamentales', '#F59E0B'),
('Deportes', 'Noticias deportivas', '#EF4444'),
('Cultura', 'Noticias culturales y entretenimiento', '#8B5CF6'),
('Internacional', 'Noticias internacionales', '#06B6D4'),
('Ciencia', 'Noticias científicas', '#84CC16'),
('Sociedad', 'Noticias sociales y comunitarias', '#F97316')
ON CONFLICT (name) DO NOTHING;

-- Insertar etiquetas populares
INSERT INTO news_humanized_tags (name) VALUES
('tecnología'), ('inteligencia-artificial'), ('chile'),
('economía'), ('banco-central'), ('inflación'),
('política'), ('gobierno'), ('congreso'),
('deportes'), ('fútbol'), ('selección'),
('cultura'), ('arte'), ('música'),
('internacional'), ('estados-unidos'), ('europa'),
('ciencia'), ('investigación'), ('descubrimiento'),
('sociedad'), ('educación'), ('salud')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- PERMISOS DE SEGURIDAD
-- =====================================================

-- Habilitar Row Level Security (RLS)
ALTER TABLE news_humanized ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_selected_humanized_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE humanized_news_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE humanization_defaults ENABLE ROW LEVEL SECURITY;

-- Políticas para acceso a noticias humanizadas
CREATE POLICY "Noticias humanizadas son públicas" ON news_humanized
    FOR SELECT USING (status = 'active' AND is_ready_for_use = true);

CREATE POLICY "Usuarios pueden ver sus noticias seleccionadas" ON user_selected_humanized_news
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Usuarios pueden gestionar sus selecciones" ON user_selected_humanized_news
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Usuarios pueden ver sus configuraciones" ON humanization_defaults
    FOR ALL USING (auth.uid()::text = user_id);

-- =====================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para obtener noticias humanizadas con filtros
CREATE OR REPLACE FUNCTION get_humanized_news(
    filter_status TEXT DEFAULT 'active',
    filter_ready BOOLEAN DEFAULT true,
    filter_source TEXT DEFAULT NULL,
    filter_domain TEXT DEFAULT NULL,
    filter_tone TEXT DEFAULT NULL,
    filter_style TEXT DEFAULT NULL,
    page_number INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    content TEXT,
    humanized_content TEXT,
    url TEXT,
    source TEXT,
    domain TEXT,
    humanized_at TIMESTAMP,
    tone TEXT,
    style TEXT,
    complexity TEXT,
    readability_improvement REAL,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.title,
        v.content,
        v.humanized_content,
        v.url,
        v.source,
        v.domain,
        v.humanized_at,
        v.tone,
        v.style,
        v.complexity,
        v.readability_improvement,
        COUNT(*) OVER() as total_count
    FROM v_news_humanized_complete v
    WHERE 
        (filter_status IS NULL OR v.status = filter_status)
        AND (filter_ready IS NULL OR v.is_ready_for_use = filter_ready)
        AND (filter_source IS NULL OR v.source ILIKE '%' || filter_source || '%')
        AND (filter_domain IS NULL OR v.domain ILIKE '%' || filter_domain || '%')
        AND (filter_tone IS NULL OR v.tone = filter_tone)
        AND (filter_style IS NULL OR v.style = filter_style)
    ORDER BY v.humanized_at DESC
    LIMIT page_size OFFSET (page_number - 1) * page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para estadísticas del usuario
CREATE OR REPLACE FUNCTION get_user_humanized_stats(user_id_param TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_humanized', (
            SELECT COUNT(*) 
            FROM user_selected_humanized_news ushn 
            JOIN news_humanized hn ON ushn.humanized_news_id = hn.id 
            WHERE ushn.user_id = user_id_param
        ),
        'ready_for_use', (
            SELECT COUNT(*) 
            FROM user_selected_humanized_news ushn 
            JOIN news_humanized hn ON ushn.humanized_news_id = hn.id 
            WHERE ushn.user_id = user_id_param AND hn.is_ready_for_use = true
        ),
        'by_tone', (
            SELECT json_object_agg(tone, count)
            FROM (
                SELECT tone, COUNT(*) as count
                FROM user_selected_humanized_news ushn 
                JOIN news_humanized hn ON ushn.humanized_news_id = hn.id 
                WHERE ushn.user_id = user_id_param
                GROUP BY tone
            ) t
        ),
        'by_style', (
            SELECT json_object_agg(style, count)
            FROM (
                SELECT style, COUNT(*) as count
                FROM user_selected_humanized_news ushn 
                JOIN news_humanized hn ON ushn.humanized_news_id = hn.id 
                WHERE ushn.user_id = user_id_param
                GROUP BY style
            ) t
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

COMMENT ON TABLE news_humanized IS 'Tabla principal de noticias humanizadas con configuración completa de IA';
COMMENT ON TABLE news_humanization_versions IS 'Control de versiones para cada humanización';
COMMENT ON TABLE user_selected_humanized_news IS 'Selección de noticias humanizadas por usuarios';
COMMENT ON TABLE humanization_batch_queue IS 'Cola de procesamiento en lote para múltiples noticias';
COMMENT ON TABLE humanization_batch_results IS 'Resultados del procesamiento en lote';
COMMENT ON VIEW v_news_humanized_complete IS 'Vista completa de noticias humanizadas con relaciones';
COMMENT ON VIEW v_humanized_stats IS 'Estadísticas generales del sistema de humanización';
COMMENT ON VIEW v_news_by_category IS 'Distribución de noticias por categoría';