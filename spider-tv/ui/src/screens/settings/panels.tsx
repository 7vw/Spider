import { useEffect, useState, type ComponentType } from 'react';
import { Icon } from '../../components/Icon';
import { Slider } from '../../components/Slider';
import { AppArt } from '../../components/Tiles';
import { useT, formatBytes, LANGS } from '../../core/i18n';
import { usePrefs, setPrefs, toggleFavorite } from '../../core/store/prefs';
import { useAgent } from '../../core/agent/hooks';
import { api, PREVIEW } from '../../core/agent/api';
import { toast } from '../../core/store/toast';
import { THEMES, type ThemeId } from '../../core/theme/themes';
import type { BluetoothInfo, Capabilities, MirroringInfo, NetworkInfo, StorageInfo, SystemInfo, Volume } from '../../core/agent/types';
import { APPS } from '../../data/apps';
import { SupportChip } from '../Apps';
import { InfoRow, ToggleRow, ActionRow, PlannedRow, Notice, Group } from './widgets';

function Offline() {
  const { t } = useT();
  return <Notice tone="warn">{PREVIEW ? t('preview.body') : t('common.agentOffline')}</Notice>;
}

function Loading() {
  const { t } = useT();
  return <p className="loading">{t('common.loading')}</p>;
}

function NetworkPanel() {
  const { t } = useT();
  const { data, error } = useAgent<NetworkInfo>('/api/network', 15000);
  if (error && !data) return <Offline />;
  if (!data) return <Loading />;
  return (
    <>
      <Group>
        <InfoRow icon={data.online ? 'globe' : 'wifiOff'} label={t('settings.network.internet')} value={<span className={data.online ? 'ok' : 'bad'}>{data.online ? t('status.online') : t('status.offline')}</span>} />
        {data.latencyMs !== null && <InfoRow label={t('settings.network.latency')} value={`${data.latencyMs} ms`} dir="ltr" />}
        {data.wifi.supported && <InfoRow icon="wifi" label={t('settings.network.wifi')} value={data.wifi.ssid ?? t('settings.network.ssidHidden')} dir="auto" />}
      </Group>
      <Group title={t('settings.network.interfaces')}>
        {data.interfaces.length === 0 && <InfoRow label={t('settings.network.none')} value="" />}
        {data.interfaces.map((i) => (
          <InfoRow key={i.name + i.address} label={i.name} value={i.address} dir="ltr" />
        ))}
      </Group>
      {data.wifi.canScan && data.wifi.networks.length > 0 && (
        <Group title={t('settings.network.networks')}>
          {data.wifi.networks.slice(0, 8).map((n) => (
            <InfoRow key={n.ssid} icon={n.secure ? 'lock' : 'wifi'} label={n.ssid} value={`${n.signal}%${n.active ? ' ✓' : ''}`} dir="ltr" />
          ))}
        </Group>
      )}
      <PlannedRow icon="wifi" label={t('settings.network.networks')} phase={2} why={t('settings.network.scanUnsupported')} />
    </>
  );
}

function BluetoothPanel() {
  const { t } = useT();
  const { data, error } = useAgent<BluetoothInfo>('/api/bluetooth');
  if (error && !data) return <Offline />;
  if (!data) return <Loading />;
  return (
    <>
      {!data.available ? (
        <Notice tone="warn">{t('settings.bluetooth.unavailable')}</Notice>
      ) : (
        <>
          <Group>
            <InfoRow icon="bluetooth" label={t('settings.bluetooth.powered')} value={data.powered ? t('common.on') : t('common.off')} />
          </Group>
          <Group title={t('settings.bluetooth.devices')}>
            {data.devices.length === 0 && <InfoRow label={t('settings.bluetooth.none')} value="" />}
            {data.devices.map((d) => (
              <InfoRow key={d.address + d.name} label={d.name} value={d.connected ? t('settings.bluetooth.connected') : d.address} dir="auto" />
            ))}
          </Group>
        </>
      )}
      <PlannedRow icon="bluetooth" label={t('settings.bluetooth.devices')} phase={2} why={t('settings.bluetooth.pairing')} />
    </>
  );
}

