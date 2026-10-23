import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { fixture, modelFixture, provider, waitFor } from './helpers.js';

test('Pi executes a write tool, streams events, and restores canonical history after restart', async () => {
  const f = await fixture();
  const model = await modelFixture();
  try {
    const p = await f.call('/providers', 'POST', provider(model.baseUrl));
    await f.call('/memories', 'POST', {
      content: 'Use reproducible scripts.',
      projectId: f.project.id,
      source: 'test user',
    });
    const s = await f.call('/sessions', 'POST', { projectId: f.project.id, providerId: p.id });
    await f.call(`/sessions/${s.id}/messages`, 'POST', { text: 'Write the result file.' });
    const result = await waitFor(
      () => f.call(`/sessions/${s.id}`),
      (r) => r.conversation.status !== 'running',
    );
    assert.equal(result.conversation.status, 'idle', JSON.stringify(result));
    assert.equal(
      await readFile(join(f.workspace, 'result.txt'), 'utf8'),
      'verified experiment output',
    );
    assert.ok(result.messages.some((m: any) => m.role === 'toolResult'));
    assert.ok(JSON.stringify(model.requests[0]).includes('Use reproducible scripts.'));
    assert.ok(model.requests[0].tools.some((t: any) => t.function.name === 'research_job'));
    await f.restart();
    const restored = await f.call(`/sessions/${s.id}`);
    assert.deepEqual(restored.messages, result.messages);
    await f.call(`/sessions/${s.id}/messages`, 'POST', { text: 'Summarize previous results.' });
    const next = await waitFor(
      () => f.call(`/sessions/${s.id}`),
      (r) => r.conversation.status !== 'running',
    );
    assert.equal(next.conversation.status, 'idle');
    assert.ok(next.messages.length > result.messages.length);
  } finally {
    await f.close();
    await model.close();
  }
});

test('running sessions reject ambiguous messages, accept steering, and can abort', async () => {
  const f = await fixture();
  const model = await modelFixture(500);
  try {
    const p = await f.call('/providers', 'POST', provider(model.baseUrl));
    const s = await f.call('/sessions', 'POST', { projectId: f.project.id, providerId: p.id });
    await f.call(`/sessions/${s.id}/messages`, 'POST', { text: 'Begin work.' });
    const duplicate = await f.server.app.inject({
      url: `/api/sessions/${s.id}/messages`,
      method: 'POST',
      headers: { authorization: `Bearer ${f.token}` },
      payload: { text: 'Ambiguous second run' },
    });
    assert.equal(duplicate.statusCode, 409);
    await f.call(`/sessions/${s.id}/messages`, 'POST', {
      text: 'Please be concise.',
      mode: 'steer',
    });
    await f.call(`/sessions/${s.id}/abort`, 'POST');
    const result = await f.call(`/sessions/${s.id}`);
    assert.notEqual(result.conversation.status, 'running');
  } finally {
    await f.close();
    await model.close();
  }
});

test('simultaneous requests cannot start two runs for one session', async () => {
  const f = await fixture();
  const model = await modelFixture(500);
  try {
    const p = await f.call('/providers', 'POST', provider(model.baseUrl));
    const s = await f.call('/sessions', 'POST', { projectId: f.project.id, providerId: p.id });
    const results = await Promise.all(
      [1, 2].map((n) =>
        f.server.app.inject({
          url: `/api/sessions/${s.id}/messages`,
          method: 'POST',
          headers: { authorization: `Bearer ${f.token}` },
          payload: { text: `Concurrent run ${n}` },
        }),
      ),
    );
    assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
    await f.call(`/sessions/${s.id}/abort`, 'POST');
    assert.equal((await f.call(`/sessions/${s.id}`)).conversation.status, 'interrupted');
  } finally {
    await f.close();
    await model.close();
  }
});
