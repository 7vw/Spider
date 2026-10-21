import { pickBest, type Box, type Direction } from './spatial';
import { toAction, type Action } from './keys';

/**
 * DOM-driven focus engine.
 * - Focusable: [data-focusable]. Disabled-but-explained items use aria-disabled and stay focusable.
 * - Layers: the last [data-nav-layer] in the document traps focus (modals, player, search).
 * - Groups: [data-nav-group] remembers its last focused child; data-nav-memory="off" always
 *   enters on the child marked [data-nav-default].
 * - Rows marked [data-scroll-row] align to the top of their positioned scroller when focused.
 * - Elements can opt out of D-pad handling for an axis with data-nav-capture="horizontal".
 */

export type Interceptor = (action: Action, e: KeyboardEvent) => boolean;
type BackHandler = () => boolean;

const memory = new Map<string, HTMLElement>();
const interceptors: Interceptor[] = [];
const backHandlers: BackHandler[] = [];
let reduceMotion = false;
let lastMove = 0;

export function setReduceMotion(v: boolean) {
  reduceMotion = v;
}

export function activeLayer(): HTMLElement {
  const layers = document.querySelectorAll<HTMLElement>('[data-nav-layer]');
  return layers.length ? layers[layers.length - 1] : document.body;
}

function isVisible(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  return getComputedStyle(el).visibility !== 'hidden';
}

export function focusables(layer = activeLayer()): HTMLElement[] {
  const owner = layer === document.body ? null : layer;
  return [...layer.querySelectorAll<HTMLElement>('[data-focusable]')].filter(
    (el) => el.closest('[data-nav-layer]') === owner && isVisible(el),
  );
}

function groupOf(el: Element | null): HTMLElement | null {
  return el?.closest<HTMLElement>('[data-nav-group]') ?? null;
}

export function focusEl(el: HTMLElement | null | undefined) {
  if (!el) return false;
  el.focus({ preventScroll: true });
  const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior });
  // Shelves snap so the focused row sits at the top of its scroller, title included (TV launcher behaviour).
  const row = el.closest<HTMLElement>('[data-scroll-row]');
  const scroller = row?.offsetParent as HTMLElement | null;
  if (row && scroller) scroller.scrollTo({ top: row.offsetTop, behavior });
  return true;
}

/** Puts focus somewhere sensible in the active layer if it is not already there. */
export function ensureFocus(preferredId?: string | null) {
  const layer = activeLayer();
  const current = document.activeElement as HTMLElement | null;
  const list = focusables(layer);
  if (preferredId) {
    const byId = list.find((el) => el.dataset.navId === preferredId);
    if (byId) return focusEl(byId);
  }
  if (current && list.includes(current)) return true;
  return focusEl(list.find((el) => el.hasAttribute('data-autofocus')) ?? list[0]);
}

function resolveEntry(target: HTMLElement, from: HTMLElement | null): HTMLElement {
  const group = groupOf(target);
  if (!group || group === groupOf(from)) return target;
  const list = focusables();
  if (group.dataset.navMemory === 'off') {
    const def = group.querySelector<HTMLElement>('[data-nav-default]');
    return def && list.includes(def) ? def : target;
  }
  const remembered = memory.get(group.dataset.navGroup!);
  return remembered && remembered.isConnected && list.includes(remembered) ? remembered : target;
}

export function move(dir: Direction): boolean {
  const current = document.activeElement as HTMLElement | null;
  const list = focusables();
  if (!current || !list.includes(current)) return ensureFocus();
  const r = current.getBoundingClientRect();
  const candidates = list
    .filter((el) => el !== current)
    .map((el) => {
      const b = el.getBoundingClientRect();
      return { box: { left: b.left, top: b.top, right: b.right, bottom: b.bottom } as Box, item: el };
    });
  const best = pickBest({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }, candidates, dir);
  if (!best) return false;
  return focusEl(resolveEntry(best, current));
}

export function pushInterceptor(fn: Interceptor) {
  interceptors.push(fn);
  return () => {
    const i = interceptors.lastIndexOf(fn);
    if (i >= 0) interceptors.splice(i, 1);
  };
}

export function pushBackHandler(fn: BackHandler) {
  backHandlers.push(fn);
  return () => {
    const i = backHandlers.lastIndexOf(fn);
    if (i >= 0) backHandlers.splice(i, 1);
  };
}

export function goBack() {
  for (let i = backHandlers.length - 1; i >= 0; i--) if (backHandlers[i]()) return true;
  return false;
}

type GlobalHandler = (action: Action) => void;
let globalHandler: GlobalHandler = () => {};

export function setGlobalHandler(fn: GlobalHandler) {
  globalHandler = fn;
}

function onKeyDown(e: KeyboardEvent) {
  const action = toAction(e);
  if (!action) return;
  for (let i = interceptors.length - 1; i >= 0; i--) {
    if (interceptors[i](action, e)) {
      e.preventDefault();
      return;
    }
  }
  if (e.defaultPrevented) return;
  const active = document.activeElement as HTMLElement | null;
  const capture = active?.dataset.navCapture;
  if (capture === 'horizontal' && (action === 'left' || action === 'right')) return;

  switch (action) {
    case 'up':
    case 'down':
    case 'left':
    case 'right': {
      e.preventDefault();
      // Throttle held keys so smooth scrolling can keep up.
      const now = performance.now();
      if (e.repeat && now - lastMove < 90) return;
      lastMove = now;
      move(action);
      return;
    }
    case 'ok':
      e.preventDefault();
      if (active && focusables().includes(active)) active.click();
      else ensureFocus();
      return;
    case 'back':
      e.preventDefault();
      goBack();
      return;
    default:
      e.preventDefault();
      globalHandler(action);
  }
}

function onFocusIn(e: FocusEvent) {
  const el = e.target as HTMLElement;
  const group = groupOf(el);
  if (group?.dataset.navGroup && el.hasAttribute('data-focusable')) memory.set(group.dataset.navGroup, el);
}

let installed = false;
export function installNavigation() {
  if (installed) return;
  installed = true;
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('focusin', onFocusIn);
  // Pointer users (Mac development, air mouse remotes) get focus on hover so there is one visual state.
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-focusable]');
    if (el && el !== document.activeElement && focusables().includes(el)) el.focus({ preventScroll: true });
  });
  // Clicking empty space must not drop focus to <body> on a TV.
  document.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) ensureFocus();
    });
  });
}
