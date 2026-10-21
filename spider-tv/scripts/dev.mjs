#!/usr/bin/env node
// Development: system agent (auto-restarts on change) + Vite dev server with hot reload.
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const vite = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');

const procs = [
  ['agent', process.execPath, ['--watch-path=agent', '--watch-path=shared', 'agent/server.js']],
  ['ui   ', vite, ['--config', 'ui/vite.config.ts']],
].map(([name, cmd, args]) => {
  const p = spawn(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
  const prefix = (chunk) =>
    chunk
      .toString()
      .split('\n')
      .filter(Boolean)
      .forEach((line) => console.log(`[${name}] ${line}`));
  p.stdout.on('data', prefix);
  p.stderr.on('data', prefix);
  p.on('exit', (code) => {
    console.log(`[${name}] exited (${code})`);
    shutdown();
  });
  return p;
});

let down = false;
function shutdown() {
  if (down) return;
  down = true;
  procs.forEach((p) => p.kill('SIGTERM'));
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('\n  SPIDER TV dev → open http://localhost:5173 (Esc = Back, arrows = D-pad, Enter = OK)\n');
