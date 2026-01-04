-- Align migration history with actual DB state (idempotent)

ALTER TABLE "UserSession"
ADD COLUMN IF NOT EXISTS "refreshJti" TEXT,
ADD COLUMN IF NOT EXISTS "refreshTokenHash" TEXT;

-- Если вдруг кто-то выполнил только ADD COLUMN, но не заполнил данные:
UPDATE "UserSession"
SET
  "revokedAt" = COALESCE("revokedAt", NOW()),
  "refreshJti" = COALESCE("refreshJti", md5(random()::text || clock_timestamp()::text)),
  "refreshTokenHash" = COALESCE("refreshTokenHash", md5(random()::text || clock_timestamp()::text))
WHERE "refreshJti" IS NULL OR "refreshTokenHash" IS NULL;

ALTER TABLE "UserSession"
ALTER COLUMN "refreshJti" SET NOT NULL,
ALTER COLUMN "refreshTokenHash" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "UserSession_userId_refreshJti_idx"
ON "UserSession" ("userId", "refreshJti");
