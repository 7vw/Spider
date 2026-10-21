import { useEffect, useRef } from 'react';
import { pushBackHandler, pushInterceptor, type Interceptor } from './engine';

/** Registers a Back handler while `active`. Return true to consume the press. */
export function useBack(handler: () => boolean, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    return pushBackHandler(() => ref.current());
  }, [active]);
}

/** Sees every remote action before spatial navigation does. Return true to consume it. */
export function useInterceptor(handler: Interceptor, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    return pushInterceptor((a, e) => ref.current(a, e));
  }, [active]);
}
