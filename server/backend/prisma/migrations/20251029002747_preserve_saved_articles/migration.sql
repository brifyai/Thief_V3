-- DropForeignKey
ALTER TABLE "public"."saved_articles" DROP CONSTRAINT "saved_articles_scraping_result_id_fkey";

-- AlterTable
ALTER TABLE "saved_articles" ADD COLUMN     "saved_category" TEXT,
ADD COLUMN     "saved_content" TEXT,
ADD COLUMN     "saved_domain" TEXT,
ADD COLUMN     "saved_summary" TEXT,
ADD COLUMN     "saved_title" TEXT,
ADD COLUMN     "saved_url" TEXT,
ALTER COLUMN "scraping_result_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "saved_articles_saved_domain_idx" ON "saved_articles"("saved_domain");

-- CreateIndex
CREATE INDEX "saved_articles_saved_category_idx" ON "saved_articles"("saved_category");

-- AddForeignKey
ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_scraping_result_id_fkey" FOREIGN KEY ("scraping_result_id") REFERENCES "scraping_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;
