ALTER TABLE "TripRequest"
  ADD COLUMN "seatNumbers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "pickupAddress" TEXT,
  ADD COLUMN "dropoffAddress" TEXT,
  ADD COLUMN "pickupPlaceId" TEXT,
  ADD COLUMN "dropoffPlaceId" TEXT,
  ADD COLUMN "pickupPoint" geography(Point,4326),
  ADD COLUMN "dropoffPoint" geography(Point,4326);

ALTER TABLE "Booking"
  ADD COLUMN "seatNumbers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "TripRequest_tripId_status_idx" ON "TripRequest" ("tripId", "status");
CREATE INDEX "TripRequest_passengerId_status_idx" ON "TripRequest" ("passengerId", "status");
CREATE INDEX "Booking_tripId_status_idx" ON "Booking" ("tripId", "status");