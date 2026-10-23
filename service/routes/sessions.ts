import { z } from 'zod';
import { requestLocale } from '../errors.js';

import { id, type RouteContext } from './context.js';
export function registerSessions(context: RouteContext) {
  const { app, agent } = context;
  app.post('/api/sessions', async (request) => {
    const v = z
      .object({ projectId: z.string().uuid(), providerId: z.string().uuid() })
      .parse(request.body);
    return agent.create(v.projectId, v.providerId);
  });
  app.get('/api/sessions/:id', (request) =>
    agent.snapshot(id(request.params), requestLocale(request)),
  );
  app.post('/api/sessions/:id/messages', async (request) => {
    const input = z
      .object({
        text: z.string().trim().min(1).max(100000),
        mode: z.enum(['prompt', 'steer', 'followUp']).default('prompt'),
      })
      .parse(request.body);
    await agent.prompt(id(request.params), input.text, input.mode, requestLocale(request));
    return { accepted: true };
  });
  app.post('/api/sessions/:id/abort', async (request) => {
    await agent.abort(id(request.params));
    return { ok: true };
  });
}
