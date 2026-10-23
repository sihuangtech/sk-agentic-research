import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DomainError } from '../errors.js';
import { createModelRuntime } from '../providers.js';

import { id, type RouteContext } from './context.js';

const providerInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    baseUrl: z
      .url()
      .refine(
        (value) =>
          ['http:', 'https:'].includes(new URL(value).protocol) &&
          !new URL(value).username &&
          !new URL(value).password,
        'invalidApiUrl',
      ),
    api: z.enum(['openai-completions', 'openai-responses', 'anthropic-messages']),
    model: z.string().trim().min(1).max(200),
    contextWindow: z.number().int().min(2048).max(10_000_000),
    maxTokens: z.number().int().min(128).max(200_000),
    apiKey: z.string().max(20000).optional(),
    clearKey: z.boolean().optional(),
  })
  .refine((p) => p.maxTokens < p.contextWindow, 'maxOutput');
export function registerProviders(context: RouteContext) {
  const { app, store, secrets, changed } = context;
  app.post('/api/providers', async (request) => {
    const { apiKey, clearKey: _, ...input } = providerInput.parse(request.body);
    const providerId = randomUUID();
    if (apiKey) await secrets.set(providerId, apiKey);
    const provider = await store.put('providers', {
      ...input,
      id: providerId,
      hasKey: Boolean(apiKey),
    });
    changed();
    return provider;
  });
  app.put('/api/providers/:id', async (request) => {
    const old = await store.get('providers', id(request.params));
    const { apiKey, clearKey, ...input } = providerInput.parse(request.body);
    if (apiKey) await secrets.set(old.id, apiKey);
    else if (clearKey) await secrets.remove(old.id);
    const provider = await store.put('providers', {
      ...input,
      id: old.id,
      hasKey: apiKey ? true : clearKey ? false : old.hasKey,
    });
    changed();
    return provider;
  });
  app.delete('/api/providers/:id', async (request) => {
    const providerId = id(request.params);
    if (
      (await store.list('sessions')).some((s) => s.providerId === providerId) ||
      (await store.list('automations')).some((a) => a.providerId === providerId)
    )
      throw new DomainError('providerInUse');
    await secrets.remove(providerId);
    await store.remove('providers', providerId);
    changed();
    return { ok: true };
  });
  app.post('/api/providers/:id/test', async (request) => {
    const provider = await store.get('providers', id(request.params));
    const { runtime, model } = await createModelRuntime(provider, secrets);
    const start = Date.now();
    const response = await runtime.completeSimple(
      model,
      { messages: [{ role: 'user', content: 'Reply with OK.', timestamp: Date.now() }] },
      { maxTokens: 32, signal: AbortSignal.timeout(30000) },
    );
    if (response.errorMessage) throw new Error(response.errorMessage);
    return { ok: true, latencyMs: Date.now() - start };
  });
}
