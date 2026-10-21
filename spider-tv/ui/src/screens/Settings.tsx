import { useState } from 'react';
import { Backdrop } from '../components/Backdrop';
import { Icon } from '../components/Icon';
import { useT } from '../core/i18n';
import { SECTIONS } from './settings/sections';
import { PANELS } from './settings/panels';

/** Two-pane settings: focusing a section previews its panel; → (or ← in RTL) moves into it. */
export function Settings({ section }: { section?: string }) {
  const { t } = useT();
  const [active, setActive] = useState(section && PANELS[section] ? section : 'network');
  const Panel = PANELS[active];
  return (
    <div className="screen settings">
      <Backdrop />
      <aside className="settings__nav glass" data-nav-group="settings-nav">
        <h1>{t('settings.title')}</h1>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={`settings__item ${active === s.id ? 'is-active' : ''}`}
            data-focusable
            data-nav-id={`settings-${s.id}`}
            {...(s.id === active ? { 'data-autofocus': '' } : {})}
            onFocus={() => setActive(s.id)}
            onClick={() => {
              setActive(s.id);
              // Enter jumps into the panel, like pressing → on a TV.
              requestAnimationFrame(() => document.querySelector<HTMLElement>('.settings__panel [data-focusable]')?.focus());
            }}
          >
            <Icon name={s.icon} />
            <span>{t(`settings.sections.${s.id}`)}</span>
            <Icon name="chevronRight" className="settings__chev" />
          </button>
        ))}
      </aside>
      <main className="settings__panel" data-nav-group={`panel-${active}`} key={active}>
        <h2 className="settings__title">{t(`settings.sections.${active}`)}</h2>
        <Panel />
      </main>
    </div>
  );
}
