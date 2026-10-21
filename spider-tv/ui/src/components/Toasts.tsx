import { useToasts } from '../core/store/toast';
import { Icon } from './Icon';

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast glass toast--${t.tone ?? 'info'}`}>
          <Icon name={t.tone === 'error' ? 'alert' : t.tone === 'success' ? 'check' : 'info'} />
          <div>
            <strong>{t.title}</strong>
            {t.body && <p>{t.body}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
