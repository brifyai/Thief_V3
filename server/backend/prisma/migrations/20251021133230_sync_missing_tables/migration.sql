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
    "user_id" INTEGER NOT NULL,
    "saved_url_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "cleaned_content" TEXT,
    "scraping_type" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "response_time" INTEGER,
    "status_code" INTEGER,
    "content_length" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "domain" TEXT,
    "region" TEXT,
    "scraped_at" TIMESTAMP(3),
    "summary" TEXT,
    "title" TEXT,

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

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "ai_rewrites_user_id_created_at_idx" ON "ai_rewrites"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_rewrites_success_idx" ON "ai_rewrites"("success");

-- CreateIndex
CREATE INDEX "saved_urls_domain_idx" ON "saved_urls"("domain");

-- CreateIndex
CREATE INDEX "saved_urls_region_idx" ON "saved_urls"("region");

-- CreateIndex
CREATE INDEX "saved_urls_user_id_domain_idx" ON "saved_urls"("user_id", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "saved_urls_user_id_url_key" ON "saved_urls"("user_id", "url");

-- CreateIndex
CREATE INDEX "scraping_results_user_id_scraped_at_idx" ON "scraping_results"("user_id", "scraped_at");

-- CreateIndex
CREATE INDEX "scraping_results_saved_url_id_scraped_at_idx" ON "scraping_results"("saved_url_id", "scraped_at");

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
ALTER TABLE "scraping_results" ADD CONSTRAINT "scraping_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraping_stats" ADD CONSTRAINT "scraping_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