function useRefreshRate() {
  const [hz, setHz] = useState<number | null>(null);
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    const startAt = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - startAt >= 1000) setHz(Math.round((frames * 1000) / (now - startAt)));
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return hz;
}

function DisplayPanel() {
  const { t, locale } = useT();
  const prefs = usePrefs((p) => p);
  const hz = useRefreshRate();
  const [guide, setGuide] = useState(false);
  const dpr = window.devicePixelRatio;
  const res = `${Math.round(window.screen.width * dpr)} × ${Math.round(window.screen.height * dpr)}`;
  return (
    <>
      <Group>
        <InfoRow icon="display" label={t('settings.display.resolution')} value={res} dir="ltr" />
        <InfoRow label={t('settings.display.scale')} value={`${dpr}×`} dir="ltr" />
        <InfoRow label={t('settings.display.refresh')} value={hz ? `≈ ${hz} Hz` : '…'} dir="ltr" />
      </Group>
      <Group>
        <div onFocus={() => setGuide(true)} onBlur={() => setGuide(false)}>
          <Slider
            label={t('settings.display.overscan')}
            value={prefs.overscan}
            min={0}
            max={8}
            step={0.5}
            format={(v) => `${new Intl.NumberFormat(locale).format(v)}%`}
            onChange={(v) => setPrefs({ overscan: v })}
          />
        </div>
        <p className="srow__hint">{t('settings.display.overscanHint')}</p>
        <ToggleRow label={t('settings.display.reduceMotion')} value={prefs.reduceMotion} onChange={(v) => setPrefs({ reduceMotion: v })} />
        <ToggleRow label={t('settings.display.clock24')} value={prefs.clock24} onChange={(v) => setPrefs({ clock24: v })} />
      </Group>
      <PlannedRow icon="display" label={t('settings.display.resolution')} phase={3} why={t('settings.display.modeHint')} />
      {guide && <div className="overscan-guide" />}
    </>
  );
}

function AudioPanel() {
  const { t } = useT();
  const { data, error } = useAgent<Volume>('/api/audio');
  const [vol, setVol] = useState<Volume | null>(null);
  useEffect(() => {
    if (data) setVol(data);
  }, [data]);
  if (error && !data) return <Offline />;
  if (!vol) return <Loading />;
  const update = async (patch: Partial<Volume>) => {
    setVol({ ...vol, ...patch });
    try {
      setVol(await api.put<Volume>('/api/audio', patch));
    } catch {
      toast({ title: t('common.agentOffline'), tone: 'error' });
    }
  };
  if (!vol.supported) {
    return <Notice tone="warn">{t('settings.audio.unsupported')}</Notice>;
  }
  return (
    <>
      <Group>
        <Slider label={t('settings.audio.volume')} value={vol.level ?? 0} onChange={(level) => update({ level })} />
        <ToggleRow label={t('settings.audio.mute')} value={!!vol.muted} onChange={(muted) => update({ muted })} />
        <InfoRow label={t('settings.audio.backend')} value={vol.backend ?? '—'} dir="ltr" />
      </Group>
      <Notice>{t('settings.audio.keys')}</Notice>
    </>
  );
}

