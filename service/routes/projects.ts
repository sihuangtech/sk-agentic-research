import { randomUUID } from 'node:crypto';
import { realpath, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { z } from 'zod';
import { DomainError } from '../errors.js';

import { type RouteContext } from './context.js';
export function registerProjects(context: RouteContext) {
  const { app, store, changed } = context;
  app.post('/api/projects', async (request) => {
    const input = z
      .object({ path: z.string().min(1), name: z.string().max(100).optional() })
      .parse(request.body);
    const path = await realpath(input.path);
    if (!(await stat(path)).isDirectory()) throw new DomainError('invalidProject');
    const existing = (await store.list('projects')).find((p) => p.path === path);
    if (existing) return existing;
    const project = await store.put('projects', {
      id: randomUUID(),
      path,
      name: input.name || basename(path),
      createdAt: Date.now(),
    });
    changed();
    return project;
  });
}
