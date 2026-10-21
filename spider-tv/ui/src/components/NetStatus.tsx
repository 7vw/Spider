import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useT } from '../core/i18n';
import { useAgent, useAgentOnline } from '../core/agent/hooks';

/** Internet reachability from the agent (real HTTP check), falling back to the browser's view when the agent is down. */
export function NetStatus() {
  const { t } = useT();
  const agentOnline = useAgentOnline();
  const { data } = useAgent<{ online: boolean }>('/api/network/online', 30000);
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setBrowserOnline(true);
    const down = () => setBrowserOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  const online = agentOnline === false || !data ? browserOnline : data.online;
  return (
    <div className={`net ${online ? 'is-online' : 'is-offline'}`} title={online ? t('status.online') : t('status.offline')}>
      <Icon name={online ? 'wifi' : 'wifiOff'} />
      <span>{online ? t('status.online') : t('status.offline')}</span>
    </div>
  );
}
