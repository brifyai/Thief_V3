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
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
