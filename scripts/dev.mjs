import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';

const probe = createServer();
await new Promise((resolve, reject) => {
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', resolve);
});
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const token = randomUUID();
const env = {
  ...process.env,
  AGENTIC_TOKEN: token,
  AGENTIC_PORT: String(port),
  VITE_AGENTIC_TOKEN: token,
};
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
  spawn(
    process.execPath,
    [
      '--import',
      'tsx',
      'service/main.ts',
      '--port',
      String(port),
      '--parent-pid',
      String(process.pid),
    ],
    { env, stdio: 'inherit' },
  ),
  spawn(npm, ['--workspace', 'frontend', 'run', 'dev'], {
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  }),
];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    stop();
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    stop();
    if (code) process.exitCode = code;
  });
}
