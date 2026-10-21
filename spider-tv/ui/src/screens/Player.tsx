import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { useT, formatDuration } from '../core/i18n';
import { useInterceptor, useBack } from '../core/nav/hooks';
import { ensureFocus } from '../core/nav/engine';
import { api, mediaUrl } from '../core/agent/api';
import { back } from '../core/router';

/** Full-screen local player. D-pad: ←/→ seek, OK play/pause, ↑/↓ reveal controls, Back exits and saves progress. */
export function Player({ id, title, start }: { id: string; title: string; start?: number }) {
  const { t } = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState(false);
  const [seekFlash, setSeekFlash] = useState<'ff' | 'rw' | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSaved = useRef(0);

  const reveal = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!video.current?.paused) setVisible(false);
    }, 3500);
  }, []);

  const save = useCallback(() => {
    const v = video.current;
    if (!v || !v.duration || !isFinite(v.duration)) return;
    api.put(`/api/progress/${id}`, { position: v.currentTime, duration: v.duration, title }).catch(() => {});
  }, [id, title]);

  useEffect(() => {
    reveal();
    return () => {
      clearTimeout(hideTimer.current);
      save();
    };
  }, [reveal, save]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    reveal();
  };

  const seek = (delta: number) => {
    const v = video.current;
    if (!v || !isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(v.duration - 0.5, v.currentTime + delta));
    setSeekFlash(delta > 0 ? 'ff' : 'rw');
    setTimeout(() => setSeekFlash(null), 500);
    reveal();
  };

  useInterceptor((action) => {
    if (error) return false;
    switch (action) {
      case 'ok':
      case 'playpause':
        toggle();
        return true;
      case 'play':
        video.current?.play().catch(() => {});
        reveal();
        return true;
      case 'pause':
        video.current?.pause();
        reveal();
        return true;
      case 'left':
      case 'rw':
        seek(-10);
        return true;
      case 'right':
      case 'ff':
        seek(10);
        return true;
      case 'up':
      case 'down':
        reveal();
        return true;
      default:
        return false;
    }
  });

  useBack(() => back());

  useEffect(() => {
    if (error) requestAnimationFrame(() => ensureFocus());
  }, [error]);

  return (
    <div className={`player ${visible || !playing ? 'show-ui' : ''}`} data-nav-layer>
      <video
        ref={video}
        src={mediaUrl(id)}
        autoPlay
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);
          if (start && start < v.duration - 5) v.currentTime = start;
        }}
        onTimeUpdate={(e) => {
          const now = e.currentTarget.currentTime;
          setTime(now);
          if (Math.abs(now - lastSaved.current) > 5) {
            lastSaved.current = now;
            save();
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          save();
        }}
        onEnded={() => {
          save();
          back();
        }}
        onError={() => setError(true)}
      />
      {error ? (
        <div className="player__error glass">
          <Icon name="alert" />
          <h2>{t('player.error')}</h2>
          <p>{t('player.errorHint')}</p>
          <button className="btn btn--primary" data-focusable data-autofocus onClick={() => back()}>
            {t('common.back')}
          </button>
        </div>
      ) : (
        <>
          {seekFlash && (
            <div className={`player__flash player__flash--${seekFlash}`}>
              <Icon name={seekFlash === 'ff' ? 'forward' : 'rewind'} /> 10
            </div>
          )}
          <div className="player__top">
            <h1>
              <bdi>{title}</bdi>
            </h1>
          </div>
          <div className="player__bottom" dir="ltr">
            <span className="player__state">
              <Icon name={playing ? 'pause' : 'play'} filled />
            </span>
            <span className="player__time">{formatDuration(time)}</span>
            <span className="player__bar">
              <span style={{ width: duration ? `${(time / duration) * 100}%` : 0 }} />
            </span>
            <span className="player__time">{formatDuration(duration)}</span>
          </div>
          <p className="player__hint">{t('player.seekHint')}</p>
        </>
      )}
    </div>
  );
}
