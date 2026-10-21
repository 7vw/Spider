import type { KeyboardEvent } from 'react';
import { useT } from '../core/i18n';

/** D-pad slider: left/right change the value (mirrored in RTL so it follows the fill direction). */
export function Slider({
  value, min = 0, max = 100, step = 5, onChange, label, format = (v) => String(v), disabled = false, navId,
}: {
  value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; label: string;
  format?: (v: number) => string; disabled?: boolean; navId?: string;
}) {
  const { rtl } = useT();
  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const inc = (e.key === 'ArrowRight') !== rtl;
    onChange(Math.max(min, Math.min(max, value + (inc ? step : -step))));
  };
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div
      className={`slider ${disabled ? 'is-disabled' : ''}`}
      tabIndex={-1}
      data-focusable
      data-nav-id={navId}
      data-nav-capture="horizontal"
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
    >
      <span className="slider__label">{label}</span>
      <span className="slider__track">
        <span className="slider__fill" style={{ width: `${pct}%` }} />
        <span className="slider__knob" style={{ insetInlineStart: `${pct}%` }} />
      </span>
      <span className="slider__value">{format(value)}</span>
    </div>
  );
}
