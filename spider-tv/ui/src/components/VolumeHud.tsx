import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useT } from '../core/i18n';
import { api } from '../core/agent/api';
import type { Volume } from '../core/agent/types';
import { toast } from '../core/store/toast';

let show: ((v: Volume) => void) | null = null;

/** Called by the global key handler for volume keys. Talks to the agent, which drives the real mixer. */
export async function changeVolume(action: 'volup' | 'voldown' | 'mute', t: (k: string) => string) {
  try {
    const cur = await api.get<Volume>('/api/audio');
    if (!cur.supported) {
      toast({ title: t('settings.audio.unsupported'), tone: 'error' });
      return;
    }
    const body = action === 'mute' ? { muted: !cur.muted } : { level: (cur.level ?? 0) + (action === 'volup' ? 5 : -5), muted: false };
    show?.(await api.put<Volume>('/api/audio', body));
  } catch {
    toast({ title: t('common.agentOffline'), tone: 'error' });
  }
}

export function VolumeHud() {
  const { t } = useT();
  const [vol, setVol] = useState<Volume | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    show = (v) => {
      setVol(v);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setVol(null), 2200);
    };
    return () => {
      show = null;
    };
  }, []);
  if (!vol) return null;
  return (
    <div className="volume-hud glass">
      <Icon name={vol.muted ? 'mute' : 'volume'} />
      <span className="volume-hud__bar">
        <span style={{ height: `${vol.muted ? 0 : vol.level ?? 0}%` }} />
      </span>
      <span className="volume-hud__value">{vol.muted ? t('volume.muted') : vol.level}</span>
    </div>
  );
}
