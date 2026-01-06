-- Add seats to Offer with backfill for existing rows
ALTER TABLE "Offer" ADD COLUMN "seats" INTEGER;

UPDATE "Offer" o
SET "seats" = tr."seats"
FROM "TripRequest" tr
WHERE tr."id" = o."requestId"
  AND o."seats" IS NULL;

UPDATE "Offer"
SET "seats" = 1
WHERE "seats" IS NULL;

ALTER TABLE "Offer" ALTER COLUMN "seats" SET NOT NULL;
