import { spawn } from 'node:child_process';
import os from 'node:os';
import { which } from './exec.js';
import { HttpError } from './http.js';

// AirPlay receiver via UxPlay (GPLv3, https://github.com/FDH2/UxPlay). We only supervise the process;
// installing it is a user step (brew install uxplay / apt install uxplay).
let proc = null;
let lastError = null;

export function mirroringStatus() {
  const bin = which('uxplay');
  return {
    airplay: {
      installed: !!bin,
      running: !!proc,
      name: receiverName(),
      lastError,
    },
    // No production-quality open-source Miracast/Google Cast receiver exists for this stack; see docs/SCREEN_MIRRORING.md.
    miracast: { installed: false, supported: false },
  };
}

function receiverName() {
  return process.env.SPIDER_AIRPLAY_NAME || `SPIDER TV (${os.hostname().replace(/\.local$/, '')})`;
}

export function startAirplay() {
  const bin = which('uxplay');
  if (!bin) throw new HttpError(501, 'UxPlay is not installed', { code: 'not-installed' });
  if (proc) return mirroringStatus();
  lastError = null;
  const child = spawn(bin, ['-n', receiverName(), '-nh', '-fs'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (d) => {
    stderr = (stderr + d).slice(-2000);
  });
  child.on('exit', (code) => {
    if (proc === child) proc = null;
    if (code && code !== 0 && code !== 143) lastError = stderr.trim().split('\n').pop() || `exit ${code}`;
  });
  child.on('error', (e) => {
    if (proc === child) proc = null;
    lastError = e.message;
  });
  proc = child;
  return mirroringStatus();
}

export function stopAirplay() {
  if (proc) {
    proc.kill('SIGTERM');
    proc = null;
  }
  return mirroringStatus();
}
