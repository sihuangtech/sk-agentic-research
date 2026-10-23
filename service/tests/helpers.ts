import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SecretStore } from '../providers.js';
import { createServer } from '../server.js';

export class TestSecrets implements SecretStore {
  values = new Map<string, string>();
  async get(id: string) {
    return this.values.get(id) || null;
  }
  async set(id: string, key: string) {
    this.values.set(id, key);
  }
  async remove(id: string) {
    this.values.delete(id);
  }
}
export async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'research-agent-test-'));
  const workspace = join(directory, 'workspace');
  await mkdir(workspace);
  const token = randomUUID();
  const secrets = new TestSecrets();
  const options = { dataDir: join(directory, 'state'), token, secrets, scheduler: false };
  let server = await createServer(options);
  const call = async (path: string, method = 'GET', body?: unknown) => {
    const response = await server.app.inject({
      url: `/api${path}`,
      method: method as 'GET',
      headers: { authorization: `Bearer ${token}` },
      payload: body,
    });
    assert.ok(response.statusCode < 300, response.body);
    return response.json();
  };
  const project = await call('/projects', 'POST', { path: workspace });
  return {
    directory,
    workspace,
    token,
    secrets,
    options,
    project,
    call,
    get server() {
      return server;
    },
    async restart() {
      await server.app.close();
      server = await createServer(options);
    },
    async close() {
      await server.app.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}
export async function waitFor<T>(get: () => Promise<T>, check: (value: T) => boolean) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const value = await get();
    if (check(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error('Timed out waiting for test condition');
}
export async function modelFixture(delayMs = 0) {
  const requests: Record<string, any>[] = [];
  const server = createHttpServer(async (request, response) => {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const payload = JSON.parse(raw);
    requests.push(payload);
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const chunk = (delta: unknown, finish_reason: string | null = null) =>
      response.write(
        `data: ${JSON.stringify({ id: 'test-completion', object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: 'research-test', choices: [{ index: 0, delta, finish_reason }] })}\n\n`,
      );
    const firstToolRound =
      payload.tools?.length && !payload.messages.some((m: any) => m.role === 'tool');
    if (firstToolRound) {
      chunk({
        role: 'assistant',
        tool_calls: [
          {
            index: 0,
            id: 'call_write',
            type: 'function',
            function: {
              name: 'write',
              arguments: JSON.stringify({
                path: 'result.txt',
                content: 'verified experiment output',
              }),
            },
          },
        ],
      });
      chunk({}, 'tool_calls');
    } else {
      chunk({ role: 'assistant', content: 'OK，已完成并保存结果。' });
      chunk({}, 'stop');
    }
    response.end('data: [DONE]\n\n');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return {
    requests,
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
export function provider(baseUrl: string) {
  return {
    name: '测试模型',
    api: 'openai-completions',
    baseUrl,
    model: 'research-test',
    contextWindow: 32000,
    maxTokens: 2048,
    apiKey: 'test-secret-never-persist',
  };
}
