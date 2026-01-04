ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'moderator';

ALTER TABLE "Booking"
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "cancellationFeeAmount" INTEGER NOT NULL DEFAULT 0;
