import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { PrismaClient, DriverStatus, OutboxStatus, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import request, { type Response } from 'supertest';
import type { OutboxDispatcher } from '../src/outbox/outbox.dispatcher';
import { makeUniqueUser } from './helpers/e2e-user';

jest.setTimeout(120_000);

type ApiEnvelope<T> = { data: T };

type AuthLoginPayload = { accessToken: string };
type AuthMePayload = { user: { id?: string; sub?: string } };
type AdminReauthPayload = { confirmToken: string; expiresAt: string };
type TripSearchPayload = { items: Array<{ id: string }>; total?: number };
type TripPayload = { id: string };
type RequestPayload = { id: string };
type OfferPayload = { id: string };
type NegotiationPayload = { state: string };
type AcceptOfferPayload = { bookingId: string; requestId?: string };
type BookingsPayload = { items: Array<{ id: string }> };
type PoiPayload = { id: string; type: string; lat: number; lon: number };
type PoiReportPayload = { id: string; status: string };
type FareQuotePayload = {
  quoteId: string;
  provider: string;
  amount: number;
  distanceMeters: number;
  durationSeconds: number;
};
type PaymentIntentPayload = {
  payment: { id: string; status: string };
};

type PgError = { code?: string; message?: string };
type RequestApp = Parameters<typeof request>[0];
type ApiClient = ReturnType<typeof request>;
const requireModule = createRequire(__filename);

const getData = <T>(res: Response): T => {
  const body = res.body as unknown as Partial<ApiEnvelope<unknown>>;
  const raw: unknown =
    body && typeof body === 'object' && 'data' in body
      ? body.data
      : (res.body as unknown);

  if (raw && typeof raw === 'object' && 'ok' in raw && 'data' in raw) {
    return (raw as ApiEnvelope<T>).data;
  }

  return raw as T;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const redactKeys = new Set([
  'accessToken',
  'refreshToken',
  'token',
  'authorization',
  'Authorization',
]);

const formatResponseBody = (body: unknown): string => {
  const replacer = (key: string, value: unknown): unknown =>
    redactKeys.has(key) ? '[REDACTED]' : value;

  try {
    const result: string | undefined = JSON.stringify(body, replacer);
    return typeof result === 'string' ? result : String(body);
  } catch {
    return String(body);
  }
};

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
  let cancelPassengerToken: string;
  let adminToken: string;
  let driverId: string;
  let tripId: string;
  let requestId: string;
  let cancelRequestId: string;
  let bookingId: string;
  let lastOfferId: string;
  let fromCityId: string;
  let toCityId: string;
  let basePath = '';

  const driverUser = makeUniqueUser('driver');
  const passengerUser = makeUniqueUser('passenger');
  const cancelPassengerUser = makeUniqueUser('cancel');
  const adminUser = makeUniqueUser('admin');
  const managedUser = makeUniqueUser('managed');
  const bruteForceUser = makeUniqueUser('bruteforce');
  const apiPath = (path: string) => `${basePath}${path}`;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const databaseUrl =
      process.env.DATABASE_URL_TEST ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/intercity_test?schema=public';
    const shadowUrl =
      process.env.SHADOW_DATABASE_URL_TEST ??
      process.env.SHADOW_DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/intercity_shadow?schema=public';

    process.env.DATABASE_URL = databaseUrl;
    process.env.SHADOW_DATABASE_URL = shadowUrl;
    process.env.REDIS_URL =
      process.env.REDIS_URL_TEST ??
      process.env.REDIS_URL ??
      'redis://localhost:6379';
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
    process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ?? '1000';
    process.env.RATE_LIMIT_AUTH_MAX = process.env.RATE_LIMIT_AUTH_MAX ?? '1000';
    process.env.RATE_LIMIT_AUTH_LOGIN_MAX =
      process.env.RATE_LIMIT_AUTH_LOGIN_MAX ?? '1000';
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

    const { AppModule } = requireModule(
      '../src/app.module',
    ) as typeof import('../src/app.module');
    const { bootstrapApp } = requireModule(
      '../src/app.bootstrap',
    ) as typeof import('../src/app.bootstrap');
    const { OutboxDispatcher } = requireModule(
      '../src/outbox/outbox.dispatcher',
    ) as typeof import('../src/outbox/outbox.dispatcher');

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
    const register = await api.post(apiPath('/auth/register')).send({
      phone: passengerUser.phone,
      password: passengerUser.password,
      fullName: passengerUser.fullName,
      acceptTerms: true,
    });
    if (register.status !== 201) {
      throw new Error(
        `register passenger failed: ${register.status} ${formatResponseBody(
          register.body,
        )}`,
      );
    }

    const login = await api
      .post(apiPath('/auth/login'))
      .send({
        phone: passengerUser.phone,
        password: passengerUser.password,
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
    const register = await api.post(apiPath('/auth/register')).send({
      phone: driverUser.phone,
      password: driverUser.password,
      fullName: driverUser.fullName,
      acceptTerms: true,
    });
    if (register.status !== 201) {
      throw new Error(
        `register driver failed: ${register.status} ${formatResponseBody(
          register.body,
        )}`,
      );
    }

    const driver = await prisma.user.findUnique({
      where: { phone: driverUser.phone },
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
        phone: driverUser.phone,
        password: driverUser.password,
      })
      .expect(201);

    const loginData = getData<AuthLoginPayload>(login);
    driverToken = loginData.accessToken;
  });

  it('registers and logs in passenger for cancel flow', async () => {
    const register = await api.post(apiPath('/auth/register')).send({
      phone: cancelPassengerUser.phone,
      password: cancelPassengerUser.password,
      fullName: cancelPassengerUser.fullName,
      acceptTerms: true,
    });
    if (register.status !== 201) {
      throw new Error(
        `register cancel passenger failed: ${register.status} ${formatResponseBody(
          register.body,
        )}`,
      );
    }

    const login = await api
      .post(apiPath('/auth/login'))
      .send({
        phone: cancelPassengerUser.phone,
        password: cancelPassengerUser.password,
      })
      .expect(201);

    const loginData = getData<AuthLoginPayload>(login);
    cancelPassengerToken = loginData.accessToken;
  });

  it('registers and logs in superadmin', async () => {
    const register = await api.post(apiPath('/auth/register')).send({
      phone: adminUser.phone,
      password: adminUser.password,
      fullName: adminUser.fullName,
      acceptTerms: true,
    });
    if (register.status !== 201) {
      throw new Error(
        `register admin failed: ${register.status} ${formatResponseBody(
          register.body,
        )}`,
      );
    }

    const adminRecord = await prisma.user.findUnique({
      where: { phone: adminUser.phone },
    });
    if (!adminRecord) {
      throw new Error('Admin not created');
    }

    await prisma.user.update({
      where: { id: adminRecord.id },
      data: { role: Role.superadmin },
    });

    const login = await api
      .post(apiPath('/auth/login'))
      .send({
        phone: adminUser.phone,
        password: adminUser.password,
      })
      .expect(201);

    adminToken = getData<AuthLoginPayload>(login).accessToken;
  });

  it('rate-limits repeated failed logins with 429', async () => {
    await api.post(apiPath('/auth/register')).send({
      phone: bruteForceUser.phone,
      password: bruteForceUser.password,
      fullName: bruteForceUser.fullName,
      acceptTerms: true,
    });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const res = await api.post(apiPath('/auth/login')).send({
        phone: bruteForceUser.phone,
        password: 'wrong_password',
      });
      expect(res.status).toBe(401);
    }

    const lock = await api.post(apiPath('/auth/login')).send({
      phone: bruteForceUser.phone,
      password: 'wrong_password',
    });
    expect(lock.status).toBe(429);

    const whileLocked = await api.post(apiPath('/auth/login')).send({
      phone: bruteForceUser.phone,
      password: bruteForceUser.password,
    });
    expect(whileLocked.status).toBe(429);
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

  it('builds deterministic route via mock provider', async () => {
    const route = await api
      .get(apiPath('/routing/route'))
      .query({
        fromLat: 41.2995,
        fromLon: 69.2401,
        toLat: 39.6542,
        toLon: 66.9597,
      })
      .expect(200);

    const data = getData<{
      provider: string;
      polyline: string;
      distanceMeters: number;
      durationSeconds: number;
    }>(route);

    expect(data.provider).toBe('mock');
    expect(data.polyline).toContain(';');
    expect(data.distanceMeters).toBeGreaterThan(0);
    expect(data.durationSeconds).toBeGreaterThan(0);
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

  it('updates and fetches driver location + eta', async () => {
    const lat = 41.3123;
    const lon = 69.2781;

    const update = await api
      .patch(apiPath(`/geo/trips/${tripId}/location`))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ lat, lon, speedKmh: 60, headingDeg: 90 })
      .expect(200);

    const updated = getData<{ lat: number; lon: number }>(update);
    expect(updated.lat).toBe(lat);
    expect(updated.lon).toBe(lon);

    const fetched = await api
      .get(apiPath(`/geo/trips/${tripId}/location`))
      .set('Authorization', `Bearer ${passengerToken}`)
      .expect(200);
    const fetchedData = getData<{ lat: number; lon: number }>(fetched);
    expect(fetchedData.lat).toBe(lat);
    expect(fetchedData.lon).toBe(lon);

    const eta = await api
      .get(apiPath(`/routing/trip/${tripId}/eta`))
      .expect(200);
    const etaData = getData<{
      tripId: string;
      provider: string;
      etaSeconds: number;
      distanceMeters: number;
    }>(eta);
    expect(etaData.tripId).toBe(tripId);
    expect(etaData.provider).toBe('mock');
    expect(etaData.etaSeconds).toBeGreaterThan(0);
  });

  it('creates and cancels a passenger request', async () => {
    const reqRes = await api
      .post(apiPath(`/trips/${tripId}/requests`))
      .set('Authorization', `Bearer ${cancelPassengerToken}`)
      .send({
        seats: 1,
        price: 88000,
        currency: 'UZS',
        message: 'Will cancel',
      })
      .expect(201);

    cancelRequestId = getData<RequestPayload>(reqRes).id;

    await api
      .post(apiPath(`/requests/${cancelRequestId}/cancel`))
      .set('Authorization', `Bearer ${cancelPassengerToken}`)
      .expect(200);
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

  it('creates poi, searches nearby and along route', async () => {
    const createPoi = await api
      .post(apiPath('/admin/poi'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Camera #1',
        type: 'speed_camera',
        description: 'Test radar',
        lat: 41.3123,
        lon: 69.2781,
        radiusMeters: 1000,
      })
      .expect(201);
    const poi = getData<PoiPayload>(createPoi);
    expect(poi.id).toBeTruthy();

    const nearby = await api
      .get(apiPath('/poi/nearby'))
      .query({ lat: 41.3123, lon: 69.2781, radiusMeters: 1500 })
      .expect(200);
    const nearbyData = getData<Array<{ id: string }>>(nearby);
    expect(nearbyData.some((x) => x.id === poi.id)).toBe(true);

    const alongRoute = await api
      .post(apiPath('/poi/route'))
      .send({
        polyline: '41.3123,69.2781;41.3000,69.2400',
        bufferMeters: 1500,
      })
      .expect(201);
    const alongData = getData<Array<{ id: string }>>(alongRoute);
    expect(alongData.some((x) => x.id === poi.id)).toBe(true);
  });

  it('creates and moderates poi report', async () => {
    const report = await api
      .post(apiPath('/poi/reports'))
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        type: 'hazard',
        lat: 41.321,
        lon: 69.286,
        description: 'Road works',
      })
      .expect(201);
    const reportData = getData<PoiReportPayload>(report);
    expect(reportData.status).toBe('pending');

    const reports = await api
      .get(apiPath('/admin/poi/reports'))
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const listData = getData<{ items: Array<{ id: string }> }>(reports);
    expect(listData.items.some((r) => r.id === reportData.id)).toBe(true);

    await api
      .post(apiPath(`/admin/poi/reports/${reportData.id}/approve`))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Looks valid' })
      .expect(201);
  });

  it('creates fare quote and exposes cancellation quote', async () => {
    const quote = await api
      .post(apiPath('/payments/quote'))
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripId, seats: 1 })
      .expect(201);
    const quoteData = getData<FareQuotePayload>(quote);
    expect(quoteData.provider).toBe('mock');
    expect(quoteData.amount).toBeGreaterThan(0);

    const quotes = await api
      .get(apiPath('/payments/quotes/me'))
      .set('Authorization', `Bearer ${passengerToken}`)
      .expect(200);
    const quotesData = getData<Array<{ id: string }>>(quotes);
    expect(quotesData.length).toBeGreaterThan(0);

    const cancelQuote = await api
      .get(apiPath(`/cancellations/bookings/${bookingId}/quote`))
      .set('Authorization', `Bearer ${passengerToken}`)
      .expect(200);
    const cancelQuoteData = getData<{
      feePercent: number;
      feeAmount: number;
      refundAmount: number;
    }>(cancelQuote);
    expect(cancelQuoteData.feePercent).toBeGreaterThanOrEqual(0);
    expect(cancelQuoteData.refundAmount).toBeGreaterThanOrEqual(0);
  });

  it('creates payment intent and marks payment as paid idempotently', async () => {
    const intent = await api
      .post(apiPath(`/payments/booking/${bookingId}/intent`))
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ provider: 'click', idempotencyKey: `intent-${bookingId}` })
      .expect(201);

    const paymentId = getData<PaymentIntentPayload>(intent).payment.id;
    expect(paymentId).toBeTruthy();

    const markPaidFirst = await api
      .post(apiPath(`/payments/${paymentId}/mark-paid`))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        note: 'Paid in test',
        idempotencyKey: `mark-paid-${paymentId}`,
      })
      .expect(201);
    expect(
      getData<{ payment: { status: string } }>(markPaidFirst).payment.status,
    ).toBe('paid');

    const markPaidSecond = await api
      .post(apiPath(`/payments/${paymentId}/mark-paid`))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        note: 'Paid in test retry',
        idempotencyKey: `mark-paid-${paymentId}`,
      })
      .expect(201);
    const idempotentData = getData<{ idempotent?: boolean }>(markPaidSecond);
    expect(idempotentData.idempotent).toBe(true);

    const reconciliation = await api
      .get(apiPath('/v1/admin/payments/reconciliation'))
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const recData = getData<{ totals: { count: number } }>(reconciliation);
    expect(recData.totals.count).toBeGreaterThan(0);
  });

  it('creates support ticket and admin can list it', async () => {
    await api
      .post(apiPath('/support/tickets'))
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        bookingId,
        subject: 'Need help',
        message: 'Please check booking details',
      })
      .expect(201);

    const tickets = await api
      .get(apiPath('/v1/admin/tickets'))
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const ticketsData = getData<{ items: Array<{ bookingId: string | null }> }>(
      tickets,
    );
    expect(ticketsData.items.some((t) => t.bookingId === bookingId)).toBe(true);
  });

  it('supports superadmin reauth, impersonation and dangerous delete with audit', async () => {
    const registerManaged = await api.post(apiPath('/auth/register')).send({
      phone: managedUser.phone,
      password: managedUser.password,
      fullName: managedUser.fullName,
      acceptTerms: true,
    });
    if (registerManaged.status !== 201) {
      throw new Error(
        `register managed user failed: ${registerManaged.status} ${formatResponseBody(
          registerManaged.body,
        )}`,
      );
    }

    const managedRecord = await prisma.user.findUnique({
      where: { phone: managedUser.phone },
      select: { id: true },
    });
    if (!managedRecord) throw new Error('Managed user not created');

    await api
      .delete(apiPath(`/v1/admin/users/${managedRecord.id}`))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'cleanup user for tests' })
      .expect(403);

    const reauthForImpersonation = await api
      .post(apiPath('/v1/admin/reauth'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: adminUser.password })
      .expect(201);
    const confirmImpersonation = getData<AdminReauthPayload>(
      reauthForImpersonation,
    ).confirmToken;

    const impersonation = await api
      .post(apiPath('/v1/admin/impersonate'))
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Confirm', confirmImpersonation)
      .send({
        userId: managedRecord.id,
        reason: 'support case simulation',
      })
      .expect(201);
    const impersonatedAccessToken =
      getData<AuthLoginPayload>(impersonation).accessToken;

    const me = await api
      .get(apiPath('/auth/me'))
      .set('Authorization', `Bearer ${impersonatedAccessToken}`)
      .expect(200);
    const meData = getData<AuthMePayload>(me);
    expect(meData.user.id ?? meData.user.sub).toBe(managedRecord.id);

    const reauthForDelete = await api
      .post(apiPath('/v1/admin/reauth'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: adminUser.password })
      .expect(201);
    const confirmDelete =
      getData<AdminReauthPayload>(reauthForDelete).confirmToken;

    await api
      .delete(apiPath(`/v1/admin/users/${managedRecord.id}`))
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Confirm', confirmDelete)
      .send({ reason: 'cleanup user for tests' })
      .expect(200);

    const impersonationAudit = await api
      .get(apiPath('/v1/admin/audit'))
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: 'impersonation.start', pageSize: 100 })
      .expect(200);
    const impersonationAuditData = getData<{
      items: Array<{ entityId: string | null; action: string }>;
    }>(impersonationAudit);
    expect(
      impersonationAuditData.items.some(
        (item) =>
          item.action === 'impersonation.start' &&
          item.entityId === managedRecord.id,
      ),
    ).toBe(true);

    const deleteAudit = await api
      .get(apiPath('/v1/admin/audit'))
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: 'user.delete', pageSize: 100 })
      .expect(200);
    const deleteAuditData = getData<{
      items: Array<{ entityId: string | null; action: string }>;
    }>(deleteAudit);
    expect(
      deleteAuditData.items.some(
        (item) =>
          item.action === 'user.delete' && item.entityId === managedRecord.id,
      ),
    ).toBe(true);
  });

  it('allows superadmin force-cancel for request and booking with audit', async () => {
    const vehicle = await prisma.vehicle.findFirst({
      where: { userId: driverId },
    });
    if (!vehicle) throw new Error('Vehicle not found for superadmin flow');

    const createTrip = await api
      .post(apiPath('/trips'))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        vehicleId: vehicle.id,
        fromCityId,
        toCityId,
        departureAt: new Date(
          Date.now() + 8 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        seatsTotal: 3,
        price: 120000,
        currency: 'UZS',
      })
      .expect(201);
    const disputeTripId = getData<TripPayload>(createTrip).id;

    await api
      .patch(apiPath(`/trips/${disputeTripId}/publish`))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ notes: 'Dispute trip' })
      .expect(200);

    const disputePassenger = makeUniqueUser('dispute');
    await api.post(apiPath('/auth/register')).send({
      phone: disputePassenger.phone,
      password: disputePassenger.password,
      fullName: disputePassenger.fullName,
      acceptTerms: true,
    });
    const disputeLogin = await api.post(apiPath('/auth/login')).send({
      phone: disputePassenger.phone,
      password: disputePassenger.password,
    });
    const disputePassengerToken =
      getData<AuthLoginPayload>(disputeLogin).accessToken;

    const req = await api
      .post(apiPath(`/trips/${disputeTripId}/requests`))
      .set('Authorization', `Bearer ${disputePassengerToken}`)
      .send({
        seats: 1,
        price: 100000,
        currency: 'UZS',
      })
      .expect(201);
    const disputeRequestId = getData<RequestPayload>(req).id;

    const offer = await api
      .post(apiPath(`/requests/${disputeRequestId}/offers`))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        seats: 1,
        price: 105000,
        currency: 'UZS',
      })
      .expect(201);
    const disputeOfferId = getData<{ id: string }>(offer).id;

    await api
      .post(apiPath(`/v1/admin/requests/${disputeRequestId}/cancel`))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'request cancellation for dispute' })
      .expect(403);

    const reauthForRequestCancel = await api
      .post(apiPath('/v1/admin/reauth'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: adminUser.password })
      .expect(201);
    const confirmTokenRequestCancel = getData<AdminReauthPayload>(
      reauthForRequestCancel,
    ).confirmToken;

    await api
      .post(apiPath(`/v1/admin/requests/${disputeRequestId}/cancel`))
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Confirm', confirmTokenRequestCancel)
      .send({ reason: 'request cancellation for dispute' })
      .expect(201);

    const requestAudit = await api
      .get(apiPath('/v1/admin/audit'))
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: 'request.force.cancel', pageSize: 100 })
      .expect(200);
    const requestAuditItems = getData<{
      items: Array<{ entityId: string | null; action: string }>;
    }>(requestAudit).items;
    expect(
      requestAuditItems.some(
        (item) =>
          item.action === 'request.force.cancel' &&
          item.entityId === disputeRequestId,
      ),
    ).toBe(true);

    const req2 = await api
      .post(apiPath(`/trips/${disputeTripId}/requests`))
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        seats: 1,
        price: 100000,
        currency: 'UZS',
      })
      .expect(201);
    const bookingRequestId = getData<RequestPayload>(req2).id;

    await api
      .post(apiPath(`/requests/${bookingRequestId}/offers`))
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        seats: 1,
        price: 100000,
        currency: 'UZS',
      })
      .expect(201);

    const reauthForOfferReject = await api
      .post(apiPath('/v1/admin/reauth'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: adminUser.password })
      .expect(201);
    const confirmTokenOfferReject =
      getData<AdminReauthPayload>(reauthForOfferReject).confirmToken;

    await api
      .post(apiPath(`/v1/admin/offers/${disputeOfferId}/reject`))
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Confirm', confirmTokenOfferReject)
      .send({ reason: 'offer rejected by superadmin decision' })
      .expect(201);

    const acceptForBooking = await api
      .post(
        apiPath(`/trips/${disputeTripId}/requests/${bookingRequestId}/accept`),
      )
      .set('Authorization', `Bearer ${driverToken}`)
      .send({})
      .expect(201);
    const disputeBookingId =
      getData<{ booking?: { id?: string } }>(acceptForBooking).booking?.id ??
      null;

    const bookingIdForCancel =
      disputeBookingId ??
      (
        await prisma.booking.findFirst({
          where: { requestId: bookingRequestId },
          select: { id: true },
        })
      )?.id;
    if (!bookingIdForCancel) {
      throw new Error('Booking not created for force-cancel flow');
    }

    const reauthForBookingCancel = await api
      .post(apiPath('/v1/admin/reauth'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: adminUser.password })
      .expect(201);
    const confirmTokenBookingCancel = getData<AdminReauthPayload>(
      reauthForBookingCancel,
    ).confirmToken;

    await api
      .post(apiPath(`/v1/admin/bookings/${bookingIdForCancel}/cancel`))
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Confirm', confirmTokenBookingCancel)
      .send({ reason: 'booking canceled by superadmin for dispute' })
      .expect(201);

    const reauthForTripCancel = await api
      .post(apiPath('/v1/admin/reauth'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: adminUser.password })
      .expect(201);
    const confirmTokenTripCancel =
      getData<AdminReauthPayload>(reauthForTripCancel).confirmToken;

    await api
      .post(apiPath(`/v1/admin/trips/${disputeTripId}/cancel`))
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Confirm', confirmTokenTripCancel)
      .send({ reason: 'trip canceled by superadmin for dispute' })
      .expect(201);

    const bookingAudit = await api
      .get(apiPath('/v1/admin/audit'))
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: 'booking.force.cancel', pageSize: 100 })
      .expect(200);
    const bookingAuditItems = getData<{
      items: Array<{ entityId: string | null; action: string }>;
    }>(bookingAudit).items;
    expect(
      bookingAuditItems.some(
        (item) =>
          item.action === 'booking.force.cancel' &&
          item.entityId === bookingIdForCancel,
      ),
    ).toBe(true);
  });

  it('allows superadmin radar operations and broadcast notifications', async () => {
    const reauth = await api
      .post(apiPath('/v1/admin/reauth'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: adminUser.password })
      .expect(201);
    const confirmToken = getData<AdminReauthPayload>(reauth).confirmToken;

    await api
      .post(apiPath('/v1/admin/notifications/broadcast'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Maintenance test notification',
        reason: 'broadcast for system maintenance',
      })
      .expect(403);

    const createRadar = await api
      .post(apiPath('/v1/admin/radars'))
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Confirm', confirmToken)
      .send({
        name: 'Test Radar',
        lat: 41.315,
        lon: 69.278,
        reason: 'radar setup for moderation tests',
      })
      .expect(201);
    const radarId = getData<{ id: string }>(createRadar).id;

    const exported = await api
      .get(apiPath('/v1/admin/radars/export'))
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const exportedData = getData<Array<{ id: string }>>(exported);
    expect(exportedData.some((radar) => radar.id === radarId)).toBe(true);

    const reauthForImport = await api
      .post(apiPath('/v1/admin/reauth'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: adminUser.password })
      .expect(201);
    const confirmTokenImport =
      getData<AdminReauthPayload>(reauthForImport).confirmToken;

    const imported = await api
      .post(apiPath('/v1/admin/radars/import'))
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Confirm', confirmTokenImport)
      .send({
        reason: 'bulk radar import for tests only',
        items: [
          {
            name: 'Imported Radar',
            lat: 41.32,
            lon: 69.281,
            type: 'speed_camera',
          },
        ],
      })
      .expect(201);
    expect(getData<{ count: number }>(imported).count).toBeGreaterThan(0);

    const reauthForBroadcast = await api
      .post(apiPath('/v1/admin/reauth'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: adminUser.password })
      .expect(201);
    const confirmTokenBroadcast =
      getData<AdminReauthPayload>(reauthForBroadcast).confirmToken;

    const broadcast = await api
      .post(apiPath('/v1/admin/notifications/broadcast'))
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Confirm', confirmTokenBroadcast)
      .send({
        message: 'Maintenance test notification',
        reason: 'broadcast for system maintenance',
      })
      .expect(201);
    expect(getData<{ count: number }>(broadcast).count).toBeGreaterThan(0);

    const radarAudit = await api
      .get(apiPath('/v1/admin/audit'))
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: 'radar.create', pageSize: 100 })
      .expect(200);
    const radarAuditItems = getData<{
      items: Array<{ action: string; entityId: string | null }>;
    }>(radarAudit).items;
    expect(
      radarAuditItems.some(
        (item) => item.action === 'radar.create' && item.entityId === radarId,
      ),
    ).toBe(true);

    const notificationAudit = await api
      .get(apiPath('/v1/admin/audit'))
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: 'notification.broadcast', pageSize: 100 })
      .expect(200);
    const notificationAuditItems = getData<{
      items: Array<{ action: string }>;
    }>(notificationAudit).items;
    expect(
      notificationAuditItems.some(
        (item) => item.action === 'notification.broadcast',
      ),
    ).toBe(true);
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
      "PaymentLedgerEntry",
      "PaymentAttempt",
      "Payment",
      "FareQuote",
      "Booking",
      "SupportTicket",
      "Offer",
      "NegotiationSession",
      "TripRequest",
      "DriverLocationSample",
      "TripRoute",
      "PoiReport",
      "Poi",
      "OtpCode",
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

async function waitForOutboxDone(prisma: PrismaClient, timeoutMs = 5_000) {
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
