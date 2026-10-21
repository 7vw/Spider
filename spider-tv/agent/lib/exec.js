import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Runs a command without a shell. Resolves { ok, stdout, stderr, code }; never rejects. */
export function run(cmd, args = [], { timeout = 4000 } = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({
        ok: !err,
        stdout: String(stdout ?? ''),
        stderr: String(stderr ?? ''),
        code: err ? (typeof err.code === 'number' ? err.code : -1) : 0,
      });
    });
  });
}

const whichCache = new Map();

/** Finds an executable on PATH (or returns an absolute path that exists). */
export function which(name) {
  if (whichCache.has(name)) return whichCache.get(name);
  let found = null;
  if (path.isAbsolute(name)) {
    found = isExecutable(name) ? name : null;
  } else {
    const extra = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/sbin', '/sbin'];
    for (const dir of [...(process.env.PATH || '').split(path.delimiter), ...extra]) {
      const candidate = path.join(dir, name);
      if (dir && isExecutable(candidate)) {
        found = candidate;
        break;
      }
    }
  }
  whichCache.set(name, found);
  return found;
}

function isExecutable(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}
