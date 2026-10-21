import { useMemo, useState } from 'react';
import { Backdrop } from '../components/Backdrop';
import { Keyboard } from '../components/Keyboard';
import { Icon, type IconName } from '../components/Icon';
import { AppArt } from '../components/Tiles';
import { useT } from '../core/i18n';
import { useInterceptor } from '../core/nav/hooks';
import { useAgent } from '../core/agent/hooks';
import { useCapabilities } from '../core/agent/caps';
import type { MediaItem } from '../core/agent/types';
import { APPS, launchApp } from '../data/apps';
import { navigate } from '../core/router';
import { SECTIONS } from './settings/sections';

const norm = (s: string) => s.toLocaleLowerCase().normalize('NFKD').replace(/[ً-ٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');

export function Search() {
  const { t, lang } = useT();
  const caps = useCapabilities();
  const [q, setQ] = useState('');
  const library = useAgent<{ items: MediaItem[] }>('/api/media').data?.items ?? [];

  // Physical keyboard typing goes straight into the query.
  useInterceptor((_action, e) => {
    if (e.key === 'Backspace' && q) {
      setQ((s) => s.slice(0, -1));
      return true;
    }
    return false;
  });

  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && e.key !== '/') {
      e.preventDefault();
      setQ((s) => s + e.key);
    }
  };

  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return null;
    const apps = APPS.filter((a) => norm(a.name).includes(n));
    const videos = library.filter((v) => norm(v.title).includes(n)).slice(0, 8);
    const settings = SECTIONS.filter((s) => norm(t(`settings.sections.${s.id}`)).includes(n) || s.id.includes(n));
    return { apps, videos, settings };
  }, [q, library, t]);

  const total = results ? results.apps.length + results.videos.length + results.settings.length : 0;

  return (
    <div className="screen search" onKeyDownCapture={onKeyDownCapture}>
      <Backdrop />
      <div className="search__left">
        <div className="search__field glass">
          <Icon name="search" />
          <span className={q ? 'search__q' : 'search__ph'} dir="auto">
            {q || t('search.placeholder')}
          </span>
          <span className="search__caret" />
        </div>
        <Keyboard onKey={(k) => setQ((s) => s + k)} onBackspace={() => setQ((s) => s.slice(0, -1))} onClear={() => setQ('')} />
        <p className="search__hint">{t('search.typeHint')}</p>
      </div>
      <div className="search__results" data-nav-group="search-results">
        {results && total === 0 && <p className="search__none">{t('search.none', { q })}</p>}
        {results && results.apps.length > 0 && (
          <ResultGroup title={t('search.apps')}>
            {results.apps.map((a) => (
              <button key={a.id} className="result result--app" data-focusable onClick={() => launchApp(a, lang, caps?.platform ?? null)}>
                <AppArt app={a} />
                <span>{a.name}</span>
              </button>
            ))}
          </ResultGroup>
        )}
        {results && results.videos.length > 0 && (
          <ResultGroup title={t('search.videos')}>
            {results.videos.map((v) => (
              <ResultRow key={v.id} icon="video" label={v.title} onClick={() => navigate({ name: 'player', id: v.id, title: v.title })} />
            ))}
          </ResultGroup>
        )}
        {results && results.settings.length > 0 && (
          <ResultGroup title={t('search.settings')}>
            {results.settings.map((s) => (
              <ResultRow key={s.id} icon={s.icon} label={t(`settings.sections.${s.id}`)} onClick={() => navigate({ name: 'settings', section: s.id })} />
            ))}
          </ResultGroup>
        )}
      </div>
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="result-group">
      <h2>{title}</h2>
      <div className="result-group__items">{children}</div>
    </section>
  );
}

function ResultRow({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button className="result result--row" data-focusable onClick={onClick}>
      <Icon name={icon} />
      <span dir="auto">{label}</span>
    </button>
  );
}
