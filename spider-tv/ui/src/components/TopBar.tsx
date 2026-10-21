import { Logo } from './Logo';
import { Clock } from './Clock';
import { NetStatus } from './NetStatus';
import { Icon, type IconName } from './Icon';
import { useT } from '../core/i18n';
import { navigate, TABS, type TabName } from '../core/router';
import { useAgentOnline } from '../core/agent/hooks';
import { PREVIEW } from '../core/agent/api';

const TAB_ICONS: Record<TabName, IconName> = { home: 'home', apps: 'apps', media: 'film', settings: 'settings' };

export function TopBar({ active }: { active: string }) {
  const { t } = useT();
  const agentOnline = useAgentOnline();
  return (
    <header className="topbar">
      <Logo />
      <nav className="tabs glass" data-nav-group="topbar" data-nav-memory="off">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab ${active === tab ? 'is-active' : ''}`}
            data-focusable
            data-nav-id={`tab-${tab}`}
            {...(active === tab ? { 'data-nav-default': '' } : {})}
            onClick={() => navigate({ name: tab })}
          >
            <Icon name={TAB_ICONS[tab]} />
            <span>{t(`nav.${tab}`)}</span>
          </button>
        ))}
        <span className="tabs__sep" />
        <button className="tab tab--icon" data-focusable data-nav-id="tab-search" aria-label={t('nav.search')} onClick={() => navigate({ name: 'search' })}>
          <Icon name="search" />
        </button>
      </nav>
      <div className="topbar__status">
        {PREVIEW ? (
          <span className="chip chip--warn" title={t('preview.body')}>
            <Icon name="info" /> {t('preview.title')}
          </span>
        ) : (
          agentOnline === false && (
            <span className="chip chip--warn">
              <Icon name="alert" /> {t('common.agentOffline')}
            </span>
          )
        )}
        <NetStatus />
        <Clock />
      </div>
    </header>
  );
}
