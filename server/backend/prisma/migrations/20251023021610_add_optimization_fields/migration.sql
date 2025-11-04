-- AlterTable
ALTER TABLE "scraping_results" ADD COLUMN     "ai_tokens_used" INTEGER,
ADD COLUMN     "ai_used" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "categorization_confidence" DOUBLE PRECISION DEFAULT 0.7,
ADD COLUMN     "categorization_method" TEXT DEFAULT 'keywords',
ADD COLUMN     "content_hash" VARCHAR(64),
ADD COLUMN     "title_source" TEXT DEFAULT 'extracted';

-- CreateIndex
CREATE INDEX "scraping_results_content_hash_idx" ON "scraping_results"("content_hash");

-- CreateIndex
CREATE INDEX "scraping_results_ai_used_scraped_at_idx" ON "scraping_results"("ai_used", "scraped_at");

-- CreateIndex
CREATE INDEX "scraping_results_categorization_method_idx" ON "scraping_results"("categorization_method");
