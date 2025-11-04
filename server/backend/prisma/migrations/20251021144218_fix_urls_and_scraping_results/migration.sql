/*
  Warnings:

  - Made the column `cleaned_content` on table `scraping_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `scraping_results` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."saved_urls_user_id_url_key";

-- AlterTable
ALTER TABLE "scraping_results" ALTER COLUMN "cleaned_content" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "title" SET DEFAULT 'Sin título';

-- CreateIndex
CREATE INDEX "saved_urls_user_id_url_idx" ON "saved_urls"("user_id", "url");
