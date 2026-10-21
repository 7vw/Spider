import { useEffect, useLayoutEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import { Toasts } from './components/Toasts';
import { VolumeHud, changeVolume } from './components/VolumeHud';
import { Splash } from './components/Splash';
import { Home } from './screens/Home';
import { Apps } from './screens/Apps';
import { Media } from './screens/Media';
import { Files } from './screens/Files';
import { Player } from './screens/Player';
import { Search } from './screens/Search';
import { Settings } from './screens/Settings';
import { useRoute, back, navigate, type Route } from './core/router';
import { ensureFocus, installNavigation, pushBackHandler, setGlobalHandler, setReduceMotion } from './core/nav/engine';
import { usePrefs, getPrefs, loadPrefsFromAgent } from './core/store/prefs';
import { isRtl, translate } from './core/i18n';
import { api } from './core/agent/api';
import { setAgentOnline } from './core/agent/hooks';

installNavigation();

function routeKey(r: Route) {
  switch (r.name) {
    case 'files':
      return `files:${r.dirId ?? ''}`;
    case 'player':
      return `player:${r.id}`;
    case 'settings':
      return 'settings';
    default:
      return r.name;
  }
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <Home />;
    case 'apps':
      return <Apps />;
    case 'media':
      return <Media />;
    case 'files':
      return <Files dirId={route.dirId} />;
    case 'settings':
      return <Settings section={route.section} />;
    case 'search':
      return <Search />;
    case 'player':
      return <Player id={route.id} title={route.title} start={route.start} />;
  }
}

export function App() {
  const entry = useRoute();
  const { route } = entry;
  const prefs = usePrefs((p) => p);
  const [booting, setBooting] = useState(true);

  // Apply language, direction, theme and safe area to the document.
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.lang = prefs.lang;
    html.dir = isRtl(prefs.lang) ? 'rtl' : 'ltr';
    html.dataset.theme = prefs.theme;
    html.dataset.reduceMotion = String(prefs.reduceMotion);
    html.style.setProperty('--overscan', `${prefs.overscan}vmin`);
    setReduceMotion(prefs.reduceMotion);
  }, [prefs.lang, prefs.theme, prefs.reduceMotion, prefs.overscan]);

  useEffect(() => {
    loadPrefsFromAgent();
    let timer: ReturnType<typeof setTimeout>;
    const ping = async () => {
      try {
        await api.get('/api/health');
        setAgentOnline(true);
      } catch {
        setAgentOnline(false);
      }
      timer = setTimeout(ping, 15000);
    };
    ping();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setGlobalHandler((action) => {
      const t = (k: string) => translate(getPrefs().lang, k);
      if (action === 'home') navigate({ name: 'home' });
      else if (action === 'search') navigate({ name: 'search' });
      else if (action === 'volup' || action === 'voldown' || action === 'mute') changeVolume(action, t);
    });
    // Lowest-priority Back: pop history, otherwise return to Home.
    return pushBackHandler(() => {
      if (back()) return true;
      navigate({ name: 'home' });
      return true;
    });
  }, []);

  // Restore or establish focus whenever the screen changes.
  useEffect(() => {
    if (booting) return;
    const id = requestAnimationFrame(() => ensureFocus(entry.focusId));
    return () => cancelAnimationFrame(id);
  }, [entry, booting]);

  const withShell = route.name !== 'player' && route.name !== 'search';
  return (
    <div className="shell">
      <div className="safe">
        {withShell && <TopBar active={route.name === 'files' ? 'media' : route.name} />}
        <div className="stage" key={routeKey(route)}>
          <Screen route={route} />
        </div>
      </div>
      <Toasts />
      <VolumeHud />
      {booting && <Splash onDone={() => setBooting(false)} />}
    </div>
  );
}

