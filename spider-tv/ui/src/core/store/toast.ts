import { createStore } from './createStore';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: 'info' | 'error' | 'success';
}

const store = createStore<{ toasts: Toast[] }>({ toasts: [] });
let seq = 0;

export const useToasts = () => store.use((s) => s.toasts);

export function toast(t: Omit<Toast, 'id'>, ms = 4500) {
  const id = ++seq;
  store.set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
  setTimeout(() => store.set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), ms);
}
