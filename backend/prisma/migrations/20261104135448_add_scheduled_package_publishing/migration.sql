-- AlterEnum
ALTER TYPE "PackageStatus" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Package_status_scheduledAt_idx" ON "Package"("status", "scheduledAt");
