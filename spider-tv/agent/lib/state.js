import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const file = path.join(config.dataDir, 'state.json');

/** Small JSON store for preferences and playback progress. Writes are atomic (tmp + rename). */
let state = load();

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { prefs: parsed.prefs ?? {}, progress: parsed.progress ?? {} };
  } catch {
    return { prefs: {}, progress: {} };
  }
}

let timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, file);
  }, 150);
}

export function getPrefs() {
  return state.prefs;
}

export function setPrefs(patch) {
  state.prefs = { ...state.prefs, ...patch };
  save();
  return state.prefs;
}

export function getProgress() {
  return state.progress;
}

export function setProgress(id, entry) {
  if (entry === null) delete state.progress[id];
  else state.progress[id] = { ...entry, updatedAt: Date.now() };
  save();
}
