-- Add negotiation session table and remove legacy fields
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NegotiationTurn') THEN
    CREATE TYPE "NegotiationTurn" AS ENUM ('passenger', 'driver');
  END IF;
END$$;

CREATE TYPE "NegotiationSessionState" AS ENUM ('active', 'accepted', 'expired', 'canceled');

CREATE TABLE "NegotiationSession" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "requestId" TEXT NOT NULL,
    "state" "NegotiationSessionState" NOT NULL DEFAULT 'active',
    "nextTurn" "NegotiationTurn" NOT NULL,
    "driverMovesLeft" INTEGER NOT NULL,
    "passengerMovesLeft" INTEGER NOT NULL,
    "maxMovesPerSide" INTEGER NOT NULL DEFAULT 3,
    "lastOfferId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NegotiationSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NegotiationSession_requestId_key" ON "NegotiationSession"("requestId");
CREATE INDEX "NegotiationSession_state_idx" ON "NegotiationSession"("state");

ALTER TABLE "NegotiationSession" ADD CONSTRAINT "NegotiationSession_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "TripRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TripRequest"
  DROP COLUMN IF EXISTS "negotiationTurn",
  DROP COLUMN IF EXISTS "negotiationDriverAttempts",
  DROP COLUMN IF EXISTS "negotiationPassengerAttempts",
  DROP COLUMN IF EXISTS "negotiationMaxAttempts",
  DROP COLUMN IF EXISTS "negotiationFinalStatus";

-- Offer sequencing
ALTER TABLE "Offer" ADD COLUMN "seq" INTEGER;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "requestId" ORDER BY "createdAt" ASC) AS rn
  FROM "Offer"
)
UPDATE "Offer" o
SET "seq" = ranked.rn
FROM ranked
WHERE o.id = ranked.id;

ALTER TABLE "Offer" ALTER COLUMN "seq" SET NOT NULL;
ALTER TABLE "Offer" ALTER COLUMN "status" SET DEFAULT 'active';
CREATE UNIQUE INDEX "Offer_requestId_seq_key" ON "Offer"("requestId", "seq");

-- Outbox status/state machine
CREATE TYPE "OutboxStatus" AS ENUM ('NEW', 'PROCESSING', 'DONE', 'FAILED');

ALTER TABLE "OutboxEvent" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "OutboxEvent" ALTER COLUMN "status" TYPE "OutboxStatus"
USING (CASE
  WHEN "status" = 'processing' THEN 'PROCESSING'::"OutboxStatus"
  WHEN "status" = 'sent' THEN 'DONE'::"OutboxStatus"
  WHEN "status" = 'failed' THEN 'FAILED'::"OutboxStatus"
  ELSE 'NEW'::"OutboxStatus"
END);

ALTER TABLE "OutboxEvent" ALTER COLUMN "status" SET DEFAULT 'NEW';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'OutboxEvent_status_availableAt_idx') THEN
    EXECUTE 'DROP INDEX "OutboxEvent_status_availableAt_idx"';
  END IF;
END$$;

ALTER TABLE "OutboxEvent" RENAME COLUMN "availableAt" TO "nextRetryAt";
CREATE INDEX "OutboxEvent_status_nextRetryAt_idx" ON "OutboxEvent"("status", "nextRetryAt");
