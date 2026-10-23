import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { fixture, waitFor } from './helpers.js';

test('command jobs execute in project cwd, cancel, and recover interrupted records without rerunning', async () => {
  const f = await fixture();
  try {
    const job = await f.call(`/projects/${f.project.id}/jobs`, 'POST', {
      command: `${JSON.stringify(process.execPath)} -e "console.log(process.cwd())"`,
    });
    const done = await waitFor(
      () => f.server.store.get('jobs', job.id),
      (j) => j.status !== 'running',
    );
    assert.equal(done.status, 'completed');
    assert.ok(done.log.includes(f.workspace));
    const long = await f.call(`/projects/${f.project.id}/jobs`, 'POST', {
      command: `${JSON.stringify(process.execPath)} -e "setInterval(()=>{},1000)"`,
    });
    await f.call(`/jobs/${long.id}/cancel`, 'POST');
    assert.equal((await f.server.store.get('jobs', long.id)).status, 'cancelled');
    await f.server.store.put('jobs', { ...job, id: randomUUID(), status: 'running' });
    await f.restart();
    assert.ok((await f.server.store.list('jobs')).some((j) => j.status === 'interrupted'));
  } finally {
    await f.close();
  }
});
