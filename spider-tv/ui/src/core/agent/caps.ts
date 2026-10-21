import { useAgent } from './hooks';
import type { Capabilities } from './types';

export function useCapabilities() {
  return useAgent<Capabilities>('/api/capabilities').data;
}
