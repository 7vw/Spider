export type Action =
  | 'up' | 'down' | 'left' | 'right'
  | 'ok' | 'back' | 'menu' | 'home' | 'search'
  | 'playpause' | 'play' | 'pause' | 'ff' | 'rw'
  | 'volup' | 'voldown' | 'mute';

const BY_KEY: Record<string, Action> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Enter: 'ok', NumpadEnter: 'ok', Select: 'ok', Accept: 'ok',
  Escape: 'back', Backspace: 'back', BrowserBack: 'back', GoBack: 'back',
  ContextMenu: 'menu', Menu: 'menu',
  BrowserHome: 'home', GoHome: 'home',
  BrowserSearch: 'search', '/': 'search',
  MediaPlayPause: 'playpause', MediaPlay: 'play', MediaPause: 'pause',
  MediaFastForward: 'ff', MediaTrackNext: 'ff', MediaRewind: 'rw', MediaTrackPrevious: 'rw',
  AudioVolumeUp: 'volup', AudioVolumeDown: 'voldown', AudioVolumeMute: 'mute',
  // Development shortcuts on a laptop keyboard.
  '+': 'volup', '=': 'volup', '-': 'voldown',
};

// Legacy keyCodes sent by TV remotes through some browsers / CEC bridges (webOS 461, Tizen 10009).
const BY_CODE: Record<number, Action> = { 461: 'back', 10009: 'back', 415: 'play', 19: 'pause', 417: 'ff', 412: 'rw' };

export function toAction(e: KeyboardEvent): Action | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  return BY_KEY[e.key] ?? BY_CODE[e.keyCode] ?? null;
}
