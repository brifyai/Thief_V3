-- ============================================
-- ESQUEMA DE BASE DE DATOS PARA SISTEMA DE NOTICIAS
-- ============================================

-- Tabla de noticias scrapeadas
CREATE TABLE IF NOT EXISTS "news" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "url" TEXT NOT NULL UNIQUE,
    "source" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "author" TEXT,
    "published_at" TIMESTAMP WITH TIME ZONE,
    "scraped_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "category" TEXT,
    "tags" TEXT[],
    "image_url" TEXT,
    "summary" TEXT,
    "word_count" INTEGER,
    "reading_time" INTEGER, -- en minutos
    "language" TEXT DEFAULT 'es',
    "status" TEXT DEFAULT 'pending', -- pending, processed, published, archived
    "priority" INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
    "is_selected" BOOLEAN DEFAULT FALSE,
    "selected_by" TEXT[],
    "selection_date" TIMESTAMP WITH TIME ZONE,
    "humanized_content" TEXT,
    "humanization_tone" TEXT, -- formal, informal, professional, casual
    "humanization_style" TEXT, -- simple, detailed, technical, narrative
    "humanization_complexity" TEXT, -- basic, intermediate, advanced
    "humanization_date" TIMESTAMP WITH TIME ZONE,
    "humanization_cost" DECIMAL(10, 6) DEFAULT 0,
    "humanization_tokens" INTEGER DEFAULT 0,
    "version" INTEGER DEFAULT 1,
    "parent_id" INTEGER REFERENCES "news"("id"),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de selecciones de noticias (persistencia en Redis y BD)
