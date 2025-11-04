-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PERSON', 'COMPANY', 'TOPIC', 'EVENT');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('SENTIMENT_CHANGE', 'VOLUME_SPIKE', 'CRISIS_DETECTED', 'TRENDING');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

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

-- CreateIndex
CREATE INDEX "entities_user_id_is_active_idx" ON "entities"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "entities_name_idx" ON "entities"("name");

-- CreateIndex
CREATE INDEX "entities_type_idx" ON "entities"("type");

-- CreateIndex
CREATE INDEX "entity_mentions_entity_id_analyzed_at_idx" ON "entity_mentions"("entity_id", "analyzed_at");

-- CreateIndex
CREATE INDEX "entity_mentions_sentiment_idx" ON "entity_mentions"("sentiment");

-- CreateIndex
CREATE INDEX "entity_mentions_scraping_result_id_idx" ON "entity_mentions"("scraping_result_id");

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
