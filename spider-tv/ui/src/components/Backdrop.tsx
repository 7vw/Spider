import { memo, useEffect, useMemo, useState } from 'react';
import { usePrefs } from '../core/store/prefs';
import { themeMeta } from '../core/theme/themes';
import { hexWeb, orbWeb, veins } from './patterns';
import type { CatalogApp } from '../core/agent/types';

export type Art =
  | { kind: 'app'; app: CatalogApp }
  | { kind: 'media'; id: string; title: string; thumb?: string | null }
  | { kind: 'ambient' };

const W = 1920;
const H = 1080;

/** Theme-specific procedural pattern layer. */
const Pattern = memo(function Pattern({ kind }: { kind: string }) {
  const d = useMemo(() => {
    switch (kind) {
      case 'veins':
        return veins(W, H);
      case 'grid':
        return hexWeb(W, H);
      default:
        return orbWeb(W * 0.86, H * 0.08, 1500, 20, 15);
    }
  }, [kind]);
  return (
    <svg className={`bd__pattern bd__pattern--${kind}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d={d} />
      {kind === 'glitch' && <path className="bd__pattern-ghost" d={d} />}
    </svg>
  );
});

function ArtLayer({ art }: { art: Art }) {
  if (art.kind === 'media') {
    return (
      <div className="bd__art bd__art--media">
        {art.thumb ? <img src={art.thumb} alt="" /> : <div className="bd__art-fallback" />}
      </div>
    );
  }
  if (art.kind === 'app') {
    const { brand, name } = art.app;
    return (
      <div className="bd__art bd__art--app" style={{ ['--brand' as string]: brand.accent, ['--brand-bg' as string]: brand.bg }}>
        <span className="bd__art-word">{name}</span>
      </div>
    );
  }
  return <div className="bd__art bd__art--ambient" />;
}

const artKey = (a: Art) => (a.kind === 'app' ? `app:${a.app.id}` : a.kind === 'media' ? `media:${a.id}:${a.thumb ?? ''}` : 'ambient');

/** Full-screen cinematic background: base glow, contextual art with crossfade, pattern, halftone, grain. */
export function Backdrop({ art = { kind: 'ambient' } }: { art?: Art }) {
  const theme = usePrefs((p) => p.theme);
  const pattern = themeMeta(theme).pattern;
  const [layers, setLayers] = useState<{ key: string; art: Art }[]>([{ key: artKey(art), art }]);
  const key = artKey(art);

  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1]?.key === key ? prev : [...prev.slice(-1), { key, art }]));
  }, [key]);

  return (
    <div className="bd" aria-hidden="true">
      <div className="bd__base" />
      {layers.map((l, i) => (
        <div key={l.key} className={`bd__layer ${i === layers.length - 1 ? 'is-in' : 'is-out'}`}>
          <ArtLayer art={l.art} />
        </div>
      ))}
      <Pattern kind={pattern} />
      <div className="bd__halftone" />
      <div className="bd__shade" />
      <div className="bd__grain" />
    </div>
  );
}
