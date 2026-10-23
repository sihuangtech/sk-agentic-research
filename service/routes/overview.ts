import { type RouteContext } from './context.js';
export function registerOverview(context: RouteContext) {
  const { app, store } = context;
  app.get('/api/health', async () => ({ ok: true, runtime: 'pi', version: '0.4.0' }));
  app.get('/api/overview', async () => ({
    projects: await store.list('projects'),
    providers: await store.list('providers'),
    sessions: (await store.list('sessions')).sort((a, b) => b.updatedAt - a.updatedAt),
    memories: await store.list('memories'),
    jobs: (await store.list('jobs')).sort((a, b) => b.createdAt - a.createdAt),
    automations: await store.list('automations'),
  }));
}
