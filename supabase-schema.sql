-- Schema SQL para AI Scraper - Copiar y pegar en el editor SQL de Supabase
-- Dashboard: https://supabase.com/dashboard/project/vdmbvordfslrpnbkozig

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PERSON', 'COMPANY', 'TOPIC', 'EVENT');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('SENTIMENT_CHANGE', 'VOLUME_SPIKE', 'CRISIS_DETECTED', 'TRENDING');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_rewrites" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "saved_url_id" INTEGER NOT NULL,
    "scraping_result_id" INTEGER,
    "original_content" TEXT NOT NULL,
    "rewritten_content" TEXT NOT NULL,
    "ai_model" TEXT NOT NULL,
    "prompt_used" TEXT,
    "tokens_used" INTEGER,
    "cost_estimate" DECIMAL(10,6),
    "response_time" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_rewrites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_urls" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "domain" TEXT NOT NULL,
    "nombre" TEXT,
    "region" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraping_results" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "saved_url_id" INTEGER,
    "public_url_id" INTEGER,
    "title" TEXT NOT NULL DEFAULT 'Sin título',
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "cleaned_content" TEXT NOT NULL,
    "content_hash" VARCHAR(64),
    "scraping_type" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "response_time" INTEGER,
    "status_code" INTEGER,
    "content_length" INTEGER,
    "category" TEXT,
    "domain" TEXT,
    "region" TEXT,
    "title_source" TEXT DEFAULT 'extracted',
    "categorization_method" TEXT DEFAULT 'keywords',
    "categorization_confidence" DOUBLE PRECISION DEFAULT 0.7,
    "ai_used" BOOLEAN NOT NULL DEFAULT false,
    "ai_tokens_used" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scraped_at" TIMESTAMP(3),

    CONSTRAINT "scraping_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraping_stats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "total_scrapes" INTEGER NOT NULL DEFAULT 0,
    "successful_scrapes" INTEGER NOT NULL DEFAULT 0,
    "failed_scrapes" INTEGER NOT NULL DEFAULT 0,
    "total_ai_rewrites" INTEGER NOT NULL DEFAULT 0,
    "total_tokens_used" INTEGER NOT NULL DEFAULT 0,
    "total_cost_estimate" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "average_response_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scraping_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_configurations" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "titleSelector" TEXT NOT NULL,
    "contentSelector" TEXT NOT NULL,
    "dateSelector" TEXT,
    "authorSelector" TEXT,
    "imageSelector" TEXT,
    "cleaningRules" JSONB,
    "createdBy" TEXT NOT NULL,
    "verifiedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listingSelectors" JSONB,
    "lastError" TEXT,
    "lastSuccess" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "site_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_urls" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "domain" TEXT NOT NULL,
    "region" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_news_limit" INTEGER,
    "available_news_count" INTEGER,
    "last_tested_at" TIMESTAMP(3),
    "test_status" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_url_selections" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "public_url_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_url_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_articles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "scraping_result_id" INTEGER,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "saved_title" TEXT,
    "saved_content" TEXT,
    "saved_summary" TEXT,
    "saved_domain" TEXT,
    "saved_category" TEXT,
    "saved_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "type" "EntityType" NOT NULL DEFAULT 'PERSON',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "case_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "exact_match" BOOLEAN NOT NULL DEFAULT false,
    "alert_enabled" BOOLEAN NOT NULL DEFAULT true,
    "alert_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "analysis_context" TEXT NOT NULL DEFAULT 'politica_chile',
    "positive_phrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "negative_phrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_analyzed" TIMESTAMP(3),

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_mentions" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "scraping_result_id" INTEGER NOT NULL,
    "context" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prominence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "sentiment" "Sentiment" NOT NULL,
    "sentiment_score" DOUBLE PRECISION NOT NULL,
    "sentiment_confidence" DOUBLE PRECISION NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tone" TEXT,
    "reason" TEXT,
    "summary" TEXT,
    "analysis_method" TEXT DEFAULT 'ai',
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tokens_used" INTEGER,

    CONSTRAINT "entity_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_snapshots" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_mentions" INTEGER NOT NULL DEFAULT 0,
    "new_mentions" INTEGER NOT NULL DEFAULT 0,
    "positive_count" INTEGER NOT NULL DEFAULT 0,
    "negative_count" INTEGER NOT NULL DEFAULT 0,
    "neutral_count" INTEGER NOT NULL DEFAULT 0,
    "avg_sentiment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "top_keywords" JSONB NOT NULL,
    "top_sources" JSONB NOT NULL,
    "trend_direction" TEXT,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_alerts" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "entity_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" SERIAL NOT NULL,
    "operation_type" TEXT NOT NULL,
    "operation_id" TEXT,
    "user_id" INTEGER,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "input_cost" DOUBLE PRECISION NOT NULL,
    "output_cost" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "model_used" TEXT NOT NULL,
    "prompt_length" INTEGER,
    "response_length" INTEGER,
    "cache_hit" BOOLEAN NOT NULL DEFAULT false,
    "endpoint" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_stats" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "total_operations" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "search_operations" INTEGER NOT NULL DEFAULT 0,
    "search_tokens" INTEGER NOT NULL DEFAULT 0,
    "search_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sentiment_operations" INTEGER NOT NULL DEFAULT 0,
    "sentiment_tokens" INTEGER NOT NULL DEFAULT 0,
    "sentiment_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "entity_operations" INTEGER NOT NULL DEFAULT 0,
    "entity_tokens" INTEGER NOT NULL DEFAULT 0,
    "entity_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clustering_operations" INTEGER NOT NULL DEFAULT 0,
    "clustering_tokens" INTEGER NOT NULL DEFAULT 0,
    "clustering_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "synonym_operations" INTEGER NOT NULL DEFAULT 0,
    "synonym_tokens" INTEGER NOT NULL DEFAULT 0,
    "synonym_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pattern_operations" INTEGER NOT NULL DEFAULT 0,
    "pattern_tokens" INTEGER NOT NULL DEFAULT 0,
    "pattern_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other_operations" INTEGER NOT NULL DEFAULT 0,
    "other_tokens" INTEGER NOT NULL DEFAULT 0,
    "other_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cache_hits" INTEGER NOT NULL DEFAULT 0,
    "cache_misses" INTEGER NOT NULL DEFAULT 0,
    "cache_hit_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimated_savings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_cost_alerts" (
    "id" SERIAL NOT NULL,
    "alert_type" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "current_value" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_cost_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "ai_rewrites_user_id_created_at_idx" ON "ai_rewrites"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_rewrites_success_idx" ON "ai_rewrites"("success");

-- CreateIndex
CREATE INDEX "saved_urls_user_id_url_idx" ON "saved_urls"("user_id", "url");

-- CreateIndex
CREATE INDEX "saved_urls_domain_idx" ON "saved_urls"("domain");

-- CreateIndex
CREATE INDEX "saved_urls_region_idx" ON "saved_urls"("region");

-- CreateIndex
CREATE INDEX "saved_urls_user_id_domain_idx" ON "saved_urls"("user_id", "domain");

-- CreateIndex
CREATE INDEX "scraping_results_user_id_scraped_at_idx" ON "scraping_results"("user_id", "scraped_at");

-- CreateIndex
CREATE INDEX "scraping_results_saved_url_id_scraped_at_idx" ON "scraping_results"("saved_url_id", "scraped_at");

-- CreateIndex
CREATE INDEX "scraping_results_public_url_id_scraped_at_idx" ON "scraping_results"("public_url_id", "scraped_at");

-- CreateIndex
CREATE INDEX "scraping_results_category_idx" ON "scraping_results"("category");

-- CreateIndex
CREATE INDEX "scraping_results_domain_idx" ON "scraping_results"("domain");

-- CreateIndex
CREATE INDEX "scraping_results_region_idx" ON "scraping_results"("region");

-- CreateIndex
CREATE INDEX "scraping_results_success_idx" ON "scraping_results"("success");

-- CreateIndex
CREATE INDEX "scraping_results_title_idx" ON "scraping_results"("title");

-- CreateIndex
CREATE INDEX "scraping_results_content_hash_idx" ON "scraping_results"("content_hash");

-- CreateIndex
CREATE INDEX "scraping_results_ai_used_scraped_at_idx" ON "scraping_results"("ai_used", "scraped_at");

-- CreateIndex
CREATE INDEX "scraping_results_categorization_method_idx" ON "scraping_results"("categorization_method");

-- CreateIndex
CREATE INDEX "scraping_stats_date_idx" ON "scraping_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "scraping_stats_user_id_date_key" ON "scraping_stats"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "site_configurations_domain_key" ON "site_configurations"("domain");

-- CreateIndex
CREATE INDEX "site_configurations_domain_idx" ON "site_configurations"("domain");

-- CreateIndex
CREATE INDEX "site_configurations_confidence_idx" ON "site_configurations"("confidence");

-- CreateIndex
CREATE INDEX "site_configurations_isActive_idx" ON "site_configurations"("isActive");

-- CreateIndex
CREATE INDEX "site_configurations_isVerified_idx" ON "site_configurations"("isVerified");

-- CreateIndex
CREATE INDEX "site_configurations_createdBy_idx" ON "site_configurations"("createdBy");

-- CreateIndex
CREATE INDEX "site_configurations_lastUsedAt_idx" ON "site_configurations"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "public_urls_url_key" ON "public_urls"("url");

-- CreateIndex
CREATE INDEX "public_urls_domain_idx" ON "public_urls"("domain");

-- CreateIndex
CREATE INDEX "public_urls_is_active_idx" ON "public_urls"("is_active");

-- CreateIndex
CREATE INDEX "public_urls_created_by_idx" ON "public_urls"("created_by");

-- CreateIndex
CREATE INDEX "public_urls_test_status_idx" ON "public_urls"("test_status");

-- CreateIndex
CREATE INDEX "user_url_selections_user_id_idx" ON "user_url_selections"("user_id");

-- CreateIndex
CREATE INDEX "user_url_selections_public_url_id_idx" ON "user_url_selections"("public_url_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_url_selections_user_id_public_url_id_key" ON "user_url_selections"("user_id", "public_url_id");

-- CreateIndex
CREATE INDEX "saved_articles_user_id_is_read_idx" ON "saved_articles"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "saved_articles_user_id_created_at_idx" ON "saved_articles"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "saved_articles_saved_domain_idx" ON "saved_articles"("saved_domain");

-- CreateIndex
CREATE INDEX "saved_articles_saved_category_idx" ON "saved_articles"("saved_category");

-- CreateIndex
CREATE UNIQUE INDEX "saved_articles_user_id_scraping_result_id_key" ON "saved_articles"("user_id", "scraping_result_id");

-- CreateIndex
CREATE INDEX "entities_user_id_is_active_idx" ON "entities"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "entities_name_idx" ON "entities"("name");

-- CreateIndex
CREATE INDEX "entities_type_idx" ON "entities"("type");

-- CreateIndex
CREATE INDEX "entities_analysis_context_idx" ON "entities"("analysis_context");

-- CreateIndex
CREATE INDEX "entity_mentions_entity_id_analyzed_at_idx" ON "entity_mentions"("entity_id", "analyzed_at");

-- CreateIndex
CREATE INDEX "entity_mentions_sentiment_idx" ON "entity_mentions"("sentiment");

-- CreateIndex
CREATE INDEX "entity_mentions_scraping_result_id_idx" ON "entity_mentions"("scraping_result_id");

-- CreateIndex
CREATE INDEX "entity_mentions_analysis_method_idx" ON "entity_mentions"("analysis_method");

-- CreateIndex
CREATE UNIQUE INDEX "entity_mentions_entity_id_scraping_result_id_key" ON "entity_mentions"("entity_id", "scraping_result_id");

-- CreateIndex
CREATE INDEX "entity_snapshots_entity_id_date_idx" ON "entity_snapshots"("entity_id", "date" DESC);

-- CreateIndex
CREATE INDEX "entity_snapshots_date_idx" ON "entity_snapshots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "entity_snapshots_entity_id_date_key" ON "entity_snapshots"("entity_id", "date");

-- CreateIndex
CREATE INDEX "entity_alerts_entity_id_created_at_idx" ON "entity_alerts"("entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "entity_alerts_is_read_severity_idx" ON "entity_alerts"("is_read", "severity");

-- CreateIndex
CREATE INDEX "ai_usage_logs_operation_type_idx" ON "ai_usage_logs"("operation_type");

-- CreateIndex
CREATE INDEX "ai_usage_logs_user_id_idx" ON "ai_usage_logs"("user_id");

-- CreateIndex
CREATE INDEX "ai_usage_logs_created_at_idx" ON "ai_usage_logs"("created_at");

-- CreateIndex
CREATE INDEX "ai_usage_logs_cache_hit_idx" ON "ai_usage_logs"("cache_hit");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_stats_date_key" ON "ai_usage_stats"("date");

-- CreateIndex
CREATE INDEX "ai_usage_stats_date_idx" ON "ai_usage_stats"("date");

-- CreateIndex
CREATE INDEX "ai_cost_alerts_alert_type_idx" ON "ai_cost_alerts"("alert_type");

-- CreateIndex
CREATE INDEX "ai_cost_alerts_resolved_idx" ON "ai_cost_alerts"("resolved");

-- CreateIndex
CREATE INDEX "ai_cost_alerts_created_at_idx" ON "ai_cost_alerts"("created_at");

-- AddForeignKey
ALTER TABLE "ai_rewrites" ADD CONSTRAINT "ai_rewrites_saved_url_id_fkey" FOREIGN KEY ("saved_url_id") REFERENCES "saved_urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_rewrites" ADD CONSTRAINT "ai_rewrites_scraping_result_id_fkey" FOREIGN KEY ("scraping_result_id") REFERENCES "scraping_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_rewrites" ADD CONSTRAINT "ai_rewrites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_urls" ADD CONSTRAINT "saved_urls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraping_results" ADD CONSTRAINT "scraping_results_saved_url_id_fkey" FOREIGN KEY ("saved_url_id") REFERENCES "saved_urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraping_results" ADD CONSTRAINT "scraping_results_public_url_id_fkey" FOREIGN KEY ("public_url_id") REFERENCES "public_urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraping_results" ADD CONSTRAINT "scraping_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraping_stats" ADD CONSTRAINT "scraping_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_urls" ADD CONSTRAINT "public_urls_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_url_selections" ADD CONSTRAINT "user_url_selections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_url_selections" ADD CONSTRAINT "user_url_selections_public_url_id_fkey" FOREIGN KEY ("public_url_id") REFERENCES "public_urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_scraping_result_id_fkey" FOREIGN KEY ("scraping_result_id") REFERENCES "scraping_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_mentions" ADD CONSTRAINT "entity_mentions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_mentions" ADD CONSTRAINT "entity_mentions_scraping_result_id_fkey" FOREIGN KEY ("scraping_result_id") REFERENCES "scraping_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_snapshots" ADD CONSTRAINT "entity_snapshots_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_alerts" ADD CONSTRAINT "entity_alerts_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;