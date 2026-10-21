import { useSyncExternalStore } from 'react';

/** Tiny external store with selector hooks; enough for app-wide state without a dependency. */
export function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  const get = () => state;
  const set = (patch: Partial<T> | ((s: T) => Partial<T>)) => {
    const next = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  function use<S>(selector: (s: T) => S): S {
    return useSyncExternalStore(subscribe, () => selector(state));
  }
  return { get, set, subscribe, use };
}
