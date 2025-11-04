-- AlterTable
ALTER TABLE "scraping_results" ADD COLUMN     "public_url_id" INTEGER,
ALTER COLUMN "saved_url_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "scraping_results_public_url_id_scraped_at_idx" ON "scraping_results"("public_url_id", "scraped_at");

-- AddForeignKey
ALTER TABLE "scraping_results" ADD CONSTRAINT "scraping_results_public_url_id_fkey" FOREIGN KEY ("public_url_id") REFERENCES "public_urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
