import { readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { FileEntry } from '../shared/contracts.js';
import { DomainError } from './errors.js';

export async function projectPath(root: string, requested = '.') {
  const canonicalRoot = await realpath(root);
  const canonical = await realpath(resolve(canonicalRoot, requested));
  const rel = relative(canonicalRoot, canonical);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw Object.assign(new DomainError('outsideProject'), { statusCode: 403 });
  }
  return canonical;
}
export async function listFiles(root: string, path: string): Promise<FileEntry[]> {
  const dir = await projectPath(root, path);
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries
        .filter((e) => !['.git', 'node_modules', '.venv'].includes(e.name) && !e.isSymbolicLink())
        .slice(0, 500)
        .map(async (e) => {
          const full = resolve(dir, e.name);
          return {
            name: e.name,
            path: relative(root, full),
            directory: e.isDirectory(),
            size: (await stat(full)).size,
          };
        }),
    )
  ).sort((a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name));
}
export async function readText(root: string, path: string) {
  const full = await projectPath(root, path);
  if ((await stat(full)).size > 2_000_000) throw new DomainError('fileTooLarge');
  const content = await readFile(full, 'utf8');
  if (content.includes('\0')) throw new DomainError('binaryFile');
  return content;
}
export async function saveText(root: string, path: string, content: string, original: string) {
  const full = await projectPath(root, path);
  if ((await readText(root, path)) !== original)
    throw Object.assign(new DomainError('fileConflict'), {
      statusCode: 409,
    });
  await writeFile(full, content, 'utf8');
}
