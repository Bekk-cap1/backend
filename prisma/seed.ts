import "dotenv/config";
import { PrismaClient, Role, DriverStatus, TripStatus, NegotiationSessionState, NegotiationTurn } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcrypt";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
}

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
    { name: "Samarkand", countryCode: "UZ", region: "Samarkand", timezone: "Asia/Tashkent" },
    { name: "Bukhara", countryCode: "UZ", region: "Bukhara", timezone: "Asia/Tashkent" },
    { name: "Namangan", countryCode: "UZ", region: "Namangan", timezone: "Asia/Tashkent" },
    { name: "Nukus", countryCode: "UZ", region: "Karakalpakstan", timezone: "Asia/Tashkent" },
    { name: "Fergana", countryCode: "UZ", region: "Fergana", timezone: "Asia/Tashkent" },
    { name: "Karshi", countryCode: "UZ", region: "Qashqadaryo", timezone: "Asia/Tashkent" },
    { name: "Termez", countryCode: "UZ", region: "Surxondaryo", timezone: "Asia/Tashkent" },
  ];

  for (const c of cities) {
    await prisma.city.upsert({
      where: { name_countryCode: { name: c.name, countryCode: c.countryCode } },
      update: { region: c.region, timezone: c.timezone },
      create: c,
    });
  }

  const driverPhone = "+998901112233";
  const passengerPhone = "+998901112244";
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const driver = await prisma.user.upsert({
    where: { phone: driverPhone },
    update: { role: Role.driver },
    create: {
      phone: driverPhone,
      passwordHash,
      role: Role.driver,
    },
  });

  await prisma.driverProfile.upsert({
    where: { userId: driver.id },
    update: {
      status: DriverStatus.verified,
      verifiedAt: new Date(),
    },
    create: {
      userId: driver.id,
      status: DriverStatus.verified,
      fullName: "Bekzod Karimov",
      licenseNo: "UZ-DR-102938",
      passportNo: "AB1234567",
      verifiedAt: new Date(),
    },
  });

  const passenger = await prisma.user.upsert({
    where: { phone: passengerPhone },
    update: { role: Role.passenger },
    create: {
      phone: passengerPhone,
      passwordHash,
      role: Role.passenger,
    },
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { plateNo: "01A123AA" },
    update: {
      userId: driver.id,
      make: "Chevrolet",
      model: "Cobalt",
      color: "White",
      seats: 4,
    },
    create: {
      userId: driver.id,
      make: "Chevrolet",
      model: "Cobalt",
      plateNo: "01A123AA",
      color: "White",
      seats: 4,
    },
  });

  const fromCity = await prisma.city.findFirst({ where: { name: "Tashkent", countryCode: "UZ" } });
  const toCity = await prisma.city.findFirst({ where: { name: "Samarkand", countryCode: "UZ" } });

  if (!fromCity || !toCity) {
    throw new Error("Seed cities not found");
  }

  const departureAt = new Date("2030-01-15T08:00:00.000Z");
  const arriveAt = new Date("2030-01-15T12:00:00.000Z");

  const existingTrip = await prisma.trip.findFirst({
    where: {
      driverId: driver.id,
      fromCityId: fromCity.id,
      toCityId: toCity.id,
      departureAt,
      status: TripStatus.published,
    },
  });

  const trip = existingTrip
    ? await prisma.trip.update({
        where: { id: existingTrip.id },
        data: {
          vehicleId: vehicle.id,
          seatsTotal: 4,
          seatsAvailable: 4,
          price: 120000,
          currency: "UZS",
          arriveAt,
          status: TripStatus.published,
        },
      })
    : await prisma.trip.create({
        data: {
          driverId: driver.id,
          vehicleId: vehicle.id,
          fromCityId: fromCity.id,
          toCityId: toCity.id,
          departureAt,
          arriveAt,
          seatsTotal: 4,
          seatsAvailable: 4,
          price: 120000,
          currency: "UZS",
          status: TripStatus.published,
          notes: "Seeded future trip",
        },
      });

  await prisma.userProfile.upsert({
    where: { userId: passenger.id },
    update: { fullName: "Dilnoza Akhmedova" },
    create: { userId: passenger.id, fullName: "Dilnoza Akhmedova" },
  });

  await prisma.tripRequest.upsert({
    where: {
      tripId_passengerId: {
        tripId: trip.id,
        passengerId: passenger.id,
      },
    },
    update: {
      seats: 1,
      price: trip.price,
      currency: trip.currency,
      message: "Seed request",
    },
    create: {
      tripId: trip.id,
      passengerId: passenger.id,
      seats: 1,
      price: trip.price,
      currency: trip.currency,
      message: "Seed request",
    },
  });

  const request = await prisma.tripRequest.findUnique({
    where: {
      tripId_passengerId: {
        tripId: trip.id,
        passengerId: passenger.id,
      },
    },
  });

  if (!request) {
    throw new Error("Seed request not found");
  }

  const maxDriverOffers = parsePositiveInt(process.env.OFFERS_MAX_DRIVER, 3);
  const maxPassengerOffers = parsePositiveInt(process.env.OFFERS_MAX_PASSENGER, 3);
  const maxPerSide = Math.max(maxDriverOffers, maxPassengerOffers);

  await prisma.negotiationSession.upsert({
    where: { requestId: request.id },
    update: {
      state: NegotiationSessionState.active,
      nextTurn: NegotiationTurn.driver,
      driverMovesLeft: maxDriverOffers,
      passengerMovesLeft: maxPassengerOffers,
      maxMovesPerSide: maxPerSide,
      lastOfferId: null,
    },
    create: {
      requestId: request.id,
      state: NegotiationSessionState.active,
      nextTurn: NegotiationTurn.driver,
      driverMovesLeft: maxDriverOffers,
      passengerMovesLeft: maxPassengerOffers,
      maxMovesPerSide: maxPerSide,
      lastOfferId: null,
      version: 0,
    },
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
