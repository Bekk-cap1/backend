/*
  Warnings:

  - You are about to drop the column `message` on the `Offer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Offer" DROP COLUMN "message",
ADD COLUMN     "responseNote" TEXT,
ADD COLUMN     "responseReason" TEXT;
