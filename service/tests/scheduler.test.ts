import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fixture, modelFixture, provider, waitFor } from './helpers.js';

test('scheduler advances before execution, records a result session, and does not duplicate a tick', async () => {
  const f = await fixture();
  const model = await modelFixture();
  try {
    const p = await f.call('/providers', 'POST', provider(model.baseUrl));
    const task = await f.call('/automations', 'POST', {
      projectId: f.project.id,
      providerId: p.id,
      name: '文献更新',
      prompt: 'Check project.',
      intervalMinutes: 60,
    });
    await f.server.store.put('automations', { ...task, nextRunAt: Date.now() - 1 });
    await f.server.tick();
    await f.server.tick();
    const updated = await f.server.store.get('automations', task.id);
    assert.ok(updated.lastSessionId);
    assert.ok(updated.nextRunAt > Date.now());
    assert.equal((await f.server.store.list('sessions')).length, 1);
    await waitFor(
      () => f.server.store.get('sessions', updated.lastSessionId!),
      (s) => s.status !== 'running',
    );
    await f.call(`/automations/${task.id}`, 'PATCH', { enabled: false });
    assert.equal((await f.server.store.get('automations', task.id)).enabled, false);
  } finally {
    await f.close();
    await model.close();
  }
});
