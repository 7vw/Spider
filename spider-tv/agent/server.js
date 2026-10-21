#!/usr/bin/env node
// SPIDER TV system agent: the only process that touches the OS. The UI talks to it over HTTP on loopback.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './lib/config.js';
import { createRouter, sendJson, readJson, HttpError } from './lib/http.js';
import { systemInfo, networkInfo, storageInfo, checkOnline } from './lib/system.js';
import { getVolume, setVolume } from './lib/audio.js';
import { bluetoothStatus } from './lib/bluetooth.js';
import { library, resolveId, streamFile, thumbnail, listDir, roots } from './lib/media.js';
import { catalog, launch, closeRunning, runningApp, findBrowser } from './lib/apps.js';
import { mirroringStatus, startAirplay, stopAirplay } from './lib/mirroring.js';
import { getPrefs, setPrefs, getProgress, setProgress } from './lib/state.js';
import { which } from './lib/exec.js';

const router = createRouter();

router.get('/api/health', () => ({ ok: true, version: config.version, platform: config.platform }));

router.get('/api/capabilities', async () => {
  const volume = await getVolume();
  return {
    platform: config.platform,
    browser: findBrowser() ? path.basename(findBrowser()) : null,
    volume: volume.supported,
    wifiScan: config.platform === 'linux' && !!which('nmcli'),
    bluetooth: config.platform === 'darwin' || !!which('bluetoothctl'),
    thumbnails: !!which('ffmpeg'),
    airplay: !!which('uxplay'),
    mediaDirs: config.mediaDirs,
  };
});

router.get('/api/system', () => systemInfo());
router.get('/api/network', () => networkInfo());
router.get('/api/network/online', () => checkOnline());
router.get('/api/storage', async () => ({ ...(await storageInfo()), mediaDirs: config.mediaDirs, fileRoots: roots }));
router.get('/api/bluetooth', () => bluetoothStatus());
router.get('/api/audio', () => getVolume());
router.put('/api/audio', async ({ req }) => setVolume(await readJson(req)));

router.get('/api/prefs', () => getPrefs());
router.put('/api/prefs', async ({ req }) => {
  const body = await readJson(req);
  const allowed = ['theme', 'lang', 'favorites', 'clock24', 'reduceMotion', 'overscan', 'hiddenApps'];
  return setPrefs(Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k))));
});

router.get('/api/media', async ({ url }) => ({ dirs: config.mediaDirs, items: await library({ fresh: url.searchParams.has('fresh') }) }));
router.get('/api/media/stream/:id', ({ req, res, params }) => {
  streamFile(req, res, resolveId(params.id).abs);
  return undefined;
});
router.get('/api/media/thumb/:id', async ({ req, res, params }) => {
  const out = await thumbnail(resolveId(params.id).abs);
  if (!out) throw new HttpError(404, 'No thumbnail');
  streamFile(req, res, out);
  return undefined;
});

router.get('/api/files', ({ url }) => listDir(url.searchParams.get('id') || ''));

router.get('/api/progress', async () => {
  const progress = getProgress();
  const items = [];
  for (const [id, p] of Object.entries(progress)) {
    try {
      if (fs.existsSync(resolveId(id).abs)) items.push({ id, ...p });
    } catch {
      /* root no longer configured */
    }
  }
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
});
router.put('/api/progress/:id', async ({ req, params }) => {
  const { position, duration, title } = await readJson(req);
  resolveId(params.id);
  const done = duration > 0 && position / duration > 0.95;
  if (done || !(position > 10)) setProgress(params.id, null);
  else setProgress(params.id, { position, duration, title: String(title ?? '').slice(0, 200) });
  return { ok: true };
});

router.get('/api/apps', () => ({ apps: catalog, running: runningApp(), browser: !!findBrowser() }));
router.post('/api/apps/:id/launch', ({ params }) => ({ running: launch(params.id) }));
router.post('/api/apps/close', () => ({ closed: closeRunning() }));

router.get('/api/mirroring', () => mirroringStatus());
router.post('/api/mirroring/airplay/start', () => startAirplay());
router.post('/api/mirroring/airplay/stop', () => stopAirplay());

const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon',
};

function serveStatic(res, pathname) {
  if (!fs.existsSync(config.uiDist)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('UI not built. Run `npm run build`, or use `npm run dev` for development.');
  }
  let file = path.resolve(config.uiDist, '.' + decodeURIComponent(pathname));
  if (!file.startsWith(config.uiDist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(config.uiDist, 'index.html');
  }
  const ext = path.extname(file);
  res.writeHead(200, {
    'Content-Type': STATIC_TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  // The Vite dev server proxies /api, so browsers never need CORS. Reject cross-site writes outright.
  const origin = req.headers.origin;
  if (origin && req.method !== 'GET' && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return sendJson(res, 403, { error: 'Cross-origin request refused' });
  }
  if (!url.pathname.startsWith('/api/')) return serveStatic(res, url.pathname);
  const match = router.match(req.method ?? 'GET', url.pathname);
  if (!match) return sendJson(res, 404, { error: 'Not found' });
  try {
    const result = await match.handler({ req, res, url, params: match.params });
    if (result !== undefined) sendJson(res, 200, result);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) sendJson(res, status, { error: err.message, ...(err.extra ?? {}) });
    else res.end();
  }
});

server.listen(config.port, config.host, () => {
  console.log(`SPIDER TV agent ${config.version} on http://${config.host}:${config.port}`);
  console.log(`  media folders: ${config.mediaDirs.join(', ') || '(none found)'}`);
  console.log(`  browser for apps: ${findBrowser() ?? 'not found'}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    closeRunning();
    stopAirplay();
    process.exit(0);
  });
}