function StoragePanel() {
  const { t, locale } = useT();
  const { data, error } = useAgent<StorageInfo>('/api/storage');
  if (error && !data) return <Offline />;
  if (!data) return <Loading />;
  return (
    <>
      <Group title={t('settings.storage.volumes')}>
        {data.volumes.map((v) => (
          <div key={v.mount} className="srow srow--disk" tabIndex={-1} data-focusable>
            <Icon name="storage" className="srow__icon" />
            <span className="srow__label" dir="ltr">{v.mount}</span>
            <span className="disk">
              <span className="disk__bar">
                <span style={{ width: `${(v.usedBytes / v.totalBytes) * 100}%` }} />
              </span>
              <span className="disk__text">{t('settings.storage.free', { free: formatBytes(t, v.freeBytes, locale), total: formatBytes(t, v.totalBytes, locale) })}</span>
            </span>
          </div>
        ))}
      </Group>
      <Group title={t('settings.storage.mediaDirs')}>
        {data.mediaDirs.map((d) => (
          <InfoRow key={d} icon="film" label={d} value="" dir="ltr" />
        ))}
      </Group>
      <Group title={t('settings.storage.fileRoots')}>
        {data.fileRoots.map((d) => (
          <InfoRow key={d} icon="folder" label={d} value="" dir="ltr" />
        ))}
      </Group>
    </>
  );
}

function AppsPanel() {
  const { t } = useT();
  const favorites = usePrefs((p) => p.favorites);
  return (
    <>
      <Notice>{t('settings.apps.hint')}</Notice>
      <Group>
        {APPS.map((app) => (
          <button key={app.id} className="srow srow--app" data-focusable role="switch" aria-checked={favorites.includes(app.id)} onClick={() => toggleFavorite(app.id)}>
            <span className="srow__mini">
              <AppArt app={app} />
            </span>
            <span className="srow__label">{app.name}</span>
            <SupportChip app={app} />
            <span className={`fav-toggle ${favorites.includes(app.id) ? 'is-on' : ''}`}>
              <Icon name="star" filled={favorites.includes(app.id)} />
            </span>
          </button>
        ))}
      </Group>
    </>
  );
}

function ThemesPanel() {
  const { t } = useT();
  const theme = usePrefs((p) => p.theme);
  return (
    <>
      <Notice>{t('settings.themes.hint')}</Notice>
      <div className="choice-grid">
        {THEMES.map((th) => (
          <button key={th.id} className={`choice theme-card ${theme === th.id ? 'is-active' : ''}`} data-theme-preview={th.id} data-focusable onClick={() => setPrefs({ theme: th.id as ThemeId })}>
            <span className="theme-card__preview" style={{ background: `radial-gradient(120% 90% at 85% 0%, ${th.swatch[2]}, ${th.swatch[0]} 70%)` }}>
              <span className="theme-card__web" />
              <span className="theme-card__bar" style={{ background: th.swatch[1] }} />
              <span className="theme-card__tile" style={{ borderColor: th.swatch[1], boxShadow: `0 0 1.2rem ${th.swatch[1]}` }} />
            </span>
            <span className="choice__label">
              <strong>{t(`themes.${th.id}.name`)}</strong>
              <small>{t(`themes.${th.id}.desc`)}</small>
            </span>
            {theme === th.id && <Icon name="check" className="choice__check" />}
          </button>
        ))}
      </div>
    </>
  );
}

function LanguagePanel() {
  const { t } = useT();
  const lang = usePrefs((p) => p.lang);
  return (
    <>
      <Notice>{t('settings.language.hint')}</Notice>
      <div className="choice-grid choice-grid--2">
        {LANGS.map((l) => (
          <button key={l.id} className={`choice lang-card ${lang === l.id ? 'is-active' : ''}`} data-focusable onClick={() => setPrefs({ lang: l.id })}>
            <span className="lang-card__glyph">{l.id === 'ar' ? 'ع' : 'Aa'}</span>
            <span className="choice__label">
              <strong>{l.label}</strong>
              <small>{l.id === 'ar' ? 'RTL' : 'LTR'}</small>
            </span>
            {lang === l.id && <Icon name="check" className="choice__check" />}
          </button>
        ))}
      </div>
    </>
  );
}

