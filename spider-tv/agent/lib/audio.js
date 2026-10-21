import { run, which } from './exec.js';
import { parseAmixer, parseMacVolume, parseWpctl } from './parsers.js';
import { config } from './config.js';

/** Picks the first volume backend that exists on this machine. */
function backend() {
  if (config.platform === 'darwin' && which('osascript')) return 'macos';
  if (config.platform === 'linux' && which('wpctl')) return 'wpctl';
  if (config.platform === 'linux' && which('amixer')) return 'amixer';
  return null;
}

export async function getVolume() {
  const b = backend();
  if (b === 'macos') {
    const r = await run('osascript', ['-e', 'get volume settings']);
    const v = r.ok ? parseMacVolume(r.stdout) : null;
    return v ? { supported: true, backend: b, ...v } : { supported: false, backend: b };
  }
  if (b === 'wpctl') {
    const r = await run('wpctl', ['get-volume', '@DEFAULT_AUDIO_SINK@']);
    const v = r.ok ? parseWpctl(r.stdout) : null;
    return v ? { supported: true, backend: b, ...v } : { supported: false, backend: b };
  }
  if (b === 'amixer') {
    const r = await run('amixer', ['get', 'Master']);
    const v = r.ok ? parseAmixer(r.stdout) : null;
    return v ? { supported: true, backend: b, ...v } : { supported: false, backend: b };
  }
  return { supported: false, backend: null };
}

export async function setVolume({ level, muted }) {
  const b = backend();
  if (!b) return { supported: false, backend: null };
  if (typeof level === 'number') {
    const l = Math.max(0, Math.min(100, Math.round(level)));
    if (b === 'macos') await run('osascript', ['-e', `set volume output volume ${l}`]);
    if (b === 'wpctl') await run('wpctl', ['set-volume', '@DEFAULT_AUDIO_SINK@', `${l}%`]);
    if (b === 'amixer') await run('amixer', ['set', 'Master', `${l}%`]);
  }
  if (typeof muted === 'boolean') {
    if (b === 'macos') await run('osascript', ['-e', `set volume output muted ${muted}`]);
    if (b === 'wpctl') await run('wpctl', ['set-mute', '@DEFAULT_AUDIO_SINK@', muted ? '1' : '0']);
    if (b === 'amixer') await run('amixer', ['set', 'Master', muted ? 'mute' : 'unmute']);
  }
  return getVolume();
}
