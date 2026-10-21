import { en, type Dict } from './en';
import { ar } from './ar';
import { usePrefs } from '../store/prefs';

export type Lang = 'ar' | 'en';
const dicts: Record<Lang, Dict> = { ar, en };

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'ar', label: 'العربية' },
  { id: 'en', label: 'English' },
];

export function isRtl(lang: Lang) {
  return lang === 'ar';
}

export function locale(lang: Lang) {
  return lang === 'ar' ? 'ar-u-ca-gregory' : 'en-GB';
}

function lookup(dict: Dict, key: string): string {
  let cur: unknown = dict;
  for (const part of key.split('.')) cur = (cur as Record<string, unknown>)?.[part];
  return typeof cur === 'string' ? cur : key;
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>) {
  let s = lookup(dicts[lang], key);
  if (s === key && lang !== 'en') s = lookup(en, key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function useT() {
  const lang = usePrefs((p) => p.lang);
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
  return { t, lang, rtl: isRtl(lang), locale: locale(lang) };
}

export function formatBytes(t: (k: string) => string, bytes: number, loc: string) {
  const units = ['b', 'kb', 'mb', 'gb', 'tb'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const n = new Intl.NumberFormat(loc, { maximumFractionDigits: v >= 100 || i === 0 ? 0 : 1 }).format(v);
  return `${n} ${t(`units.${units[i]}`)}`;
}

export function formatDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
