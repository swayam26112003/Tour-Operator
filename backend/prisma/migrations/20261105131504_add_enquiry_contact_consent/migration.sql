-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "contactConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contactConsentAt" TIMESTAMP(3);
