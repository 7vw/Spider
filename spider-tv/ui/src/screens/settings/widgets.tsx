import type { ReactNode } from 'react';
import { Icon, type IconName } from '../../components/Icon';
import { useT } from '../../core/i18n';
import { toast } from '../../core/store/toast';

/** Read-only value row. Focusable so long panels can be scrolled with the D-pad. */
export function InfoRow({ label, value, icon, dir }: { label: string; value: ReactNode; icon?: IconName; dir?: 'ltr' | 'auto' }) {
  return (
    <div className="srow srow--info" tabIndex={-1} data-focusable>
      {icon && <Icon name={icon} className="srow__icon" />}
      <span className="srow__label">{label}</span>
      <span className="srow__value" dir={dir}>{value}</span>
    </div>
  );
}

export function ToggleRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const { t } = useT();
  return (
    <button className="srow srow--toggle" data-focusable role="switch" aria-checked={value} onClick={() => onChange(!value)}>
      <span className="srow__label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className="srow__value">{value ? t('common.on') : t('common.off')}</span>
      <span className={`switch ${value ? 'is-on' : ''}`}>
        <span />
      </span>
    </button>
  );
}

export function ActionRow({ label, icon, onClick, primary }: { label: string; icon: IconName; onClick: () => void; primary?: boolean }) {
  return (
    <button className={`srow srow--action ${primary ? 'is-primary' : ''}`} data-focusable onClick={onClick}>
      <Icon name={icon} className="srow__icon" />
      <span className="srow__label">{label}</span>
    </button>
  );
}

/**
 * A feature that exists in the roadmap but is not implemented. It stays focusable and says so,
 * instead of pretending to work or silently doing nothing.
 */
export function PlannedRow({ label, icon, phase, why, badge }: { label: string; icon: IconName; phase?: number; why: string; badge?: string }) {
  const { t } = useT();
  const tag = badge ?? t('common.phase', { n: phase ?? 0 });
  return (
    <button
      className="srow srow--planned"
      data-focusable
      aria-disabled="true"
      onClick={() => toast({ title: tag, body: why })}
    >
      <Icon name={icon} className="srow__icon" />
      <span className="srow__label">
        {label}
        <small>{why}</small>
      </span>
      <span className="badge">{tag}</span>
    </button>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <p className={`notice notice--${tone}`}>
      <Icon name={tone === 'warn' ? 'alert' : 'info'} />
      <span>{children}</span>
    </p>
  );
}

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="sgroup">
      {title && <h3>{title}</h3>}
      <div className="sgroup__body glass">{children}</div>
    </section>
  );
}
