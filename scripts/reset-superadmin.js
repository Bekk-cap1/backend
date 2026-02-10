require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient, Role } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

function normalizePhone(phone) {
  return String(phone ?? '').replace(/\s+/g, '').trim();
}

async function main() {
  const phone = normalizePhone(process.env.SUPERADMIN_PHONE || '+998944692509');
  const password = String(process.env.SUPERADMIN_PASSWORD || 'bekk2006');

  if (!phone) {
    throw new Error('SUPERADMIN_PHONE is empty');
  }
  if (password.length < 6) {
    throw new Error('SUPERADMIN_PASSWORD must be at least 6 chars');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: { phone },
      update: {
        role: Role.superadmin,
        passwordHash,
        isBanned: false,
        bannedAt: null,
        banReason: null,
      },
      create: {
        phone,
        passwordHash,
        role: Role.superadmin,
      },
      select: { id: true, phone: true, role: true },
    });

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: { fullName: 'Super Admin' },
      create: { userId: user.id, fullName: 'Super Admin' },
    });

    console.log(`Superadmin ready: ${user.phone} (role=${user.role})`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
