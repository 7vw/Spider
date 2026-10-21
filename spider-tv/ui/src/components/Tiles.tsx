import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { thumbUrl } from '../core/agent/api';
import type { CatalogApp, MediaItem } from '../core/agent/types';

const APP_ICONS: Partial<Record<string, IconName>> = { browser: 'browser', media: 'film', files: 'folder' };

export function AppArt({ app, large = false }: { app: CatalogApp; large?: boolean }) {
  const icon = APP_ICONS[app.id];
  return (
    <div className={`app-art ${large ? 'app-art--lg' : ''}`} style={{ ['--brand' as string]: app.brand.accent, ['--brand-bg' as string]: app.brand.bg }}>
      <span className="app-art__glow" />
      {icon && <Icon name={icon} className="app-art__icon" />}
      <span className="app-art__name">{app.name}</span>
    </div>
  );
}

interface TileProps {
  navId: string;
  onFocus?: () => void;
  onClick: () => void;
  autoFocus?: boolean;
  children: ReactNode;
  className?: string;
  label: string;
}

function Tile({ navId, onFocus, onClick, autoFocus, children, className = '', label }: TileProps) {
  return (
    <button
      className={`tile ${className}`}
      data-focusable
      data-nav-id={navId}
      {...(autoFocus ? { 'data-autofocus': '' } : {})}
      aria-label={label}
      onFocus={onFocus}
      onClick={onClick}
    >
      <span className="tile__inner">{children}</span>
      <span className="tile__sheen" />
    </button>
  );
}

export function AppTile({ app, badge, ...rest }: Omit<TileProps, 'children' | 'label'> & { app: CatalogApp; badge?: ReactNode }) {
  return (
    <Tile {...rest} label={app.name} className="tile--app">
      <AppArt app={app} />
      {badge}
    </Tile>
  );
}

export function MediaThumb({ id, title, thumbs }: { id: string; title: string; thumbs: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="media-thumb">
      {thumbs && !failed ? (
        <img src={thumbUrl(id)} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="media-thumb__fallback">
          <Icon name="video" />
        </div>
      )}
      <span className="media-thumb__title">
        <bdi>{title}</bdi>
      </span>
    </div>
  );
}

export function MediaTile({
  item,
  progress,
  thumbs,
  ...rest
}: Omit<TileProps, 'children' | 'label'> & { item: Pick<MediaItem, 'id' | 'title'>; progress?: number; thumbs: boolean }) {
  return (
    <Tile {...rest} label={item.title} className="tile--media">
      <MediaThumb id={item.id} title={item.title} thumbs={thumbs} />
      {progress !== undefined && (
        <span className="progress">
          <span style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </span>
      )}
    </Tile>
  );
}

export function ActionTile({ icon, title, ...rest }: Omit<TileProps, 'children' | 'label'> & { icon: IconName; title: string }) {
  return (
    <Tile {...rest} label={title} className="tile--action">
      <span className="tile-action">
        <Icon name={icon} />
        <span>{title}</span>
      </span>
    </Tile>
  );
}
