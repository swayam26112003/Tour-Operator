-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "aiExtractedData" JSONB,
ADD COLUMN     "aiProcessedAt" TIMESTAMP(3),
ADD COLUMN     "aiReplyDraft" TEXT,
ADD COLUMN     "aiSuggestedPackages" JSONB;
