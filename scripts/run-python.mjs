import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const candidates = process.platform === 'win32'
  ? ['.venv\\Scripts\\python.exe', 'python']
  : ['.venv/bin/python', 'python3']
const python = candidates.find((candidate) => candidate === 'python' || candidate === 'python3' || existsSync(candidate))
const result = spawnSync(python, process.argv.slice(2), { stdio: 'inherit' })

if (result.error) {
  console.error(`无法启动 Python: ${result.error.message}`)
  process.exit(1)
}
process.exit(result.status ?? 1)
