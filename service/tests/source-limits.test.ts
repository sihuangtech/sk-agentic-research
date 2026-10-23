import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countLines, inspectSourceLines, lineLimit } from '../../scripts/check-source-lines.mjs';

test('line limit counts comments and blank lines and rejects a 301-line file', () => {
  assert.equal(countLines(''), 0);
  assert.equal(countLines('one\n'), 1);
  assert.equal(countLines('one\r\n\r\n// comment\r\n'), 3);
  assert.equal(countLines('line\n'.repeat(300)), lineLimit);
  assert.ok(countLines('line\n'.repeat(301)) > lineLimit);
});
test('all first-party frontend, backend, desktop, styles, and tests are at most 300 lines', async () => {
  const files = await inspectSourceLines();
  assert.ok(files.length > 50);
  assert.deepEqual(
    files.filter((file: { lines: number }) => file.lines > lineLimit),
    [],
  );
});