CREATE TABLE IF NOT EXISTS "news_selections" (
    "id" SERIAL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "news_id" INTEGER NOT NULL REFERENCES "news"("id") ON DELETE CASCADE,
    "selected_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "selection_type" TEXT DEFAULT 'manual', -- manual, auto, batch
    "batch_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de humanizaciones
CREATE TABLE IF NOT EXISTS "news_humanizations" (
    "id" SERIAL PRIMARY KEY,
    "news_id" INTEGER NOT NULL REFERENCES "news"("id") ON DELETE CASCADE,
    "user_id" TEXT NOT NULL,
    "original_content" TEXT NOT NULL,
    "humanized_content" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "complexity" TEXT NOT NULL,
    "tokens_used" INTEGER DEFAULT 0,
    "cost" DECIMAL(10, 6) DEFAULT 0,
    "processing_time" INTEGER, -- en segundos
    "ai_model" TEXT DEFAULT 'chutes-ai',
    "version" INTEGER DEFAULT 1,
    "is_current" BOOLEAN DEFAULT TRUE,
    "feedback_score" INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
    "feedback_comments" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de fuentes de noticias configurables
CREATE TABLE IF NOT EXISTS "news_sources" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL UNIQUE,
    "domain" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- rss, scraping, api
    "config" JSONB, -- configuración específica de scraping
    "is_active" BOOLEAN DEFAULT TRUE,
    "scraping_interval" INTEGER DEFAULT 3600, -- en segundos
    "last_scraped" TIMESTAMP WITH TIME ZONE,
    "success_count" INTEGER DEFAULT 0,
    "failure_count" INTEGER DEFAULT 0,
    "total_articles" INTEGER DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS "categories" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "color" TEXT DEFAULT '#6366f1',
    "icon" TEXT,
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de relación noticias-categorías
CREATE TABLE IF NOT EXISTS "news_categories" (
    "news_id" INTEGER NOT NULL REFERENCES "news"("id") ON DELETE CASCADE,
    "category_id" INTEGER NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
    "confidence" DECIMAL(3,2) DEFAULT 0.8,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("news_id", "category_id")
);

-- Tabla de exportaciones
CREATE TABLE IF NOT EXISTS "news_exports" (
    "id" SERIAL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "format" TEXT NOT NULL, -- json, csv, xml, pdf, markdown
    "filters" JSONB,
    "news_count" INTEGER NOT NULL,
    "file_path" TEXT,
    "file_size" INTEGER,
    "status" TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    "error_message" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "completed_at" TIMESTAMP WITH TIME ZONE
);

-- Tabla de batches de procesamiento
CREATE TABLE IF NOT EXISTS "processing_batches" (
    "id" TEXT PRIMARY KEY, -- UUID
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    "total_news" INTEGER DEFAULT 0,
    "processed_news" INTEGER DEFAULT 0,
    "failed_news" INTEGER DEFAULT 0,
    "config" JSONB,
    "started_at" TIMESTAMP WITH TIME ZONE,
    "completed_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de relación batches-noticias
CREATE TABLE IF NOT EXISTS "batch_news" (
    "batch_id" TEXT NOT NULL REFERENCES "processing_batches"("id") ON DELETE CASCADE,
    "news_id" INTEGER NOT NULL REFERENCES "news"("id") ON DELETE CASCADE,
    "status" TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    "error_message" TEXT,
    "processed_at" TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY ("batch_id", "news_id")
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS "idx_news_domain" ON "news"("domain");
CREATE INDEX IF NOT EXISTS "idx_news_status" ON "news"("status");
CREATE INDEX IF NOT EXISTS "idx_news_published_at" ON "news"("published_at");
CREATE INDEX IF NOT EXISTS "idx_news_scraped_at" ON "news"("scraped_at");
CREATE INDEX IF NOT EXISTS "idx_news_is_selected" ON "news"("is_selected");
CREATE INDEX IF NOT EXISTS "idx_news_selections_user_id" ON "news_selections"("user_id");
CREATE INDEX IF NOT EXISTS "idx_news_selections_news_id" ON "news_selections"("news_id");
CREATE INDEX IF NOT EXISTS "idx_news_humanizations_news_id" ON "news_humanizations"("news_id");
CREATE INDEX IF NOT EXISTS "idx_news_humanizations_user_id" ON "news_humanizations"("user_id");
CREATE INDEX IF NOT EXISTS "idx_news_sources_domain" ON "news_sources"("domain");
CREATE INDEX IF NOT EXISTS "idx_news_sources_is_active" ON "news_sources"("is_active");
CREATE INDEX IF NOT EXISTS "idx_processing_batches_status" ON "processing_batches"("status");
CREATE INDEX IF NOT EXISTS "idx_processing_batches_user_id" ON "processing_batches"("user_id");

-- Insertar categorías iniciales
INSERT INTO "categories" ("name", "slug", "description", "color", "icon") VALUES
('Política', 'politica', 'Noticias políticas y gubernamentales', '#f44336', 'gavel'),
('Economía', 'economia', 'Noticias económicas y financieras', '#4caf50', 'trending_up'),
('Deportes', 'deportes', 'Noticias deportivas y eventos', '#2196f3', 'sports_soccer'),
('Tecnología', 'tecnologia', 'Noticias tecnológicas y digitales', '#9c27b0', 'computer'),
('Entretenimiento', 'entretenimiento', 'Noticias de espectáculos y cultura', '#e91e63', 'movie'),
('Salud', 'salud', 'Noticias de salud y bienestar', '#4caf50', 'local_hospital'),
('Educación', 'educacion', 'Noticias educativas y académicas', '#ff9800', 'school'),
('Ciencia', 'ciencia', 'Noticias científicas y descubrimientos', '#3f51b5', 'science'),
('Internacional', 'internacional', 'Noticias internacionales', '#795548', 'public'),
('Sociedad', 'sociedad', 'Noticias sociales y culturales', '#607d8b', 'people');

-- Insertar fuentes de noticias iniciales
INSERT INTO "news_sources" ("name", "url", "domain", "type", "is_active", "scraping_interval") VALUES
('El Mercurio', 'https://www.emol.com', 'emol.com', 'scraping', TRUE, 1800),
('La Tercera', 'https://www.latercera.com', 'latercera.com', 'scraping', TRUE, 1800),
('La Cuarta', 'https://www.lacuarta.com', 'lacuarta.com', 'scraping', TRUE, 1800),
('Biobío Chile', 'https://www.biobiochile.cl', 'biobiochile.cl', 'scraping', TRUE, 1800),
('DF', 'https://www.df.cl', 'df.cl', 'scraping', TRUE, 1800),
('CNN Chile', 'https://www.cnnchile.com', 'cnnchile.com', 'scraping', TRUE, 1800),
('24 Horas', 'https://www.24horas.cl', '24horas.cl', 'scraping', TRUE, 1800),
('Publimetro', 'https://www.publimetro.cl', 'publimetro.cl', 'scraping', TRUE, 1800);

-- Función para actualizar el timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar timestamps
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON "news" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_sources_updated_at BEFORE UPDATE ON "news_sources" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON "categories" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_humanizations_updated_at BEFORE UPDATE ON "news_humanizations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_exports_updated_at BEFORE UPDATE ON "news_exports" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vista de noticias con estadísticas
CREATE OR REPLACE VIEW "news_with_stats" AS
SELECT 
    n.*,
    (SELECT COUNT(*) FROM "news_selections" ns WHERE ns.news_id = n.id) as selection_count,
    (SELECT COUNT(*) FROM "news_humanizations" nh WHERE nh.news_id = n.id) as humanization_count,
    (SELECT AVG(feedback_score) FROM "news_humanizations" nh WHERE nh.news_id = n.id AND nh.feedback_score IS NOT NULL) as avg_feedback_score
FROM "news" n;

-- Vista de fuentes con estadísticas
CREATE OR REPLACE VIEW "sources_with_stats" AS
SELECT 
    s.*,
    (SELECT COUNT(*) FROM "news" n WHERE n.domain = s.domain) as actual_total_articles,
    (SELECT COUNT(*) FROM "news" n WHERE n.domain = s.domain AND n.status = 'published') as published_articles,
    (SELECT MAX(n.scraped_at) FROM "news" n WHERE n.domain = s.domain) as latest_news_scraped
FROM "news_sources" s;

-- Políticas de seguridad (RLS - Row Level Security)
ALTER TABLE "news" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "news_selections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "news_humanizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "news_exports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "processing_batches" ENABLE ROW LEVEL SECURITY;

-- Políticas de ejemplo (ajustar según necesidades)
-- CREATE POLICY "Users can view their own data" ON "news" FOR SELECT USING (auth.uid()::text = created_by::text);
-- CREATE POLICY "Users can insert their own data" ON "news" FOR INSERT WITH CHECK (auth.uid()::text = created_by::text);
-- CREATE POLICY "Users can update their own data" ON "news" FOR UPDATE USING (auth.uid()::text = created_by::text);
-- CREATE POLICY "Users can delete their own data" ON "news" FOR DELETE USING (auth.uid()::text = created_by::text);