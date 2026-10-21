import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { config } from './config.js';
import { which } from './exec.js';
import { HttpError } from './http.js';

export const catalog = JSON.parse(fs.readFileSync(config.catalogPath, 'utf8')).apps;

const MAC_BROWSERS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];
const LINUX_BROWSERS = ['chromium-browser', 'chromium', 'google-chrome', 'google-chrome-stable', 'microsoft-edge', 'brave-browser'];

/** Chromium-family only: it is the engine with Widevine on both macOS and Raspberry Pi OS. */
export function findBrowser() {
  if (process.env.SPIDER_BROWSER) return which(process.env.SPIDER_BROWSER);
  const list = config.platform === 'darwin' ? MAC_BROWSERS : LINUX_BROWSERS;
  for (const b of list) {
    const found = which(b);
    if (found) return found;
  }
  return null;
}

let running = null; // { appId, child, startedAt }

export function runningApp() {
  return running ? { appId: running.appId, startedAt: running.startedAt } : null;
}

export function launch(appId) {
  const app = catalog.find((a) => a.id === appId);
  if (!app) throw new HttpError(404, 'Unknown app');
  if (app.kind === 'builtin') throw new HttpError(400, 'Built-in apps open inside the shell');
  const browser = findBrowser();
  if (!browser) {
    throw new HttpError(501, 'No Chromium-based browser found', { code: 'no-browser', url: app.url });
  }
  closeRunning();
  const profileDir = path.join(config.dataDir, 'browser-profiles', app.profile || 'default');
  fs.mkdirSync(profileDir, { recursive: true });
  const args = [
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-session-crashed-bubble',
    '--autoplay-policy=no-user-gesture-required',
  ];
  if (app.userAgent) args.push(`--user-agent=${app.userAgent}`);
  if (app.kind === 'browser') args.push('--start-fullscreen', app.url);
  else args.push('--kiosk', `--app=${app.url}`);

  const child = spawn(browser, args, { stdio: 'ignore', detached: false });
  const entry = { appId, child, startedAt: Date.now() };
  running = entry;
  child.on('exit', () => {
    if (running === entry) running = null;
  });
  child.on('error', () => {
    if (running === entry) running = null;
  });
  return runningApp();
}

export function closeRunning() {
  if (!running) return false;
  try {
    running.child.kill('SIGTERM');
  } catch {
    /* already gone */
  }
  running = null;
  return true;
}
