-- AlterTable
ALTER TABLE "entities" ADD COLUMN     "analysis_context" TEXT NOT NULL DEFAULT 'politica_chile',
ADD COLUMN     "negative_phrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "positive_phrases" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "entity_mentions" ADD COLUMN     "analysis_method" TEXT DEFAULT 'ai',
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "summary" TEXT;

-- CreateIndex
CREATE INDEX "entities_analysis_context_idx" ON "entities"("analysis_context");

-- CreateIndex
CREATE INDEX "entity_mentions_analysis_method_idx" ON "entity_mentions"("analysis_method");
