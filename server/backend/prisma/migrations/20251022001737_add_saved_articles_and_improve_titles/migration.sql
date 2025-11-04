-- CreateTable
CREATE TABLE "saved_articles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "scraping_result_id" INTEGER NOT NULL,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_articles_user_id_is_read_idx" ON "saved_articles"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "saved_articles_user_id_created_at_idx" ON "saved_articles"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "saved_articles_user_id_scraping_result_id_key" ON "saved_articles"("user_id", "scraping_result_id");

-- AddForeignKey
ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_scraping_result_id_fkey" FOREIGN KEY ("scraping_result_id") REFERENCES "scraping_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
