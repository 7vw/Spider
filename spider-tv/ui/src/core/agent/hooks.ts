import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { createStore } from '../store/createStore';

/** Whether the system agent answered its last health check. null = not checked yet. */
const health = createStore<{ online: boolean | null }>({ online: null });
export const useAgentOnline = () => health.use((s) => s.online);
export const setAgentOnline = (online: boolean) => health.get().online !== online && health.set({ online });

export interface Resource<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
}

/** Fetches an agent endpoint, optionally polling. Keeps the previous data while refreshing. */
export function useAgent<T>(path: string | null, pollMs = 0): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!!path);
  const alive = useRef(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    alive.current = true;
    if (!path) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      setLoading(true);
      try {
        const d = await api.get<T>(path);
        if (!alive.current) return;
        setData(d);
        setError(null);
        setAgentOnline(true);
      } catch (e) {
        if (!alive.current) return;
        setError(e as Error);
        if ((e as { status?: number }).status === 0) setAgentOnline(false);
      } finally {
        if (alive.current) setLoading(false);
      }
      if (pollMs && alive.current) timer = setTimeout(load, pollMs);
    };
    load();
    return () => {
      alive.current = false;
      clearTimeout(timer);
    };
  }, [path, pollMs, tick]);

  return { data, error, loading, reload };
}
