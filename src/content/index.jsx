// src/content/index.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import { parseHiddenGenres } from '../features/selectors';
import { applyPageStyles } from '../features/theming';
import { loadTheme } from '../features/storage';
import { cacheThemePreview, getThemePreview } from '../features/themePreview';
import contentStyles from '../styles/index.css?inline';
import { installFicbookGenreSprite } from './ficbookSprite';

const rootId = 'ficbook-enhancer-root';
const previewTheme = getThemePreview();

if (previewTheme) {
  applyPageStyles({
    theme: previewTheme,
    hidePremium: localStorage.getItem('fbe_premiumHidden') === 'true',
    hideChapterPromo: localStorage.getItem('fbe_chapterPromoHidden') === 'true',
    hiddenGenres: parseHiddenGenres(localStorage.getItem('fbe_hiddenGenres')),
  });
}

const loadInitialPageStyles = async () => {
  try {
    const theme = await loadTheme();
    if (!theme) return;
    void cacheThemePreview(theme);
    applyPageStyles({
      theme,
      hidePremium: localStorage.getItem('fbe_premiumHidden') === 'true',
      hideChapterPromo: localStorage.getItem('fbe_chapterPromoHidden') === 'true',
      hiddenGenres: parseHiddenGenres(localStorage.getItem('fbe_hiddenGenres')),
    });
  } catch {
    // App reports storage failures after it mounts.
  }
};

const mountApp = () => {
  if (!document.body || document.getElementById(rootId)) return;
  const appHost = document.createElement('div');
  appHost.id = rootId;
  
  // ВАЖНО: Мы задаем только z-index и display. 
  // Position (fixed, left/right) управляется внутри App.jsx через state.
  // Иначе будет конфликт стилей.
  Object.assign(appHost.style, {
    zIndex: '2147483647',
    display: 'block',
    all: 'initial' // Пытаемся сбросить наследование
  });

  const shadowRoot = appHost.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = contentStyles;
  shadowRoot.appendChild(style);
  const installGenreSprite = () => installFicbookGenreSprite(shadowRoot).then((result) => {
    appHost.classList.toggle('fbe-genre-icons-unavailable', !result.installed);
    appHost.dataset.fbeGenreSpriteStatus = result.reason ?? 'ready';
    if (!result.installed) console.warn('[FBE] genre sprite unavailable', result);
  });
  if (document.readyState === 'complete') installGenreSprite();
  else window.addEventListener('load', installGenreSprite, { once: true });

  const appContainer = document.createElement('div');
  shadowRoot.appendChild(appContainer);
  document.body.appendChild(appHost);

  const syncDarkTheme = () => {
    appHost.classList.toggle('dark-theme', document.body.classList.contains('dark-theme'));
  };
  syncDarkTheme();
  const themeObserver = new MutationObserver(syncDarkTheme);
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  const root = createRoot(appContainer);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (!document.getElementById(rootId)) {
  void loadInitialPageStyles();
  if (document.body) {
    mountApp();
  } else {
    document.addEventListener('DOMContentLoaded', mountApp, { once: true });
  }
}
