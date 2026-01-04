/*
  Warnings:

  - Changed the type of `createdBy` on the `Offer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `price` to the `TripRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OfferCreatedBy" AS ENUM ('passenger', 'driver');

-- AlterTable
ALTER TABLE "Offer" DROP COLUMN "createdBy",
ADD COLUMN     "createdBy" "OfferCreatedBy" NOT NULL;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "vehicleId" TEXT,
ALTER COLUMN "seatsAvailable" SET DEFAULT 4;

-- AlterTable
ALTER TABLE "TripRequest" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'UZS',
ADD COLUMN     "price" INTEGER NOT NULL,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ALTER COLUMN "seats" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE INDEX "Trip_vehicleId_idx" ON "Trip"("vehicleId");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
