import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createServer } from './server.js';

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '4019' },
    'data-dir': { type: 'string' },
    'parent-pid': { type: 'string' },
  },
});
const token = process.env.AGENTIC_TOKEN;
if (!token) throw new Error('缺少 AGENTIC_TOKEN，请使用 npm run dev 或桌面应用启动');
const runtime = await createServer({
  token,
  dataDir: resolve(values['data-dir'] || '.research-data'),
});
const { app } = runtime;
app.post('/api/shutdown', async () => {
  await agentStop();
  setTimeout(() => void shutdown(), 50);
  return { ok: true };
});
async function agentStop() {
  /* The shutdown request waits for local work to stop before the desktop exits. */ await runtime.agent.stop();
  await runtime.jobs.stop();
}
await app.listen({ host: '127.0.0.1', port: Number(values.port) });
console.log('第二月亮 Agent 后台已就绪');
let closing = false;
const shutdown = async () => {
  if (closing) return;
  closing = true;
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
if (values['parent-pid'])
  setInterval(() => {
    try {
      process.kill(Number(values['parent-pid']), 0);
    } catch {
      void shutdown();
    }
  }, 2000).unref();
