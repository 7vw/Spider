import { useMemo, useState } from 'react';
import { Backdrop, type Art } from '../components/Backdrop';
import { Row } from '../components/Row';
import { AppTile, MediaTile, ActionTile } from '../components/Tiles';
import { Icon } from '../components/Icon';
import { useT, formatDuration } from '../core/i18n';
import { usePrefs } from '../core/store/prefs';
import { useAgent } from '../core/agent/hooks';
import { useCapabilities } from '../core/agent/caps';
import { thumbUrl } from '../core/agent/api';
import type { CatalogApp, MediaItem, ProgressItem } from '../core/agent/types';
import { APPS, appById, launchApp, supportOf } from '../data/apps';
import { navigate } from '../core/router';

type Focused =
  | { kind: 'app'; app: CatalogApp }
  | { kind: 'media'; item: { id: string; title: string }; progress?: ProgressItem }
  | { kind: 'welcome' };

export function Home() {
  const { t, lang } = useT();
  const favorites = usePrefs((p) => p.favorites);
  const caps = useCapabilities();
  const progress = useAgent<ProgressItem[]>('/api/progress').data ?? [];
  const library = useAgent<{ items: MediaItem[] }>('/api/media').data?.items ?? [];
  const [focused, setFocused] = useState<Focused>({ kind: 'welcome' });

  const favApps = useMemo(() => favorites.map(appById).filter(Boolean) as CatalogApp[], [favorites]);
  const thumbs = !!caps?.thumbnails;

  const art: Art =
    focused.kind === 'app'
      ? { kind: 'app', app: focused.app }
      : focused.kind === 'media'
        ? { kind: 'media', id: focused.item.id, title: focused.item.title, thumb: thumbs ? thumbUrl(focused.item.id) : null }
        : { kind: 'ambient' };

  const play = (id: string, title: string, start?: number) => navigate({ name: 'player', id, title, start });
  const open = (app: CatalogApp) => launchApp(app, lang, caps?.platform ?? null);

  return (
    <div className="screen home">
      <Backdrop art={art} />
      <Hero focused={focused} />
      <div className="home__rows">
        {favApps.length > 0 ? (
          <Row id="row-favorites" title={t('home.favorites')} size="lg">
            {favApps.map((app, i) => (
              <AppTile key={app.id} app={app} navId={`fav-${app.id}`} autoFocus={i === 0} onFocus={() => setFocused({ kind: 'app', app })} onClick={() => open(app)} />
            ))}
          </Row>
        ) : (
          <Row id="row-favorites" title={t('home.favorites')} size="lg">
            <ActionTile icon="star" title={t('home.addFavorites')} navId="fav-add" autoFocus onFocus={() => setFocused({ kind: 'welcome' })} onClick={() => navigate({ name: 'apps' })} />
          </Row>
        )}

        {progress.length > 0 && (
          <Row id="row-continue" title={t('home.continue')}>
            {progress.map((p) => (
              <MediaTile
                key={p.id}
                item={{ id: p.id, title: p.title }}
                progress={p.position / p.duration}
                thumbs={thumbs}
                navId={`cw-${p.id}`}
                onFocus={() => setFocused({ kind: 'media', item: { id: p.id, title: p.title }, progress: p })}
                onClick={() => play(p.id, p.title, p.position)}
              />
            ))}
          </Row>
        )}

        <Row id="row-apps" title={t('home.installed')}>
          {APPS.map((app) => (
            <AppTile key={app.id} app={app} navId={`app-${app.id}`} onFocus={() => setFocused({ kind: 'app', app })} onClick={() => open(app)} />
          ))}
        </Row>

        {library.length > 0 && (
          <Row id="row-library" title={t('home.library')}>
            {library.slice(0, 12).map((item) => (
              <MediaTile key={item.id} item={item} thumbs={thumbs} navId={`lib-${item.id}`} onFocus={() => setFocused({ kind: 'media', item })} onClick={() => play(item.id, item.title)} />
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}

function Hero({ focused }: { focused: Focused }) {
  const { t } = useT();
  let key = 'welcome';
  let eyebrow = 'SPIDER TV';
  let title = t('home.welcome');
  let body = t('home.welcomeSub');
  let chips: { label: string; tone?: string }[] = [];
  let pct: number | null = null;

  if (focused.kind === 'app') {
    const { app } = focused;
    const level = supportOf(app);
    key = app.id;
    eyebrow = t(`nav.apps`);
    title = app.name;
    body = t(`support.notes.${app.noteKey}`);
    chips = [{ label: t(`support.${level}`), tone: level === 'drm-limited' ? 'warn' : 'ok' }];
    if (app.drm) chips.push({ label: 'Widevine DRM' });
  } else if (focused.kind === 'media') {
    key = focused.item.id;
    eyebrow = focused.progress ? t('home.continue') : t('home.library');
    title = focused.item.title;
    body = '';
    if (focused.progress) {
      const { position, duration } = focused.progress;
      pct = position / duration;
      body = t('home.left', { t: formatDuration(duration - position) });
    }
  }

  return (
    <div className="hero" key={key}>
      <span className="hero__eyebrow">{eyebrow}</span>
      <h1 className="hero__title">
        <bdi>{title}</bdi>
      </h1>
      {body && <p className="hero__body">{body}</p>}
      <div className="hero__meta">
        {chips.map((c) => (
          <span key={c.label} className={`chip ${c.tone ? `chip--${c.tone}` : ''}`}>
            {c.tone === 'warn' ? <Icon name="lock" /> : c.tone === 'ok' ? <Icon name="check" /> : null}
            {c.label}
          </span>
        ))}
        {pct !== null && (
          <span className="progress progress--hero">
            <span style={{ width: `${pct * 100}%` }} />
          </span>
        )}
      </div>
    </div>
  );
}
