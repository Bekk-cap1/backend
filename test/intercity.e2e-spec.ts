import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { execSync } from 'node:child_process';
import { PrismaClient, DriverStatus, Role, OutboxStatus } from '@prisma/client';
import { OutboxDispatcher } from '../src/outbox/outbox.dispatcher';
import { bootstrapApp } from '../src/app.bootstrap';

describe('Intercity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let dispatcher: OutboxDispatcher;

  let driverToken: string;
  let passengerToken: string;
  let driverId: string;
  let passengerId: string;
  let tripId: string;
  let requestId: string;
  let bookingId: string;
  let lastOfferId: string;
  let fromCityId: string;
  let toCityId: string;

  const driverPhone = '+998900000001';
  const passengerPhone = '+998900000002';
  const password = 'Password123!';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/intercity_test?schema=public';
    process.env.SHADOW_DATABASE_URL =
      process.env.SHADOW_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/intercity_shadow?schema=public';
    process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_123456';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_123456';
    process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '900';
    process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '2592000';
    process.env.BOOKING_CANCEL_FEE_PERCENT = process.env.BOOKING_CANCEL_FEE_PERCENT ?? '10';

    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    const { AppModule } = require('../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    bootstrapApp(app);
    await app.init();

    dispatcher = app.get(OutboxDispatcher);

    prisma = new PrismaClient();
    await resetDatabase(prisma);

    const cities = await prisma.city.createMany({
      data: [
        { name: 'Tashkent', countryCode: 'UZ', region: 'Tashkent', timezone: 'Asia/Tashkent' },
        { name: 'Samarkand', countryCode: 'UZ', region: 'Samarkand', timezone: 'Asia/Tashkent' },
      ],
    });
    if (!cities.count) {
      const existing = await prisma.city.findMany({ where: { countryCode: 'UZ' } });
      fromCityId = existing[0].id;
      toCityId = existing[1].id;
    } else {
      const [from, to] = await prisma.city.findMany({ orderBy: { name: 'asc' } });
      fromCityId = from.id;
      toCityId = to.id;
    }
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('registers and logs in passenger', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      phone: passengerPhone,
      password,
    }).expect(201);

    const login = await request(app.getHttpServer()).post('/auth/login').send({
      phone: passengerPhone,
      password,
    }).expect(201);

    passengerToken = login.body.data.data.accessToken;

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${passengerToken}`)
      .expect(200);

    passengerId = me.body.data.data.user.id;
  });

  it('registers and logs in driver', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      phone: driverPhone,
      password,
    }).expect(201);

    const driver = await prisma.user.findUnique({ where: { phone: driverPhone } });
    if (!driver) {
      throw new Error('Driver not created');
    }

    driverId = driver.id;

    await prisma.driverProfile.upsert({
      where: { userId: driver.id },
      update: { status: DriverStatus.verified, verifiedAt: new Date(), rejectionReason: null },
      create: { userId: driver.id, status: DriverStatus.verified, verifiedAt: new Date() },
    });
    await prisma.user.update({ where: { id: driver.id }, data: { role: Role.driver } });

    const login = await request(app.getHttpServer()).post('/auth/login').send({
      phone: driverPhone,
      password,
    }).expect(201);

    driverToken = login.body.data.data.accessToken;
  });

  it('creates vehicle for verified driver', async () => {
    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        make: 'Chevrolet',
        model: 'Cobalt',
        plateNo: '01A123BB',
        color: 'White',
        seats: 4,
      })
      .expect(201);
  });

  it('creates and publishes trip', async () => {
    const vehicle = await prisma.vehicle.findFirst({ where: { userId: driverId } });
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const createTrip = await request(app.getHttpServer())
      .post('/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        vehicleId: vehicle.id,
        fromCityId,
        toCityId,
        departureAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        seatsTotal: 4,
        price: 100000,
        currency: 'UZS',
      })
      .expect(201);

    tripId = createTrip.body.data.id;

    await request(app.getHttpServer())
      .patch(`/trips/${tripId}/publish`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ notes: 'Published for tests' })
      .expect(200);
  });

  it('searches trips and creates request', async () => {
    const search = await request(app.getHttpServer()).get('/trips').expect(200);
    expect(search.body.data.items.length).toBeGreaterThan(0);

    const reqRes = await request(app.getHttpServer())
      .post(`/trips/${tripId}/requests`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        seats: 1,
        price: 90000,
        currency: 'UZS',
        message: 'Need a seat',
      })
      .expect(201);

    requestId = reqRes.body.data.id;
  });

  it('negotiates offers turn-by-turn and accepts', async () => {
    const offer1 = await request(app.getHttpServer())
      .post(`/offers/requests/${requestId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ price: 100000 })
      .expect(201);
    lastOfferId = offer1.body.data.id;

    const offer2 = await request(app.getHttpServer())
      .post(`/offers/requests/${requestId}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ price: 95000 })
      .expect(201);
    lastOfferId = offer2.body.data.id;

    const offer3 = await request(app.getHttpServer())
      .post(`/offers/requests/${requestId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ price: 98000 })
      .expect(201);
    lastOfferId = offer3.body.data.id;

    const offer4 = await request(app.getHttpServer())
      .post(`/offers/requests/${requestId}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ price: 96000 })
      .expect(201);
    lastOfferId = offer4.body.data.id;

    const offer5 = await request(app.getHttpServer())
      .post(`/offers/requests/${requestId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ price: 97000 })
      .expect(201);
    lastOfferId = offer5.body.data.id;

    const offer6 = await request(app.getHttpServer())
      .post(`/offers/requests/${requestId}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ price: 96500 })
      .expect(201);
    lastOfferId = offer6.body.data.id;

    const negotiation = await request(app.getHttpServer())
      .get(`/requests/${requestId}/negotiation`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    expect(negotiation.body.data.state).toBe('active');

    const accept = await request(app.getHttpServer())
      .patch(`/offers/${lastOfferId}/accept`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ note: 'Deal' })
      .expect(200);

    bookingId = accept.body.data.bookingId;
  });

  it('creates booking and decrements seats', async () => {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking).not.toBeNull();

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    expect(trip?.seatsAvailable).toBe(3);
  });

  it('starts and completes trip', async () => {
    await request(app.getHttpServer())
      .patch(`/trips/${tripId}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/trips/${tripId}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);
  });

  it('dispatches outbox events', async () => {
    await dispatcher.dispatchOnce(10, 60_000);

    const outbox = await prisma.outboxEvent.findMany({
      where: { status: OutboxStatus.DONE },
    });

    expect(outbox.length).toBeGreaterThan(0);
  });
});

async function resetDatabase(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Notification",
      "OutboxEvent",
      "PaymentEvent",
      "PaymentAttempt",
      "Payment",
      "Booking",
      "Offer",
      "NegotiationSession",
      "TripRequest",
      "Trip",
      "Vehicle",
      "DriverProfile",
      "UserProfile",
      "UserSession",
      "Device",
      "City",
      "AuditLog",
      "User"
    CASCADE;
  `);
}
