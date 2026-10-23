import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const source = dirname(require.resolve('pdfjs-dist/package.json'));
const destination = join(root, 'frontend/public/pdfjs');
await mkdir(destination, { recursive: true });
for (const directory of ['cmaps', 'standard_fonts', 'wasm'])
  await cp(join(source, directory), join(destination, directory), { recursive: true });