function MirroringPanel() {
  const { t } = useT();
  const { data, error, reload } = useAgent<MirroringInfo>('/api/mirroring', 5000);
  if (error && !data) return <Offline />;
  if (!data) return <Loading />;
  const { airplay } = data;
  const act = async (what: 'start' | 'stop') => {
    try {
      await api.post(`/api/mirroring/airplay/${what}`);
    } catch (e) {
      toast({ title: (e as Error).message, tone: 'error' });
    }
    reload();
  };
  return (
    <>
      <Group title={t('settings.mirroring.airplay')}>
        <InfoRow icon="cast" label="UxPlay" value={airplay.installed ? (airplay.running ? t('settings.mirroring.running', { name: airplay.name }) : t('common.off')) : t('settings.mirroring.notInstalled')} dir="auto" />
        {airplay.installed ? (
          airplay.running ? (
            <ActionRow icon="close" label={t('settings.mirroring.stop')} onClick={() => act('stop')} />
          ) : (
            <ActionRow icon="cast" label={t('settings.mirroring.start')} onClick={() => act('start')} primary />
          )
        ) : (
          // AirPlay works today once UxPlay is installed, so this is an install step, not a roadmap item.
          <PlannedRow icon="cast" label={t('settings.mirroring.start')} badge={t('settings.mirroring.notInstalled')} why={t('settings.mirroring.airplayHint')} />
        )}
        {airplay.lastError && <Notice tone="warn">{airplay.lastError}</Notice>}
      </Group>
      <Group title={t('settings.mirroring.android')}>
        <PlannedRow icon="cast" label={t('settings.mirroring.android')} phase={2} why={t('settings.mirroring.androidHint')} />
      </Group>
      <Notice tone="warn">{t('settings.mirroring.drm')}</Notice>
    </>
  );
}

function SystemPanel() {
  const { t, locale } = useT();
  const { data, error } = useAgent<SystemInfo>('/api/system', 10000);
  const caps = useAgent<Capabilities>('/api/capabilities').data;
  if (error && !data) return <Offline />;
  if (!data) return <Loading />;
  const up = data.uptimeSec;
  const uptime = `${Math.floor(up / 86400)}${t('units.d')} ${Math.floor((up % 86400) / 3600)}${t('units.h')} ${Math.floor((up % 3600) / 60)}${t('units.m')}`;
  return (
    <Group>
      <InfoRow icon="display" label={t('settings.system.device')} value={data.model ?? data.hostname} dir="auto" />
      <InfoRow icon="info" label={t('settings.system.os')} value={data.os} dir="ltr" />
      <InfoRow icon="cpu" label={t('settings.system.cpu')} value={`${data.cpu} · ${data.cpuCores}`} dir="ltr" />
      <InfoRow label={t('settings.system.arch')} value={data.arch} dir="ltr" />
      <InfoRow label={t('settings.system.memory')} value={`${formatBytes(t, data.memTotalBytes - data.memFreeBytes, locale)} / ${formatBytes(t, data.memTotalBytes, locale)}`} />
      <InfoRow label={t('settings.system.uptime')} value={uptime} />
      <InfoRow label={t('settings.system.shell')} value={__APP_VERSION__} dir="ltr" />
      <InfoRow label={t('settings.system.agent')} value={data.agentVersion} dir="ltr" />
      <InfoRow label={t('settings.system.node')} value={`Node ${data.node}`} dir="ltr" />
      <InfoRow label={t('settings.system.browserForApps')} value={caps?.browser ?? t('settings.system.none')} dir="ltr" />
    </Group>
  );
}

function UpdatesPanel() {
  const { t } = useT();
  return (
    <>
      <Group>
        <InfoRow icon="update" label={t('settings.updates.current')} value={__APP_VERSION__} dir="ltr" />
      </Group>
      <PlannedRow icon="update" label={t('settings.sections.updates')} phase={4} why={t('settings.updates.hint')} />
    </>
  );
}

export const PANELS: Record<string, ComponentType> = {
  network: NetworkPanel,
  bluetooth: BluetoothPanel,
  display: DisplayPanel,
  audio: AudioPanel,
  storage: StoragePanel,
  apps: AppsPanel,
  themes: ThemesPanel,
  language: LanguagePanel,
  mirroring: MirroringPanel,
  system: SystemPanel,
  updates: UpdatesPanel,
};
