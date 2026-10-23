import { timingSafeEqual } from 'node:crypto';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DomainError, errorPayload, requestLocale } from '../errors.js';

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
]);
export async function registerSecurity(app: FastifyInstance, token: string) {
  await app.register(cors, {
    origin: [...allowedOrigins],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  });
  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') return;
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) throw new DomainError('originDenied', 403);
    const supplied = Buffer.from(request.headers.authorization?.replace(/^Bearer /, '') || '');
    const expected = Buffer.from(token);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      throw new DomainError('unauthenticated', 401);
  });
  app.setErrorHandler((error, request, reply) => {
    const e = error as Error & { statusCode?: number };
    const status = e instanceof z.ZodError ? 400 : e.statusCode || 400;
    reply.code(status).send(errorPayload(error, requestLocale(request)));
  });
}
