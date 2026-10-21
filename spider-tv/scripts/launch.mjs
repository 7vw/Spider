#!/usr/bin/env node
// "TV mode" on a development machine: serve the built UI from the agent and open it full screen
// in a dedicated Chromium kiosk window, the same way the standalone device will boot (Phase 3).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const port = Number(process.env.SPIDER_PORT || 7766);
const url = `http://127.0.0.1:${port}/`;

const { findBrowser } = await import(path.join(root, 'agent/lib/apps.js'));

async function agentUp() {
  try {
    const res = await fetch(`${url}api/health`, { signal: AbortSignal.timeout(800) });
    return res.ok;
  } catch {
    return false;
  }
}

let agent = null;
if (!(await agentUp())) {
  agent = spawn(process.execPath, [path.join(root, 'agent/server.js')], { stdio: 'inherit' });
  for (let i = 0; i < 40 && !(await agentUp()); i++) await new Promise((r) => setTimeout(r, 150));
}

const browser = findBrowser();
if (!browser) {
  console.log(`\nNo Chromium-based browser found. Open ${url} in any browser, or install Google Chrome.\n`);
} else {
  const profile = path.join(process.env.SPIDER_DATA_DIR || path.join(os.homedir(), '.spider-tv'), 'browser-profiles', 'shell');
  fs.mkdirSync(profile, { recursive: true });
  const windowed = process.argv.includes('--window');
  const args = [
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-session-crashed-bubble',
    '--autoplay-policy=no-user-gesture-required',
    windowed ? '--window-size=1920,1080' : '--kiosk',
    `--app=${url}`,
  ];
  console.log(`\nSPIDER TV is running full screen. Quit with ${process.platform === 'darwin' ? '⌘Q' : 'Alt+F4'}.\n`);
  const shell = spawn(browser, args, { stdio: 'ignore' });
  shell.on('exit', () => {
    agent?.kill('SIGTERM');
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  agent?.kill('SIGTERM');
  process.exit(0);
});
