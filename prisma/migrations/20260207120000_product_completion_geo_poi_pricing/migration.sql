-- User bans
ALTER TABLE "User"
  ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bannedAt" TIMESTAMP(3),
  ADD COLUMN "banReason" TEXT;

-- POI reports moderation flow
CREATE TYPE "PoiReportStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "PoiReport" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "poiId" TEXT,
  "type" "PoiType" NOT NULL,
  "description" TEXT,
  "location" geography(Point,4326) NOT NULL,
  "radiusMeters" INTEGER NOT NULL DEFAULT 1200,
  "status" "PoiReportStatus" NOT NULL DEFAULT 'pending',
  "moderatedById" TEXT,
  "moderatedAt" TIMESTAMP(3),
  "moderationNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PoiReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PoiReport_status_createdAt_idx"
  ON "PoiReport"("status", "createdAt");
CREATE INDEX "PoiReport_reporterId_createdAt_idx"
  ON "PoiReport"("reporterId", "createdAt");
CREATE INDEX "PoiReport_poiId_idx"
  ON "PoiReport"("poiId");
CREATE INDEX "PoiReport_location_gix"
  ON "PoiReport" USING GIST ("location");

ALTER TABLE "PoiReport"
  ADD CONSTRAINT "PoiReport_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PoiReport"
  ADD CONSTRAINT "PoiReport_poiId_fkey"
  FOREIGN KEY ("poiId") REFERENCES "Poi"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Saved fare quotes (pricing evidence)
CREATE TABLE "FareQuote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "seats" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "distanceMeters" INTEGER NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FareQuote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FareQuote_userId_createdAt_idx"
  ON "FareQuote"("userId", "createdAt");
CREATE INDEX "FareQuote_tripId_createdAt_idx"
  ON "FareQuote"("tripId", "createdAt");
CREATE INDEX "FareQuote_expiresAt_idx"
  ON "FareQuote"("expiresAt");

ALTER TABLE "FareQuote"
  ADD CONSTRAINT "FareQuote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FareQuote"
  ADD CONSTRAINT "FareQuote_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
