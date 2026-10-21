import { useState } from 'react';
import { Icon } from './Icon';
import { useT } from '../core/i18n';

const LAYOUTS = {
  en: ['abcdefg', 'hijklmn', 'opqrstu', 'vwxyz12', '3456789', '0.-+\'&@'],
  ar: ['ابتثجحخ', 'دذرزسشص', 'ضطظعغفق', 'كلمنهوي', 'ءآأإةىؤ', '0123456'],
} as const;

/** On-screen keyboard for remote-only input. Every key is a normal focusable button. */
export function Keyboard({ onKey, onBackspace, onClear }: { onKey: (k: string) => void; onBackspace: () => void; onClear: () => void }) {
  const { t, lang } = useT();
  const [layout, setLayout] = useState<keyof typeof LAYOUTS>(lang);
  return (
    <div className="osk" data-nav-group="osk">
      <div className="osk__grid" dir={layout === 'ar' ? 'rtl' : 'ltr'}>
        {LAYOUTS[layout].map((row, r) =>
          [...row].map((k, c) => (
            <button key={`${r}-${c}`} className="osk__key" data-focusable data-nav-id={`osk-${r}-${c}`} {...(r === 0 && c === 0 ? { 'data-autofocus': '' } : {})} onClick={() => onKey(k)}>
              {k}
            </button>
          )),
        )}
      </div>
      <div className="osk__actions">
        <button className="osk__key osk__key--wide" data-focusable onClick={() => onKey(' ')}>
          <Icon name="space" /> {t('search.space')}
        </button>
        <button className="osk__key" data-focusable aria-label={t('search.del')} onClick={onBackspace}>
          <Icon name="backspace" />
        </button>
        <button className="osk__key" data-focusable onClick={onClear}>
          {t('search.clear')}
        </button>
        <button className="osk__key" data-focusable onClick={() => setLayout(layout === 'en' ? 'ar' : 'en')}>
          {layout === 'en' ? 'ع' : 'EN'}
        </button>
      </div>
    </div>
  );
}
