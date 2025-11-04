-- CreateTable
CREATE TABLE "public_urls" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "domain" TEXT NOT NULL,
    "region" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
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

-- CreateIndex
CREATE UNIQUE INDEX "public_urls_url_key" ON "public_urls"("url");

-- CreateIndex
CREATE INDEX "public_urls_domain_idx" ON "public_urls"("domain");

-- CreateIndex
CREATE INDEX "public_urls_is_active_idx" ON "public_urls"("is_active");

-- CreateIndex
CREATE INDEX "public_urls_created_by_idx" ON "public_urls"("created_by");

-- CreateIndex
CREATE INDEX "user_url_selections_user_id_idx" ON "user_url_selections"("user_id");

-- CreateIndex
CREATE INDEX "user_url_selections_public_url_id_idx" ON "user_url_selections"("public_url_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_url_selections_user_id_public_url_id_key" ON "user_url_selections"("user_id", "public_url_id");

-- AddForeignKey
ALTER TABLE "public_urls" ADD CONSTRAINT "public_urls_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_url_selections" ADD CONSTRAINT "user_url_selections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_url_selections" ADD CONSTRAINT "user_url_selections_public_url_id_fkey" FOREIGN KEY ("public_url_id") REFERENCES "public_urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
