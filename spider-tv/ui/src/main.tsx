import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/readex-pro';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/tiles.css';
import './styles/screens.css';
import './styles/settings.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
