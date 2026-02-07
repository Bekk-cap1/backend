-- CreateEnum
CREATE TYPE "PoiType" AS ENUM (
  'speed_camera',
  'hazard',
  'police',
  'school_zone',
  'toll',
  'fuel',
  'other'
);

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('login', 'reset_password');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateTable
CREATE TABLE "DriverLocationSample" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "point" geography(Point,4326) NOT NULL,
  "speedKmh" DOUBLE PRECISION,
  "headingDeg" DOUBLE PRECISION,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverLocationSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripRoute" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "polyline" TEXT NOT NULL,
  "distanceMeters" INTEGER NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "bbox" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poi" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "PoiType" NOT NULL,
  "description" TEXT,
  "location" geography(Point,4326) NOT NULL,
  "radiusMeters" INTEGER NOT NULL DEFAULT 1200,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Poi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "purpose" "OtpPurpose" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLedgerEntry" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "entryType" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookingId" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverLocationSample_tripId_capturedAt_idx"
  ON "DriverLocationSample"("tripId", "capturedAt");
CREATE INDEX "DriverLocationSample_driverId_capturedAt_idx"
  ON "DriverLocationSample"("driverId", "capturedAt");
CREATE INDEX "DriverLocationSample_point_gix"
  ON "DriverLocationSample" USING GIST ("point");
CREATE UNIQUE INDEX "TripRoute_tripId_key" ON "TripRoute"("tripId");
CREATE INDEX "Poi_type_isActive_idx" ON "Poi"("type", "isActive");
CREATE INDEX "Poi_location_gix" ON "Poi" USING GIST ("location");
CREATE INDEX "OtpCode_phone_purpose_createdAt_idx"
  ON "OtpCode"("phone", "purpose", "createdAt");
CREATE INDEX "OtpCode_expiresAt_idx" ON "OtpCode"("expiresAt");
CREATE INDEX "PaymentLedgerEntry_paymentId_createdAt_idx"
  ON "PaymentLedgerEntry"("paymentId", "createdAt");
CREATE INDEX "PaymentLedgerEntry_bookingId_createdAt_idx"
  ON "PaymentLedgerEntry"("bookingId", "createdAt");
CREATE INDEX "SupportTicket_userId_createdAt_idx"
  ON "SupportTicket"("userId", "createdAt");
CREATE INDEX "SupportTicket_status_createdAt_idx"
  ON "SupportTicket"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "DriverLocationSample"
  ADD CONSTRAINT "DriverLocationSample_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriverLocationSample"
  ADD CONSTRAINT "DriverLocationSample_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TripRoute"
  ADD CONSTRAINT "TripRoute_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentLedgerEntry"
  ADD CONSTRAINT "PaymentLedgerEntry_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentLedgerEntry"
  ADD CONSTRAINT "PaymentLedgerEntry_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
