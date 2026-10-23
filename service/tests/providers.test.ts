import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { fixture, modelFixture, provider } from './helpers.js';

test('provider secrets stay out of SQLite and API responses; real SDK tests the connection', async () => {
  const f = await fixture();
  const model = await modelFixture();
  try {
    const p = await f.call('/providers', 'POST', provider(model.baseUrl));
    assert.equal(p.hasKey, true);
    assert.equal(p.apiKey, undefined);
    assert.equal((await f.call(`/providers/${p.id}/test`, 'POST')).ok, true);
    assert.ok(!JSON.stringify(await f.call('/overview')).includes('test-secret'));
    await f.restart();
    assert.ok(
      !(await readFile(join(f.options.dataDir, 'research.sqlite'))).includes(
        Buffer.from('test-secret'),
      ),
    );
    await f.call(`/providers/${p.id}`, 'PUT', {
      ...provider(model.baseUrl),
      apiKey: '',
      clearKey: true,
    });
    assert.equal(await f.secrets.get(p.id), null);
  } finally {
    await f.close();
    await model.close();
  }
});
