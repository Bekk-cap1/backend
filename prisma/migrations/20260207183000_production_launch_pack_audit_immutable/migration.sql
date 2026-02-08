ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "prevHash" TEXT,
  ADD COLUMN IF NOT EXISTS "hash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_hash_key" ON "AuditLog" ("hash");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_id_idx" ON "AuditLog" ("createdAt", "id");

CREATE OR REPLACE FUNCTION prevent_auditlog_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is immutable: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "AuditLog_no_update" ON "AuditLog";
CREATE TRIGGER "AuditLog_no_update"
BEFORE UPDATE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_auditlog_mutation();

DROP TRIGGER IF EXISTS "AuditLog_no_delete" ON "AuditLog";
CREATE TRIGGER "AuditLog_no_delete"
BEFORE DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_auditlog_mutation();
