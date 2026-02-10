ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "cityId" TEXT,
  ADD COLUMN IF NOT EXISTS "acceptTermsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "referralCode" TEXT;

CREATE INDEX IF NOT EXISTS "UserProfile_cityId_idx" ON "UserProfile"("cityId");
