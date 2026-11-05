-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mapStops" TEXT[] DEFAULT ARRAY[]::TEXT[];
