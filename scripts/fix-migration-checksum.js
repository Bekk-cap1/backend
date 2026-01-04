const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const migrationName = "20260103231000_usersession_refresh_fields";
  const migrationFile = path.join(
    __dirname,
    "..",
    "prisma",
    "migrations",
    migrationName,
    "migration.sql"
  );

  if (!fs.existsSync(migrationFile)) {
    throw new Error(`migration.sql not found: ${migrationFile}`);
  }

  const content = fs.readFileSync(migrationFile, "utf8");
  const checksum = crypto.createHash("sha256").update(content).digest("hex");

  const updated = await prisma.$executeRawUnsafe(
    `UPDATE "_prisma_migrations"
     SET "checksum" = $1
     WHERE "migration_name" = $2`,
    checksum,
    migrationName
  );

  console.log("Checksum updated:", { migrationName, checksum, updated });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
