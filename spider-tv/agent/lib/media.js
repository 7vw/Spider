import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';
import { run, which } from './exec.js';
import { HttpError } from './http.js';

// Every path the agent will read is inside one of these roots. Ids encode (root index, relative path).
export const roots = [...new Set([...config.mediaDirs, ...config.fileRoots])];

const VIDEO = new Set(['.mp4', '.m4v', '.mov', '.webm', '.mkv', '.avi', '.ts', '.wmv', '.flv']);
const AUDIO = new Set(['.mp3', '.m4a', '.aac', '.flac', '.wav', '.ogg', '.opus']);
const IMAGE = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.heic']);
// Containers Chromium plays natively when the codec inside is H.264/HEVC(mac)/VP9/AV1. mkv usually works; avi/wmv/flv do not.
const BROWSER_VIDEO = new Set(['.mp4', '.m4v', '.mov', '.webm', '.mkv']);

const MIME = {
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo', '.ts': 'video/mp2t', '.wmv': 'video/x-ms-wmv', '.flv': 'video/x-flv',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac', '.wav': 'audio/wav',
  '.ogg': 'audio/ogg', '.opus': 'audio/ogg',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
  '.avif': 'image/avif', '.heic': 'image/heic',
};

export function kindOf(name) {
  const ext = path.extname(name).toLowerCase();
  if (VIDEO.has(ext)) return 'video';
  if (AUDIO.has(ext)) return 'audio';
  if (IMAGE.has(ext)) return 'image';
  return 'other';
}

export function encodeId(rootIndex, rel) {
  return Buffer.from(`${rootIndex}:${rel}`, 'utf8').toString('base64url');
}

/** Decodes an id into an absolute path, refusing anything that escapes its root. */
export function resolveId(id, rootList = roots) {
  let decoded;
  try {
    decoded = Buffer.from(String(id), 'base64url').toString('utf8');
  } catch {
    throw new HttpError(400, 'Bad id');
  }
  const sep = decoded.indexOf(':');
  const idx = Number(decoded.slice(0, sep));
  const rel = decoded.slice(sep + 1);
  const root = rootList[idx];
  if (sep < 1 || !Number.isInteger(idx) || !root) throw new HttpError(404, 'Unknown root');
  const abs = path.resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new HttpError(403, 'Outside of allowed roots');
  return { abs, root, rootIndex: idx, rel };
}

function cleanTitle(file) {
  return path
    .basename(file, path.extname(file))
    .replace(/[._]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let libraryCache = { at: 0, items: [] };

/** Recursively lists videos in the media folders (depth-limited, hidden folders skipped). Cached 30 s. */
export async function library({ fresh = false } = {}) {
  if (!fresh && Date.now() - libraryCache.at < 30_000) return libraryCache.items;
  const items = [];
  for (const mediaDir of config.mediaDirs) {
    const rootIndex = roots.indexOf(mediaDir);
    await walk(mediaDir, 0, async (abs, stat) => {
      if (kindOf(abs) !== 'video') return;
      const rel = path.relative(mediaDir, abs);
      const ext = path.extname(abs).toLowerCase();
      items.push({
        id: encodeId(rootIndex, rel),
        title: cleanTitle(abs),
        folder: path.dirname(rel) === '.' ? null : path.dirname(rel),
        ext: ext.slice(1),
        sizeBytes: stat.size,
        modifiedAt: stat.mtimeMs,
        browserPlayable: BROWSER_VIDEO.has(ext),
      });
    });
  }
  items.sort((a, b) => b.modifiedAt - a.modifiedAt);
  libraryCache = { at: Date.now(), items };
  return items;
}

async function walk(dir, depth, onFile) {
  if (depth > 4) return;
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) await walk(abs, depth + 1, onFile);
    else if (e.isFile()) {
      try {
        await onFile(abs, await fsp.stat(abs));
      } catch {
        /* unreadable file: skip */
      }
    }
  }
}

/** Streams a file with HTTP Range support so <video> can seek. */
export function streamFile(req, res, abs) {
  let stat;
  try {
    stat = fs.statSync(abs);
  } catch {
    throw new HttpError(404, 'Not found');
  }
  if (!stat.isFile()) throw new HttpError(404, 'Not a file');
  const type = MIME[path.extname(abs).toLowerCase()] ?? 'application/octet-stream';
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (range) {
    let start = range[1] ? Number(range[1]) : stat.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : stat.size - 1;
    end = Math.min(end, stat.size - 1);
    if (start > end || start < 0) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      return res.end();
    }
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(abs, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(abs).pipe(res);
  }
}

const thumbDir = path.join(config.dataDir, 'thumbs');
const pending = new Map();

/** Extracts one frame with ffmpeg if it is installed. Returns the jpg path or null. */
export async function thumbnail(abs) {
  const ffmpeg = which('ffmpeg');
  if (!ffmpeg) return null;
  const stat = fs.statSync(abs);
  const key = crypto.createHash('sha1').update(`${abs}:${stat.mtimeMs}`).digest('hex');
  const out = path.join(thumbDir, `${key}.jpg`);
  if (fs.existsSync(out)) return out;
  if (pending.has(key)) return pending.get(key);
  const job = (async () => {
    fs.mkdirSync(thumbDir, { recursive: true });
    for (const seek of ['30', '3', '0']) {
      await run(ffmpeg, ['-y', '-loglevel', 'error', '-ss', seek, '-i', abs, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', out], { timeout: 20000 });
      if (fs.existsSync(out) && fs.statSync(out).size > 0) return out;
    }
    return null;
  })();
  pending.set(key, job);
  try {
    return await job;
  } finally {
    pending.delete(key);
  }
}

export async function listDir(id) {
  if (!id) {
    return {
      path: null,
      parent: null,
      entries: roots.map((r, i) => ({ id: encodeId(i, ''), name: path.basename(r), type: 'dir', kind: 'root' })),
    };
  }
  const { abs, rootIndex, rel } = resolveId(id);
  let dirents;
  try {
    dirents = await fsp.readdir(abs, { withFileTypes: true });
  } catch {
    throw new HttpError(404, 'Folder not readable');
  }
  const entries = [];
  for (const e of dirents) {
    if (e.name.startsWith('.')) continue;
    const childRel = rel ? path.join(rel, e.name) : e.name;
    if (e.isDirectory()) entries.push({ id: encodeId(rootIndex, childRel), name: e.name, type: 'dir', kind: 'dir' });
    else if (e.isFile()) {
      let size = 0;
      try {
        size = (await fsp.stat(path.join(abs, e.name))).size;
      } catch {
        continue;
      }
      entries.push({ id: encodeId(rootIndex, childRel), name: e.name, type: 'file', kind: kindOf(e.name), sizeBytes: size });
    }
  }
  entries.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  const rootName = path.basename(roots[rootIndex]);
  return {
    path: rel ? `${rootName}/${rel}` : rootName,
    parent: rel ? encodeId(rootIndex, path.dirname(rel) === '.' ? '' : path.dirname(rel)) : '',
    entries,
  };
}
