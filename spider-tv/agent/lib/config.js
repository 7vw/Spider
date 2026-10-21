import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const home = os.homedir();
const platform = process.platform;

function splitDirs(value) {
  return value
    .split(path.delimiter)
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => path.resolve(d.replace(/^~(?=$|\/)/, home)));
}

function existing(dirs) {
  return dirs.filter((d) => {
    try {
      return fs.statSync(d).isDirectory();
    } catch {
      return false;
    }
  });
}

const defaultMedia = platform === 'darwin' ? ['Movies'] : ['Videos'];
const defaultRoots = [...defaultMedia, 'Music', 'Pictures', 'Downloads'];

export const config = {
  version: '0.1.0',
  platform,
  // Loopback only by default. The phone remote (Phase 4) will need an explicit LAN opt-in with pairing.
  host: process.env.SPIDER_HOST || '127.0.0.1',
  port: Number(process.env.SPIDER_PORT || 7766),
  dataDir: path.resolve(process.env.SPIDER_DATA_DIR || path.join(home, '.spider-tv')),
  mediaDirs: existing(process.env.SPIDER_MEDIA_DIRS ? splitDirs(process.env.SPIDER_MEDIA_DIRS) : defaultMedia.map((d) => path.join(home, d))),
  fileRoots: existing(process.env.SPIDER_FILE_ROOTS ? splitDirs(process.env.SPIDER_FILE_ROOTS) : defaultRoots.map((d) => path.join(home, d))),
  uiDist: path.resolve(import.meta.dirname, '../../ui/dist'),
  catalogPath: path.resolve(import.meta.dirname, '../../shared/catalog.json'),
};

fs.mkdirSync(config.dataDir, { recursive: true });
