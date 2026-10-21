import { useState } from 'react';
import { Backdrop } from '../components/Backdrop';
import { Icon, type IconName } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { useT, formatBytes } from '../core/i18n';
import { useAgent } from '../core/agent/hooks';
import { mediaUrl, PREVIEW } from '../core/agent/api';
import type { DirEntry, DirListing } from '../core/agent/types';
import { navigate } from '../core/router';
import { toast } from '../core/store/toast';
import { Empty } from './Media';

const KIND_ICON: Record<DirEntry['kind'], IconName> = { root: 'folder', dir: 'folder', video: 'video', audio: 'music', image: 'image', other: 'file' };

export function Files({ dirId }: { dirId?: string }) {
  const { t, locale } = useT();
  const { data, error } = useAgent<DirListing>(`/api/files${dirId ? `?id=${encodeURIComponent(dirId)}` : ''}`);
  const [image, setImage] = useState<DirEntry | null>(null);

  const open = (e: DirEntry) => {
    if (e.type === 'dir') navigate({ name: 'files', dirId: e.id });
    else if (e.kind === 'video' || e.kind === 'audio') navigate({ name: 'player', id: e.id, title: e.name.replace(/\.[^.]+$/, '') });
    else if (e.kind === 'image') setImage(e);
    else toast({ title: t('files.unsupported'), body: e.name });
  };

  return (
    <div className="screen files">
      <Backdrop />
      <header className="page-head">
        <h1>
          <Icon name="folder" /> {t('files.title')}
        </h1>
        <p className="files__path" dir="ltr">{data?.path ?? t('files.roots')}</p>
      </header>
      {error && !data ? (
        <Empty icon="alert" title={PREVIEW ? t('preview.title') : t('common.agentOffline')} body={PREVIEW ? t('preview.body') : undefined} />
      ) : data && data.entries.length === 0 ? (
        <Empty icon="folder" title={t('files.empty')} />
      ) : (
        <ul className="files__list glass" data-nav-group={`files-${dirId ?? 'root'}`}>
          {data?.entries.map((e, i) => (
            <li key={e.id}>
              <button className="file-row" data-focusable data-nav-id={`file-${e.id}`} {...(i === 0 ? { 'data-autofocus': '' } : {})} onClick={() => open(e)}>
                <Icon name={KIND_ICON[e.kind]} className={`file-row__icon file-row__icon--${e.kind}`} />
                <span className="file-row__name">
                  <bdi>{e.name}</bdi>
                </span>
                {e.sizeBytes !== undefined && <span className="file-row__size">{formatBytes(t, e.sizeBytes, locale)}</span>}
                {e.type === 'dir' && <Icon name="chevronRight" className="file-row__chev" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {image && (
        <Sheet onClose={() => setImage(null)} className="image-viewer">
          <img src={mediaUrl(image.id)} alt={image.name} />
          <button className="btn" data-focusable data-autofocus onClick={() => setImage(null)}>
            <Icon name="close" /> {t('common.close')}
          </button>
        </Sheet>
      )}
    </div>
  );
}
