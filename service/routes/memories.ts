import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { id, type RouteContext } from './context.js';
export function registerMemories(context: RouteContext) {
  const { app, store, changed } = context;
  app.post('/api/memories', async (request) => {
    const v = z
      .object({
        content: z.string().trim().min(1).max(8000),
        source: z.string().max(500).default('user'),
        projectId: z.string().uuid().nullable().default(null),
      })
      .parse(request.body);
    if (v.projectId) await store.get('projects', v.projectId);
    const memory = await store.put('memories', { ...v, id: randomUUID(), updatedAt: Date.now() });
    changed();
    return memory;
  });
  app.put('/api/memories/:id', async (request) => {
    const old = await store.get('memories', id(request.params));
    const v = z
      .object({ content: z.string().trim().min(1).max(8000), source: z.string().max(500) })
      .parse(request.body);
    const m = await store.put('memories', { ...old, ...v, updatedAt: Date.now() });
    changed();
    return m;
  });
  app.delete('/api/memories/:id', async (request) => {
    await store.remove('memories', id(request.params));
    changed();
    return { ok: true };
  });
}
