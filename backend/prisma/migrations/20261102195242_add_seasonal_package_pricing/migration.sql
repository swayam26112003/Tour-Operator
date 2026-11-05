-- CreateEnum
CREATE TYPE "HotelCategory" AS ENUM ('STANDARD', 'DELUXE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "TravelSeason" AS ENUM ('OFF_SEASON', 'MONSOON', 'PEAK');

-- CreateTable
CREATE TABLE "PackageSeasonalPrice" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "season" "TravelSeason" NOT NULL,
    "hotelCategory" "HotelCategory" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "pricePerPerson" DECIMAL(10,2) NOT NULL,
    "priceTwinSharing" DECIMAL(10,2) NOT NULL,
    "gstPercentage" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageSeasonalPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PackageSeasonalPrice_packageId_idx" ON "PackageSeasonalPrice"("packageId");

-- CreateIndex
CREATE INDEX "PackageSeasonalPrice_packageId_season_hotelCategory_idx" ON "PackageSeasonalPrice"("packageId", "season", "hotelCategory");

-- CreateIndex
CREATE INDEX "PackageSeasonalPrice_validFrom_validTo_idx" ON "PackageSeasonalPrice"("validFrom", "validTo");

-- AddForeignKey
ALTER TABLE "PackageSeasonalPrice" ADD CONSTRAINT "PackageSeasonalPrice_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
