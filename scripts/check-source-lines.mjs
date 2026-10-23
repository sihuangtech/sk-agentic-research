import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const roots = ['frontend/src', 'service', 'shared', 'scripts', 'src-tauri/src'];
const configs = ['frontend/vite.config.js', 'src-tauri/build.rs', 'markdown-preview.css'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.rs', '.json']);
export const lineLimit = 300;
export function countLines(source) {
  if (!source) return 0;
  const lines = source.split(/\r?\n/);
  return lines.length - Number(lines.at(-1) === '');
}
async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return collect(path);
        return entry.isFile() && extensions.has(extname(path)) ? [path] : [];
      }),
    )
  ).flat();
}
export async function inspectSourceLines() {
  const files = (await Promise.all(roots.map((dir) => collect(join(root, dir))))).flat();
  for (const config of configs)
    if (await stat(join(root, config)).catch(() => null)) files.push(join(root, config));
  return Promise.all(
    files.map(async (path) => ({
      path: relative(root, path),
      lines: countLines(await readFile(path, 'utf8')),
    })),
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const files = await inspectSourceLines();
  const oversized = files.filter((file) => file.lines > lineLimit);
  for (const file of oversized) console.error(`${file.path}: ${file.lines} > ${lineLimit} lines`);
  const largest = files.reduce((a, b) => (a.lines >= b.lines ? a : b));
  console.log(
    `Checked ${files.length} first-party source files. Largest: ${largest.path} (${largest.lines}/${lineLimit} lines).`,
  );
  if (oversized.length) process.exitCode = 1;
}
