import { createStore } from './createStore';
import { api } from '../agent/api';
import type { Lang } from '../i18n';
import type { ThemeId } from '../theme/themes';

export interface Prefs {
  lang: Lang;
  theme: ThemeId;
  favorites: string[];
  clock24: boolean;
  reduceMotion: boolean;
  /** Safe-area inset in percent of the screen, for TVs that overscan. */
  overscan: number;
}

const DEFAULTS: Prefs = {
  lang: 'ar',
  theme: 'classic',
  favorites: ['youtube', 'netflix', 'shahid', 'media'],
  clock24: false,
  reduceMotion: false,
  overscan: 0,
};

const KEY = 'spider-tv:prefs';

function readLocal(): Partial<Prefs> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

const store = createStore<Prefs>({ ...DEFAULTS, ...readLocal() });

export const usePrefs = store.use;
export const getPrefs = store.get;

let syncTimer: ReturnType<typeof setTimeout> | undefined;

/** Updates prefs locally right away and persists them through the agent (debounced). */
export function setPrefs(patch: Partial<Prefs>) {
  store.set(patch);
  try {
    localStorage.setItem(KEY, JSON.stringify(store.get()));
  } catch {
    /* storage unavailable */
  }
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    api.put('/api/prefs', store.get()).catch(() => {});
  }, 400);
}

/** The agent's copy wins at boot so prefs survive a browser profile reset on the device. */
export async function loadPrefsFromAgent() {
  try {
    const remote = await api.get<Partial<Prefs>>('/api/prefs');
    if (remote && Object.keys(remote).length) store.set({ ...remote });
  } catch {
    /* offline: keep local */
  }
}

export function toggleFavorite(appId: string) {
  const favs = store.get().favorites;
  setPrefs({ favorites: favs.includes(appId) ? favs.filter((f) => f !== appId) : [...favs, appId] });
}
