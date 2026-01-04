import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from 'bcrypt'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // обязательно
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const cities = [
    { name: "Tashkent", countryCode: "UZ", region: "Tashkent", timezone: "Asia/Tashkent" },
    { name: "Andijan", countryCode: "UZ", region: "Andijan", timezone: "Asia/Tashkent" },
    { name: "Jizzakh", countryCode: "UZ", region: "Jizzakh", timezone: "Asia/Tashkent" },
  ];

  for (const c of cities) {
    await prisma.city.upsert({
      where: { name_countryCode: { name: c.name, countryCode: c.countryCode } },
      update: { region: c.region, timezone: c.timezone },
      create: c,
    });
  }
  const phone = '+998901112233';
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const driver = await prisma.user.upsert({
    where: { phone },
    update: { role: Role.driver },
    create: {
      phone,
      passwordHash,
      role: Role.driver,
      // если есть обязательные поля — добавь здесь
    },
  });

  // 3) Vehicle for driver
  const vehicle = await prisma.vehicle.create({
    data: {
      userId: driver.id,
      // поля подгони под твою схему Vehicle:
      model: 'Cobalt',
      plateNo: '01A123AA',
      color: 'White',
      seats: 4,
      make: '2018',
    } as any,
  });
}

main()
  .then(() => console.log("Seed done"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
