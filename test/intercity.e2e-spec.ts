import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import { execSync } from 'node:child_process';
import { PrismaClient, DriverStatus, OutboxStatus, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import request, { type Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { bootstrapApp } from '../src/app.bootstrap';
import { OutboxDispatcher } from '../src/outbox/outbox.dispatcher';

jest.setTimeout(120_000);

type ApiEnvelope<T> = { data: T };

type AuthLoginPayload = { accessToken: string };
type AuthMePayload = { user: { id?: string; sub?: string } };
type TripSearchPayload = { items: Array<{ id: string }>; total?: number };
type TripPayload = { id: string };
type RequestPayload = { id: string };
type OfferPayload = { id: string };
type NegotiationPayload = { state: string };
type AcceptOfferPayload = { bookingId: string; requestId?: string };
type BookingsPayload = { items: Array<{ id: string }> };

type PgError = { code?: string; message?: string };
type RequestApp = Parameters<typeof request>[0];
type ApiClient = ReturnType<typeof request>;

const getData = <T>(res: Response): T => {
  const body = res.body as Partial<ApiEnvelope<unknown>>;
  const raw: unknown =
    body && typeof body === 'object' && 'data' in body ? body.data : res.body;

  if (raw && typeof raw === 'object' && 'ok' in raw && 'data' in raw) {
    return (raw as ApiEnvelope<T>).data;
  }

  return raw as T;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isPgError = (error: unknown): error is PgError =>
  isRecord(error) && typeof error.code === 'string';

const getPgError = (error: unknown): PgError | undefined => {
  if (isPgError(error)) return error;
  if (
    error instanceof AggregateError ||
    (isRecord(error) && 'errors' in error)
  ) {
    const errors = (error as AggregateError & { errors?: unknown[] }).errors;
    if (Array.isArray(errors)) {
      return errors.find(isPgError);
    }
  }
  return undefined;
};

const isPgConnectionError = (error: PgError | undefined): boolean =>
  Boolean(
    error?.code &&
    ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(
      error.code,
    ),
  );

const formatPgHost = (url: URL): string => {
  const host = url.hostname || 'localhost';
  const port = url.port || '5432';
  return `${host}:${port}`;
};

const sanitizePgConnectionString = (connectionString: string): string => {
  const url = new URL(connectionString);
  url.searchParams.delete('schema');
  return url.toString();
};

describe('Intercity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let dispatcher: OutboxDispatcher;
  let outboxQueue: Queue | null = null;
  let api: ApiClient;
  let prismaPool: Pool | null = null;

  let driverToken: string;
  let passengerToken: string;
  let driverId: string;
  let tripId: string;
  let requestId: string;
  let bookingId: string;
  let lastOfferId: string;
  let fromCityId: string;
  let toCityId: string;
  let basePath = '';

  const driverPhone = '+998900000001';
  const passengerPhone = '+998900000002';
  const password = 'Password123!';
  const apiPath = (path: string) => `${basePath}${path}`;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const databaseUrl =
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/intercity_test?schema=public';
    const shadowUrl =
      process.env.SHADOW_DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/intercity_shadow?schema=public';

    process.env.DATABASE_URL = databaseUrl;
    process.env.SHADOW_DATABASE_URL = shadowUrl;
    process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
    process.env.JWT_ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_123456';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_123456';
    process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '900';
    process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '2592000';
    process.env.BOOKING_CANCEL_FEE_PERCENT =
      process.env.BOOKING_CANCEL_FEE_PERCENT ?? '10';
    process.env.OFFERS_MAX_DRIVER = process.env.OFFERS_MAX_DRIVER ?? '3';
    process.env.OFFERS_MAX_PASSENGER = process.env.OFFERS_MAX_PASSENGER ?? '3';
    process.env.API_PREFIX = process.env.API_PREFIX ?? 'api';

    const prefix = process.env.API_PREFIX ?? 'api';
    basePath = prefix ? `/${prefix}` : '';

    await ensureDatabaseExists(databaseUrl);
    await ensureDatabaseExists(shadowUrl);

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        SHADOW_DATABASE_URL: shadowUrl,
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    bootstrapApp(app);
    await app.init();

    dispatcher = app.get(OutboxDispatcher);
    outboxQueue = app.get<Queue>(getQueueToken('domain-events'));

    const httpServer = app.getHttpServer() as unknown as RequestApp;
    api = request(httpServer);

    prismaPool = new Pool({ connectionString: databaseUrl });
    prisma = new PrismaClient({ adapter: new PrismaPg(prismaPool) });
    await resetDatabase(prisma);

    const cities = await prisma.city.createMany({
      data: [
        {
          name: 'Tashkent',
          countryCode: 'UZ',
          region: 'Tashkent',
          timezone: 'Asia/Tashkent',
        },
        {
          name: 'Samarkand',
          countryCode: 'UZ',
          region: 'Samarkand',
          timezone: 'Asia/Tashkent',
        },
      ],
    });
    if (!cities.count) {
      const existing = await prisma.city.findMany({
        where: { countryCode: 'UZ' },
      });
      fromCityId = existing[0].id;
      toCityId = existing[1].id;
    } else {
      const [from, to] = await prisma.city.findMany({
        orderBy: { name: 'asc' },
      });
      fromCityId = from.id;
      toCityId = to.id;
    }
  });

  afterAll(async () => {
    await outboxQueue?.close();
    await app?.close();
    await prisma?.$disconnect();
    await prismaPool?.end();
  });

  it('registers and logs in passenger', async () => {
    await api
      .post(apiPath('/auth/register'))
      .send({
        phone: passengerPhone,
        password,
      })
      .expect(201);

    const login = await api
      .post(apiPath('/auth/login'))
      .send({
        phone: passengerPhone,
        password,
      })
      .expect(201);

    const loginData = getData<AuthLoginPayload>(login);
    passengerToken = loginData.accessToken;

    const me = await api
      .get(apiPath('/auth/me'))
      .set('Authorization', `Bearer ${passengerToken}`)
      .expect(200);

    const meData = getData<AuthMePayload>(me);
    const meId = meData.user.sub ?? meData.user.id;
    expect(meId).toBeTruthy();
  });

  it('registers and logs in driver', async () => {
    await api
      .post(apiPath('/auth/register'))
      .send({
        phone: driverPhone,
        password,
      })
      .expect(201);

    const driver = await prisma.user.findUnique({
      where: { phone: driverPhone },
    });
    if (!driver) {
      throw new Error('Driver not created');
    }

    driverId = driver.id;

    await prisma.driverProfile.upsert({
      where: { userId: driver.id },
      update: {
        status: DriverStatus.verified,
        verifiedAt: new Date(),
        rejectionReason: null,
      },
      create: {
        userId: driver.id,
        status: DriverStatus.verified,
        verifiedAt: new Date(),
      },
    });
    await prisma.user.update({
      where: { id: driver.id },
      data: { role: Role.driver },
    });

    const login = await api
      .post(apiPath('/auth/login'))
      .send({
        phone: driverPhone,
        password,
      })
      .expect(201);

    const loginData = getData<AuthLoginPayload>(login);
    driverToken = loginData.accessToken;
  });

  it('creates vehicle for verified driver', async () => {
    await api
      .post(apiPath('/vehicles'))
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
    const vehicle = await prisma.vehicle.findFirst({
      where: { userId: driverId },
    });
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const createTrip = await api
      .post(apiPath('/trips'))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        vehicleId: vehicle.id,
        fromCityId,
        toCityId,
        departureAt: new Date(
          Date.now() + 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        seatsTotal: 4,
        price: 100000,
        currency: 'UZS',
      })
      .expect(201);

    const tripData = getData<TripPayload>(createTrip);
    tripId = tripData.id;

    await api
      .patch(apiPath(`/trips/${tripId}/publish`))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ notes: 'Published for tests' })
      .expect(200);
  });

  it('blocks passenger from driver trip actions', async () => {
    await api
      .patch(apiPath(`/trips/${tripId}/start`))
      .set('Authorization', `Bearer ${passengerToken}`)
      .expect(403);
  });

  it('searches trips and creates request', async () => {
    const search = await api.get(apiPath('/trips/search')).expect(200);
    const searchData = getData<TripSearchPayload>(search);
    expect(searchData.items.length).toBeGreaterThan(0);

    const reqRes = await api
      .post(apiPath(`/trips/${tripId}/requests`))
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        seats: 1,
        price: 90000,
        currency: 'UZS',
        message: 'Need a seat',
      });

    if (reqRes.status !== 201) {
      throw new Error(`create request failed: ${JSON.stringify(reqRes.body)}`);
    }

    const requestData = getData<RequestPayload>(reqRes);
    requestId = requestData.id;
  });

  it('negotiates offers turn-by-turn and accepts', async () => {
    const offer1 = await api
      .post(apiPath(`/requests/${requestId}/offers`))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ price: 100000 })
      .expect(201);
    lastOfferId = getData<OfferPayload>(offer1).id;

    await api
      .post(apiPath(`/requests/${requestId}/offers`))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ price: 99000 })
      .expect(400);

    const offer2 = await api
      .post(apiPath(`/requests/${requestId}/offers`))
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ price: 95000 })
      .expect(201);
    lastOfferId = getData<OfferPayload>(offer2).id;

    const offer3 = await api
      .post(apiPath(`/requests/${requestId}/offers`))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ price: 98000 })
      .expect(201);
    lastOfferId = getData<OfferPayload>(offer3).id;

    const offer4 = await api
      .post(apiPath(`/requests/${requestId}/offers`))
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ price: 96000 })
      .expect(201);
    lastOfferId = getData<OfferPayload>(offer4).id;

    const offer5 = await api
      .post(apiPath(`/requests/${requestId}/offers`))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ price: 97000 })
      .expect(201);
    lastOfferId = getData<OfferPayload>(offer5).id;

    const offer6 = await api
      .post(apiPath(`/requests/${requestId}/offers`))
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ price: 96500 })
      .expect(201);
    lastOfferId = getData<OfferPayload>(offer6).id;

    const negotiation = await api
      .get(apiPath(`/requests/${requestId}/negotiation`))
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    const negotiationData = getData<NegotiationPayload>(negotiation);
    expect(negotiationData.state).toBe('active');

    const accept = await api
      .patch(apiPath(`/offers/${lastOfferId}/accept`))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ note: 'Deal' })
      .expect(200);

    const acceptData = getData<AcceptOfferPayload>(accept);
    bookingId = acceptData.bookingId;
  });

  it('creates booking and decrements seats', async () => {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    expect(booking).not.toBeNull();

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    expect(trip?.seatsAvailable).toBe(3);
  });

  it('lists bookings via aliases', async () => {
    const passengerBookings = await api
      .get(apiPath('/bookings/my'))
      .set('Authorization', `Bearer ${passengerToken}`)
      .expect(200);
    const passengerData = getData<BookingsPayload>(passengerBookings);
    expect(passengerData.items.length).toBeGreaterThan(0);

    const driverBookings = await api
      .get(apiPath('/driver/bookings'))
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);
    const driverData = getData<BookingsPayload>(driverBookings);
    expect(driverData.items.length).toBeGreaterThan(0);
  });

  it('starts and completes trip', async () => {
    await api
      .patch(apiPath(`/trips/${tripId}/start`))
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    await api
      .patch(apiPath(`/trips/${tripId}/complete`))
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);
  });

  it('dispatches outbox events', async () => {
    await dispatcher.dispatchOnce(10, 60_000);
    const outbox = await waitForOutboxDone(prisma);

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

async function waitForOutboxDone(
  prisma: PrismaClient,
  timeoutMs = 5_000,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const outbox = await prisma.outboxEvent.findMany({
      where: { status: OutboxStatus.DONE },
    });
    if (outbox.length > 0) return outbox;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return prisma.outboxEvent.findMany({
    where: { status: OutboxStatus.DONE },
  });
}

async function ensureDatabaseExists(connectionString: string) {
  if (!connectionString) return;
  const url = new URL(connectionString);
  const dbName = url.pathname.replace('/', '');
  if (!dbName) return;
  const hostLabel = formatPgHost(url);

  const targetPool = new Pool({
    connectionString: sanitizePgConnectionString(connectionString),
    connectionTimeoutMillis: 2000,
  });
  try {
    await targetPool.query('SELECT 1');
    return;
  } catch (error) {
    const pgError = getPgError(error);
    if (isPgConnectionError(pgError)) {
      throw new Error(
        `Postgres is not reachable at ${hostLabel}. Start Docker Desktop and run "docker compose up -d postgres redis", or update DATABASE_URL.`,
      );
    }
    if (pgError?.code !== '3D000') {
      throw error;
    }
  } finally {
    await targetPool.end();
  }

  const adminUrl = new URL(sanitizePgConnectionString(connectionString));
  adminUrl.pathname = '/postgres';

  const adminPool = new Pool({
    connectionString: adminUrl.toString(),
    connectionTimeoutMillis: 2000,
  });
  try {
    await adminPool.query(`CREATE DATABASE "${dbName}"`);
  } catch (error) {
    const pgError = getPgError(error);
    if (isPgConnectionError(pgError)) {
      throw new Error(
        `Postgres is not reachable at ${hostLabel}. Start Docker Desktop and run "docker compose up -d postgres redis", or update DATABASE_URL.`,
      );
    }
    if (pgError?.code === '42P04') return;
    if (pgError?.code === '42501') {
      throw new Error(
        `No permission to create database "${dbName}". Create it manually or grant CREATEDB.`,
      );
    }
    throw error;
  } finally {
    await adminPool.end();
  }
}
