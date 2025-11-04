-- AlterTable
ALTER TABLE "public_urls" ADD COLUMN     "available_news_count" INTEGER,
ADD COLUMN     "last_tested_at" TIMESTAMP(3),
ADD COLUMN     "max_news_limit" INTEGER,
ADD COLUMN     "test_status" TEXT;

-- CreateIndex
CREATE INDEX "public_urls_test_status_idx" ON "public_urls"("test_status");
