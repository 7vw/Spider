import { useState } from 'react';
import { Backdrop } from '../components/Backdrop';
import { AppTile, AppArt } from '../components/Tiles';
import { Sheet } from '../components/Sheet';
import { Icon } from '../components/Icon';
import { useT } from '../core/i18n';
import { usePrefs, toggleFavorite } from '../core/store/prefs';
import { useCapabilities } from '../core/agent/caps';
import { useAgent } from '../core/agent/hooks';
import { api } from '../core/agent/api';
import type { CatalogApp } from '../core/agent/types';
import { APPS, launchApp, supportOf } from '../data/apps';

export function SupportChip({ app }: { app: CatalogApp }) {
  const { t } = useT();
  const level = supportOf(app);
  return (
    <span className={`chip chip--${level === 'drm-limited' ? 'warn' : 'ok'}`}>
      <Icon name={level === 'drm-limited' ? 'lock' : 'check'} />
      {t(`support.${level}`)}
    </span>
  );
}

export function Apps() {
  const { t } = useT();
  const favorites = usePrefs((p) => p.favorites);
  const [selected, setSelected] = useState<CatalogApp | null>(null);
  const [focused, setFocused] = useState<CatalogApp | null>(null);

  return (
    <div className="screen apps">
      <Backdrop art={focused ? { kind: 'app', app: focused } : { kind: 'ambient' }} />
      <header className="page-head">
        <h1>{t('apps.title')}</h1>
        <p>{t('apps.subtitle')}</p>
      </header>
      <div className="apps__grid" data-nav-group="apps-grid">
        {APPS.map((app, i) => (
          <div key={app.id} className="apps__cell">
            <AppTile
              app={app}
              navId={`apps-${app.id}`}
              autoFocus={i === 0}
              onFocus={() => setFocused(app)}
              onClick={() => setSelected(app)}
              badge={favorites.includes(app.id) ? <Icon name="star" filled className="tile__fav" /> : undefined}
            />
            <div className="apps__caption">
              <bdi>{app.name}</bdi>
              <SupportChip app={app} />
            </div>
          </div>
        ))}
      </div>
      {selected && <AppSheet app={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AppSheet({ app, onClose }: { app: CatalogApp; onClose: () => void }) {
  const { t, lang } = useT();
  const isFav = usePrefs((p) => p.favorites.includes(app.id));
  const caps = useCapabilities();
  const apps = useAgent<{ running: { appId: string } | null }>('/api/apps');
  const running = apps.data?.running?.appId === app.id;

  return (
    <Sheet onClose={onClose} className="app-sheet">
      <div className="app-sheet__art">
        <AppArt app={app} large />
      </div>
      <div className="app-sheet__body">
        <h2>{app.name}</h2>
        <SupportChip app={app} />
        <p className="app-sheet__note">{t(`support.notes.${app.noteKey}`)}</p>
        <div className="btn-row">
          <button
            className="btn btn--primary"
            data-focusable
            data-autofocus
            onClick={() => {
              onClose();
              launchApp(app, lang, caps?.platform ?? null);
            }}
          >
            <Icon name={app.kind === 'builtin' ? 'chevronRight' : 'external'} /> {t('apps.launch')}
          </button>
          <button className="btn" data-focusable onClick={() => toggleFavorite(app.id)}>
            <Icon name="star" filled={isFav} /> {isFav ? t('apps.unfavorite') : t('apps.favorite')}
          </button>
          {running && (
            <button
              className="btn"
              data-focusable
              onClick={async () => {
                await api.post('/api/apps/close').catch(() => {});
                apps.reload();
              }}
            >
              <Icon name="close" /> {t('apps.closeRunning')}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
