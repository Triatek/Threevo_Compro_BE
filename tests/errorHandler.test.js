import { Prisma } from '@prisma/client';
import express from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from '../src/config/zod.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { notFound } from '../src/middlewares/notFound.js';
import { createRateLimiter } from '../src/middlewares/rateLimiter.js';
import { validate } from '../src/middlewares/validate.js';
import { ConflictError, NotFoundError } from '../src/utils/AppError.js';
import { sendSuccess } from '../src/utils/response.js';
import { api, request } from './helpers.js';

function prismaError(code, meta) {
  return new Prisma.PrismaClientKnownRequestError('prisma error', {
    code,
    clientVersion: Prisma.prismaVersion.client,
    meta,
  });
}

/** Small app that exercises the real middlewares with controlled errors. */
function buildTestApp() {
  const testApp = express();
  testApp.use(express.json({ limit: '1kb' }));

  testApp.get('/app-error', () => {
    throw new ConflictError('Slug sudah dipakai');
  });
  testApp.get('/async-error', async () => {
    await Promise.resolve();
    throw new NotFoundError();
  });
  testApp.get('/zod-error', () => {
    z.object({ name: z.string() }).parse({});
  });
  testApp.get('/prisma/:code', (req) => {
    throw prismaError(req.params.code, { target: ['email'] });
  });
  testApp.get('/crash', () => {
    throw new Error('secret database password leaked');
  });
  testApp.post(
    '/validate/:id',
    validate({
      params: z.object({ id: z.coerce.number().int().positive() }),
      query: z.object({ page: z.coerce.number().int().default(1) }),
      body: z.object({ email: z.email(), name: z.string().min(2) }),
    }),
    (req, res) => sendSuccess(res, req.validated),
  );
  testApp.post('/json', (req, res) => sendSuccess(res, req.body));

  const limiter = createRateLimiter({ windowMs: 60_000, limit: 2, skipInTest: false });
  testApp.get('/limited', limiter, (req, res) => sendSuccess(res, null));

  testApp.use(notFound);
  testApp.use(errorHandler);
  return supertest(testApp);
}

const client = buildTestApp();

describe('errorHandler', () => {
  it('returns JSON 404 for unknown routes on the real app', async () => {
    const res = await request().get(api('/does-not-exist'));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint GET ${api('/does-not-exist')} tidak ditemukan`,
      },
    });
  });

  it('returns 400 for malformed JSON on the real app', async () => {
    const res = await request()
      .post(api('/health'))
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('returns 413 for payloads over the limit', async () => {
    const res = await client.post('/json').send({ text: 'x'.repeat(2000) });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('maps AppError subclasses, including from async handlers', async () => {
    const conflict = await client.get('/app-error');
    expect(conflict.status).toBe(409);
    expect(conflict.body.error).toEqual({ code: 'CONFLICT', message: 'Slug sudah dipakai' });

    const notFoundRes = await client.get('/async-error');
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error.code).toBe('NOT_FOUND');
  });

  it('maps ZodError to 422 with Indonesian messages', async () => {
    const res = await client.get('/zod-error');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('name');
    expect(res.body.error.details[0].message).toMatch(/diharapkan/i);
  });

  it.each([
    ['P2002', 409, 'CONFLICT'],
    ['P2025', 404, 'NOT_FOUND'],
    ['P2003', 400, 'BAD_REQUEST'],
    ['P9999', 500, 'INTERNAL_SERVER_ERROR'],
  ])('maps Prisma %s to %i', async (code, status, errorCode) => {
    const res = await client.get(`/prisma/${code}`);

    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(errorCode);
  });

  it('includes conflicting fields for P2002', async () => {
    const res = await client.get('/prisma/P2002');
    expect(res.body.error.details).toEqual([{ field: 'email', message: 'Nilai sudah digunakan' }]);
  });

  it('hides internal error details outside development', async () => {
    const res = await client.get('/crash');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan pada server' },
    });
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});

describe('validate middleware', () => {
  it('stores parsed values in req.validated and strips unknown fields', async () => {
    const res = await client
      .post('/validate/7')
      .send({ email: 'a@b.co', name: 'Budi', isAdmin: true });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      params: { id: 7 },
      query: { page: 1 },
      body: { email: 'a@b.co', name: 'Budi' },
    });
  });

  it('returns 422 with details for every invalid location', async () => {
    const res = await client.post('/validate/abc').send({ email: 'bukan-email' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => `${d.location}.${d.field}`);
    expect(fields).toEqual(expect.arrayContaining(['params.id', 'body.email', 'body.name']));
  });
});

describe('rate limiter', () => {
  it('returns 429 in the standard format after the limit is reached', async () => {
    await client.get('/limited').expect(200);
    await client.get('/limited').expect(200);
    const res = await client.get('/limited');

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});
