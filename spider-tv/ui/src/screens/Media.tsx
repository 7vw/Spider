import { useState } from 'react';
import { Backdrop } from '../components/Backdrop';
import { MediaTile } from '../components/Tiles';
import { Icon } from '../components/Icon';
import { useT, formatBytes } from '../core/i18n';
import { useAgent } from '../core/agent/hooks';
import { useCapabilities } from '../core/agent/caps';
import { api, thumbUrl, PREVIEW } from '../core/agent/api';
import type { MediaItem, ProgressItem } from '../core/agent/types';
import { navigate } from '../core/router';

export function Media() {
  const { t, locale } = useT();
  const caps = useCapabilities();
  const lib = useAgent<{ dirs: string[]; items: MediaItem[] }>('/api/media');
  const progress = useAgent<ProgressItem[]>('/api/progress').data ?? [];
  const [focused, setFocused] = useState<MediaItem | null>(null);
  const thumbs = !!caps?.thumbnails;
  // Isolate paths (LRI…PDI) so “/Users/me/Movies” doesn't reorder inside Arabic sentences.
  const dirs = (lib.data?.dirs ?? []).map((d) => `\u2066${d}\u2069`);
  const items = lib.data?.items ?? [];
  const progressOf = (id: string) => progress.find((p) => p.id === id);

  const refresh = async () => {
    await api.get('/api/media?fresh').catch(() => {});
    lib.reload();
  };

  return (
    <div className="screen media">
      <Backdrop art={focused ? { kind: 'media', id: focused.id, title: focused.title, thumb: thumbs ? thumbUrl(focused.id) : null } : { kind: 'ambient' }} />
      <header className="page-head page-head--row">
        <div>
          <h1>{t('media.title')}</h1>
          <p>{dirs.length ? t('media.subtitle', { dirs: dirs.join(' · ') }) : t('media.noDirs')}</p>
        </div>
        <div className="btn-row" data-nav-group="media-actions">
          <button className="btn" data-focusable data-nav-id="media-refresh" onClick={refresh}>
            <Icon name="refresh" /> {t('common.refresh')}
          </button>
          <button className="btn" data-focusable data-nav-id="media-files" onClick={() => navigate({ name: 'files' })}>
            <Icon name="folder" /> {t('media.browseFiles')}
          </button>
        </div>
      </header>

      {lib.error && !lib.data ? (
        <Empty icon="alert" title={PREVIEW ? t('preview.title') : t('common.agentOffline')} body={PREVIEW ? t('preview.body') : undefined} />
      ) : items.length === 0 && !lib.loading ? (
        <Empty icon="film" title={t('media.empty')} body={dirs.length ? t('media.emptyHint', { dirs: dirs.join(' · ') }) : t('media.noDirs')} />
      ) : (
        <div className="media__grid" data-nav-group="media-grid">
          {items.map((item, i) => {
            const p = progressOf(item.id);
            return (
              <div key={item.id} className="media__cell">
                <MediaTile
                  item={item}
                  thumbs={thumbs}
                  progress={p ? p.position / p.duration : undefined}
                  navId={`media-${item.id}`}
                  autoFocus={i === 0}
                  onFocus={() => setFocused(item)}
                  onClick={() => navigate({ name: 'player', id: item.id, title: item.title, start: p?.position })}
                />
                <div className="media__caption">
                  <span>{item.folder ? `${item.folder} · ` : ''}{item.ext.toUpperCase()} · {formatBytes(t, item.sizeBytes, locale)}</span>
                  {!item.browserPlayable && (
                    <span className="chip chip--warn">
                      <Icon name="alert" /> {t('media.unplayable')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Empty({ icon, title, body }: { icon: 'film' | 'alert' | 'folder'; title: string; body?: string }) {
  return (
    <div className="empty glass">
      <Icon name={icon} />
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}
