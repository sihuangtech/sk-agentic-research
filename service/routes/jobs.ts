import { z } from 'zod';

import { id, type RouteContext } from './context.js';
export function registerJobs(context: RouteContext) {
  const { app, store, jobs } = context;
  app.post('/api/projects/:id/jobs', async (request) => {
    const p = await store.get('projects', id(request.params));
    const v = z.object({ command: z.string().trim().min(1).max(16000) }).parse(request.body);
    return jobs.start(p, v.command);
  });
  app.post('/api/jobs/:id/cancel', async (request) => {
    await jobs.cancel(id(request.params));
    return { ok: true };
  });
}
