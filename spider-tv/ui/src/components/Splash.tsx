import { useEffect } from 'react';
import { Emblem } from './Logo';
import { getPrefs } from '../core/store/prefs';

/** Short boot ident. Skipped instantly with reduced motion, and any key dismisses it. */
export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const ms = getPrefs().reduceMotion ? 0 : 1700;
    const id = setTimeout(onDone, ms);
    const skip = () => onDone();
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      clearTimeout(id);
      window.removeEventListener('keydown', skip);
    };
  }, [onDone]);
  return (
    <div className="splash" aria-hidden="true">
      <svg className="splash__web" viewBox="-100 -100 200 200">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1="0" y1="0" x2={Math.cos(a) * 140} y2={Math.sin(a) * 140} />;
        })}
        {[24, 44, 66, 90].map((r) => (
          <circle key={r} r={r} />
        ))}
      </svg>
      <div className="splash__mark">
        <Emblem size="9rem" />
        <div className="splash__word">
          SPIDER<span>TV</span>
        </div>
      </div>
    </div>
  );
}
