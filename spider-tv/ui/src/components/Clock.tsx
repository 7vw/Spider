import { useEffect, useState } from 'react';
import { useT } from '../core/i18n';
import { usePrefs } from '../core/store/prefs';

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function Clock() {
  const now = useNow(5000);
  const { locale } = useT();
  const clock24 = usePrefs((p) => p.clock24);
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: !clock24 }).format(now);
  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return (
    <div className="clock">
      <span className="clock__time">{time}</span>
      <span className="clock__date">{date}</span>
    </div>
  );
}
