import { createStore } from './store/createStore';

export type Route =
  | { name: 'home' }
  | { name: 'apps' }
  | { name: 'media' }
  | { name: 'settings'; section?: string }
  | { name: 'files'; dirId?: string }
  | { name: 'player'; id: string; title: string; start?: number }
  | { name: 'search' };

export const TABS = ['home', 'apps', 'media', 'settings'] as const;
export type TabName = (typeof TABS)[number];

interface Entry {
  route: Route;
  /** data-nav-id of the element that was focused when we left this entry. */
  focusId?: string | null;
}

const store = createStore<{ stack: Entry[] }>({ stack: [{ route: { name: 'home' } }] });

export const useRoute = () => store.use((s) => s.stack[s.stack.length - 1]);
export const useStackDepth = () => store.use((s) => s.stack.length);

const currentFocusId = () => (document.activeElement as HTMLElement | null)?.dataset?.navId ?? null;

function remember(stack: Entry[]) {
  const top = stack[stack.length - 1];
  return [...stack.slice(0, -1), { ...top, focusId: currentFocusId() }];
}

/** Tabs replace the stack; everything else is pushed on top of it. */
export function navigate(route: Route) {
  const isTab = (TABS as readonly string[]).includes(route.name);
  store.set((s) => {
    if (isTab) {
      const base = route.name === 'home' ? [] : [{ route: { name: 'home' } as Route }];
      return { stack: [...base, { route }] };
    }
    return { stack: [...remember(s.stack), { route }] };
  });
}

/** Replaces the top entry (used when moving between folders without growing history for each step). */
export function replace(route: Route) {
  store.set((s) => ({ stack: [...s.stack.slice(0, -1), { route }] }));
}

export function back(): boolean {
  const { stack } = store.get();
  if (stack.length <= 1) return false;
  store.set({ stack: stack.slice(0, -1) });
  return true;
}
