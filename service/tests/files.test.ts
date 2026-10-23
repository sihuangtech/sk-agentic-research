import assert from 'node:assert/strict';
import { readFile, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { fixture } from './helpers.js';

test('file API prevents traversal, symlink escape, and stale overwrites', async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.workspace, 'paper.md'), 'original');
    await writeFile(join(f.directory, 'private.txt'), 'private');
    await symlink(join(f.directory, 'private.txt'), join(f.workspace, 'escape.txt'));
    for (const path of ['../private.txt', 'escape.txt']) {
      const r = await f.server.app.inject({
        url: `/api/projects/${f.project.id}/file?path=${encodeURIComponent(path)}`,
        headers: { authorization: `Bearer ${f.token}` },
      });
      assert.equal(r.statusCode, 403);
    }
    await f.call(`/projects/${f.project.id}/file`, 'PUT', {
      path: 'paper.md',
      content: 'changed',
      original: 'original',
    });
    const stale = await f.server.app.inject({
      url: `/api/projects/${f.project.id}/file`,
      method: 'PUT',
      headers: { authorization: `Bearer ${f.token}` },
      payload: { path: 'paper.md', content: 'lost update', original: 'original' },
    });
    assert.equal(stale.statusCode, 409);
    assert.equal(await readFile(join(f.workspace, 'paper.md'), 'utf8'), 'changed');
  } finally {
    await f.close();
  }
});
