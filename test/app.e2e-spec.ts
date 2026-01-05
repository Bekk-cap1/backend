process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_123456';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_123456';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/postgres?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getQueueToken } from '@nestjs/bullmq';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { OutboxDispatcher } from '../src/outbox/outbox.dispatcher';

const DRIVER_PHONE = '+10000000001';
const PASSENGER_PHONE = '+10000000002';
const PASSWORD = 'test-password-123';

describe('E2E flows', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService & Record<string, any>;
  let outboxDispatcher: OutboxDispatcher;
  let queueAdd: jest.Mock;

  let driverToken: string;
  let passengerToken: string;

  let fromCityId: string;
  let toCityId: string;
  let vehicleId: string;
  let tripId: string;
  let requestId: string;
  let offerId: string;
  let bookingId: string;

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  const resetDb = async () => {
    await prisma.$transaction([
      prisma.paymentEvent.deleteMany(),
      prisma.paymentAttempt.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.booking.deleteMany(),
      prisma.offer.deleteMany(),
      prisma.tripRequest.deleteMany(),
      prisma.trip.deleteMany(),
      prisma.vehicle.deleteMany(),
      prisma.driverProfile.deleteMany(),
      prisma.userSession.deleteMany(),
      prisma.userProfile.deleteMany(),
      prisma.device.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.outboxEvent.deleteMany(),
      prisma.city.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  };

  const login = async (phone: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone, password });

    return res.body.data;
  };

  beforeAll(async () => {
    queueAdd = jest.fn().mockResolvedValue({});

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('domain-events'))
      .useValue({ add: queueAdd })
      .overrideProvider(RedisService)
      .useValue({ raw: {}, ping: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    outboxDispatcher = app.get(OutboxDispatcher);

    await resetDb();

    const fromCity = await prisma.city.create({
      data: { name: 'Tashkent', countryCode: 'UZ' },
    });
    const toCity = await prisma.city.create({
      data: { name: 'Samarkand', countryCode: 'UZ' },
    });

    fromCityId = fromCity.id;
    toCityId = toCity.id;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: DRIVER_PHONE, password: PASSWORD })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: PASSENGER_PHONE, password: PASSWORD })
      .expect(201);

    const driver = await prisma.user.findUniqueOrThrow({
      where: { phone: DRIVER_PHONE },
    });
    await prisma.user.update({
      where: { id: driver.id },
      data: { role: 'driver' },
    });

    await prisma.driverProfile.create({
      data: {
        userId: driver.id,
        status: 'verified',
        verifiedAt: new Date(),
      },
    });

    driverToken = (await login(DRIVER_PHONE, PASSWORD)).accessToken;
    passengerToken = (await login(PASSENGER_PHONE, PASSWORD)).accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('login -> /auth/me', async () => {
    const loginData = await login(PASSENGER_PHONE, PASSWORD);

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set(authHeader(loginData.accessToken))
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.user.id).toBeDefined();
  });

  it('vehicle -> trip -> publish: create vehicle', async () => {
    const res = await request(app.getHttpServer())
      .post('/vehicles')
      .set(authHeader(driverToken))
      .send({
        make: 'Toyota',
        model: 'Camry',
        plateNo: 'E2E-001',
        color: 'black',
        seats: 4,
      })
      .expect(201);

    vehicleId = res.body.id;
    expect(vehicleId).toBeDefined();
  });

  it('vehicle -> trip -> publish: create trip', async () => {
    const departureAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const res = await request(app.getHttpServer())
      .post('/trips')
      .set(authHeader(driverToken))
      .send({
        fromCityId,
        toCityId,
        vehicleId,
        departureAt,
        seatsTotal: 3,
        price: 15000,
      })
      .expect(201);

    tripId = res.body.id;
    expect(res.body.status).toBe('draft');
  });

  it('vehicle -> trip -> publish: publish trip', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/trips/${tripId}/publish`)
      .set(authHeader(driverToken))
      .send({ notes: 'ready to go' })
      .expect(200);

    expect(res.body.status).toBe('published');
  });

  it('search -> request -> offers -> accept: search trips', async () => {
    const res = await request(app.getHttpServer())
      .get('/trips')
      .query({ fromCityId, toCityId })
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.some((trip: any) => trip.id === tripId)).toBe(true);
  });

  it('search -> request -> offers -> accept: create request', async () => {
    const res = await request(app.getHttpServer())
      .post(`/trips/${tripId}/requests`)
      .set(authHeader(passengerToken))
      .send({ seats: 1, price: 15000, message: 'Need one seat' })
      .expect(201);

    requestId = res.body.id;
    expect(res.body.status).toBe('pending');
  });

  it('search -> request -> offers -> accept: create offer', async () => {
    const res = await request(app.getHttpServer())
      .post(`/offers/requests/${requestId}`)
      .set(authHeader(passengerToken))
      .send({ price: 14000, message: 'Can we do 14k?' })
      .expect(201);

    offerId = res.body.id;
    expect(res.body.status).toBe('active');
  });

  it('search -> request -> offers -> accept: accept offer', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/offers/${offerId}/accept`)
      .set(authHeader(driverToken))
      .send({ note: 'deal' })
      .expect(200);

    expect(res.body.ok).toBe(true);
    bookingId = res.body.bookingId;
    expect(bookingId).toBeDefined();
  });

  it('booking created', async () => {
    const res = await request(app.getHttpServer())
      .get(`/bookings/${bookingId}`)
      .set(authHeader(passengerToken))
      .expect(200);

    expect(res.body.status).toBe('confirmed');
    expect(res.body.passengerId).toBeDefined();
  });

  it('trip start', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/trips/${tripId}/start`)
      .set(authHeader(driverToken))
      .expect(200);

    expect(res.body.status).toBe('started');
  });

  it('trip complete', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/trips/${tripId}/complete`)
      .set(authHeader(driverToken))
      .expect(200);

    expect(res.body.ok).toBe(true);
  });

  it('outbox event dispatch', async () => {
    const pending = await prisma.outboxEvent.findMany({
      where: { status: 'pending' },
    });
    expect(pending.length).toBeGreaterThan(0);

    const result = await outboxDispatcher.dispatchOnce();

    expect(queueAdd).toHaveBeenCalled();
    expect(result.dispatched).toBeGreaterThan(0);

    const sentCount = await prisma.outboxEvent.count({
      where: { status: 'sent' },
    });
    expect(sentCount).toBeGreaterThanOrEqual(result.dispatched);
  });
});
