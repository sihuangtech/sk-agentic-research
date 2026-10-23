import { execFileSync, spawnSync } from 'node:child_process';
import { chmod, copyFile, cp, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// Packages the installed official Node runtime and npm release artifacts; never builds upstream agents.
const root = resolve(import.meta.dirname, '..');
const runtime = join(root, 'src-tauri', 'runtime');
const target = execFileSync('rustc', ['--print', 'host-tuple'], { encoding: 'utf8' }).trim();
if (process.env.CARGO_BUILD_TARGET && process.env.CARGO_BUILD_TARGET !== target)
  throw new Error('请在目标平台原生构建，Node 与原生 npm 依赖必须匹配目标架构');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(args, cwd) {
  const r = spawnSync(npm, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) throw new Error(`npm ${args.join(' ')} 失败`);
}
run(['exec', '--', 'tsc'], root);
await mkdir(runtime, { recursive: true });
await mkdir(join(runtime, 'frontend'), { recursive: true });
await cp(join(root, 'dist'), join(runtime, 'dist'), { recursive: true });
await copyFile(join(root, 'package.json'), join(runtime, 'package.json'));
await copyFile(join(root, 'package-lock.json'), join(runtime, 'package-lock.json'));
await copyFile(join(root, 'frontend', 'package.json'), join(runtime, 'frontend', 'package.json'));
run(['ci', '--omit=dev', '--workspaces=false', '--ignore-scripts'], runtime);
const binaries = join(root, 'src-tauri', 'binaries');
await mkdir(binaries, { recursive: true });
const nodePath = join(
  binaries,
  `research-node-${target}${process.platform === 'win32' ? '.exe' : ''}`,
);
await copyFile(process.execPath, nodePath);
await chmod(nodePath, 0o755);
console.log(`已准备官方 Node 运行时及 npm 发布依赖：${target}`);
