import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getButtonPositionStyle, getPanelPositionStyle } from '../src/features/button.js';
import { normalizeButtonSettings } from '../src/features/defaults.js';
import { getHttpUrlError } from '../src/features/urlValidation.js';

test('floating button keeps docked positions and ignores legacy manual coordinates', () => {
  assert.deepEqual(getButtonPositionStyle({ position: 'left' }), {
    bottom: '30px', left: '30px', alignItems: 'flex-start', transformOrigin: 'bottom left',
  });
  assert.deepEqual(getButtonPositionStyle({ position: 'right', x: 25, y: 40 }), {
    bottom: '30px', right: '30px', alignItems: 'flex-end', transformOrigin: 'bottom right',
  });
  assert.deepEqual(getPanelPositionStyle({ position: 'left', x: 160, y: 300 }, { width: 360, height: 450 }), {
    bottom: '90px', left: '30px', top: 'auto', maxHeight: 'calc(100dvh - 98px)', transformOrigin: 'bottom left',
  });
  assert.deepEqual(normalizeButtonSettings({ position: 'left', opacity: 0.5, scale: 0.8, x: 25, y: 40 }), {
    position: 'left', opacity: 0.5, scale: 0.8,
  });
});

test('URL validation keeps only HTTP(S) links eligible for theme settings', () => {
  assert.equal(getHttpUrlError(''), '');
  assert.equal(getHttpUrlError('https://fonts.googleapis.com/css2?family=Inter'), '');
  assert.match(getHttpUrlError('notaurl'), /Введите корректную ссылку/);
  assert.match(getHttpUrlError('file:///C:/theme.css'), /http:\/\/ или https:\/\//);
});

test('panel UI includes docked-button, close, reset, and light-theme affordances', async () => {
  const [app, floating, button, controls, content, popup, styles, sprite, manifest, download, exporter, selectors, storage] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/FloatingButton.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/button.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/PanelControls.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/content/index.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/popup/Popup.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles/index.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/content/ficbookSprite.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/manifest.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/DownloadFb2Button.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/fb2Export.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/selectors.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/storage.js', import.meta.url), 'utf8'),
  ]);

  assert.match(app, /fbe-panel-closing/);
  assert.match(app, /FloatingButton/);
  assert.doesNotMatch(app, /dragPosition|commitDragPosition|onPositionCommit|onPositionPreview/);
  assert.doesNotMatch(floating, /onPointer(?:Cancel|Down|Move|Up)|isDragging|clampButtonPosition|onPositionCommit|onPositionPreview/);
  assert.doesNotMatch(button, /clampButtonPosition|hasManualPosition|Number\.isFinite\(x\)/);
  assert.match(app, /fbe-reset-button/);
  assert.match(app, /aria-label="Закрыть настройки"/);
  assert.match(app, /aria-label="Сбросить фон"/);
  assert.match(app, /aria-label="Сбросить шрифт"/);
  assert.match(app, /htmlFor="fbe-bg-url"/);
  assert.match(app, /htmlFor="fbe-font-url"/);
  assert.match(app, /type="url"/);
  assert.match(app, /autoComplete="off"/);
  assert.match(app, /fbe-bg-url-error/);
  assert.match(app, /fbe-font-url-error/);
  assert.match(app, /useEffect\(\(\) => \{\s*if \(!isLoaded\) return;\s*applyPageStyles\(\{ theme, hidePremium: premiumHidden, hideChapterPromo: chapterPromoHidden, hiddenGenres \}\);/);
  assert.match(content, /const loadInitialPageStyles = async \(\) =>/);
  assert.match(content, /await loadTheme\(\)/);
  assert.match(content, /void loadInitialPageStyles\(\);/);
  assert.ok(content.indexOf('const previewTheme = getThemePreview();') < content.indexOf('const loadInitialPageStyles = async () =>'));
  assert.match(manifest, /run_at: 'document_start'/);
  assert.match(controls, /aria-pressed=\{active\}/);
  assert.match(controls, /Скрыто: \{hiddenCount\} из \{genres\.length\}/);
  assert.match(controls, /Показать все/);
  assert.doesNotMatch(controls, /<div[^>]*onClick/);
  assert.doesNotMatch(popup, /x:\s*null,\s*y:\s*null/);
  assert.match(styles, /color-scheme: light/);
  assert.match(styles, /color-scheme: dark/);
  assert.doesNotMatch(styles, /is-dragging|cursor:\s*grab|cursor:\s*grabbing/);
  assert.match(styles, /@keyframes fbe-panel-close/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /:host \*, :host \*::before, :host \*::after/);
  assert.doesNotMatch(styles, /animation: fbe-panel-open 0\.8s/);
  assert.doesNotMatch(styles, /0\.6s|0\.8s/);
  assert.match(styles, /\.fbe-tab-enter\s*\{[\s\S]*animation: fbe-flow-enter/);
  assert.doesNotMatch(styles, /@keyframes fbe-flow-enter[\s\S]{0,400}filter:/);
  assert.doesNotMatch(styles, /\.fbe-nav-item\s*\{[\s\S]{0,240}transition:\s*all/);
  assert.doesNotMatch(styles, /\.fbe-btn-tab\s*\{[\s\S]{0,240}transition:\s*all/);
  assert.match(styles, /fbe-input-icon/);
  assert.equal((app.match(/fbe-control-icon/g) || []).length, 4);
  assert.doesNotMatch(app, /top-1\/2 -translate-y-1\/2/);
  assert.match(styles, /\.fbe-control-icon\s*\{[\s\S]{0,220}position:\s*absolute;[\s\S]{0,220}top:\s*50%;[\s\S]{0,220}transform:\s*translateY\(-50%\)/);
  assert.match(styles, /--fbe-muted: #6b7280/);
  assert.match(styles, /\.fbe-export-button\s*\{[\s\S]{0,320}background: var\(--fbe-accent\)/);
  assert.match(styles, /fbe-danger-zone/);
  assert.match(controls, /fbe-genre-dot/);
  assert.match(controls, /href=\{`#\$\{genre\.icon\}`\}/);
  assert.doesNotMatch(app, /icons-sprite6\.svg#/);
  assert.doesNotMatch(controls, /icons-sprite6\.svg#/);
  assert.match(controls, /fbe-genre-icon/);
  assert.match(styles, /\.fbe-genre-icon/);
  assert.match(styles, /stroke: currentColor/);
  assert.match(styles, /fbe-input-wrapper:focus-within \.fbe-input-icon/);
  assert.match(content, /installFicbookGenreSprite\(shadowRoot\)\.then/);
  assert.match(content, /window\.addEventListener\('load', installGenreSprite, \{ once: true \}\)/);
  assert.match(sprite, /FICBOOK_GENRE_ICON_IDS/);
  assert.match(sprite, /document\.querySelectorAll\('use'\)/);
  assert.match(sprite, /new URL\(href, document\.location\.href\)/);
  assert.match(sprite, /url\.origin !== document\.location\.origin/);
  assert.doesNotMatch(sprite, /icons-sprite6/);
  assert.match(sprite, /ALLOWED_TAGS/);
  assert.match(sprite, /unavailable\('http-status'/);
  assert.match(sprite, /unavailable\('xml-parse-error'/);
  assert.match(sprite, /unavailable\('missing-icons'/);
  assert.match(sprite, /unavailable\('sprite-url-missing'/);
  assert.match(sprite, /unavailable\('fetch-error'/);
  assert.doesNotMatch(sprite, /innerHTML/);
  assert.match(styles, /:host\(\.fbe-genre-icons-unavailable\) \.fbe-genre-dot/);
  assert.match(manifest, /host_permissions: \['\*:\/\/ficbook\.net\/\*'\]/);
  assert.match(content, /console\.warn\('\[FBE\] genre sprite unavailable', result\)/);
  assert.match(app, /chapterPromoHidden/);
  assert.match(controls, /Скрыть промо в главе/);
  assert.match(storage, /fbe_chapterPromoHidden/);
  assert.match(download, /Скачано: \$\{result\.chapterCount\} из \$\{result\.total\} глав\./);
  assert.match(download, /fbe-export-meter/);
  assert.match(download, /aria-valuemax=\{progress\.total\}/);
  assert.match(download, /const DownloadFb2Button = \(\{ isExporting, onExportingChange \}\) =>/);
  assert.match(app, /const \[isExporting, setIsExporting\] = useState\(false\);/);
  assert.match(app, /useExportNavigationGuard\(isExporting\);/);
  assert.match(app, /onClick=\{handlePanelClose\}/);
  assert.match(styles, /\.fbe-export-button/);
  assert.match(styles, /\.fbe-export-meter-fill/);
  assert.match(app, /<div className="fbe-export-slot" hidden=\{activeTab !== 'cleaner'\}>\s*<DownloadFb2Button isExporting=\{isExporting\} onExportingChange=\{setIsExporting\} \/>\s*<\/div>/);
  const cleanerStart = app.indexOf("{activeTab === 'cleaner' && (");
  const filtersStart = app.indexOf("{activeTab === 'filters' && (");
  assert.ok(cleanerStart >= 0 && filtersStart > cleanerStart);
  assert.doesNotMatch(app.slice(cleanerStart, filtersStart), /<DownloadFb2Button \/>/);
  assert.match(exporter, /const yieldToBrowser/);
  assert.match(exporter, /phase: 'serializing'/);
  assert.doesNotMatch(app, /adsHidden|fbe_adsHidden|Скрыть рекламу/);
  assert.doesNotMatch(selectors, /AD_SELECTORS|fb-ads-block/);
  assert.doesNotMatch(storage, /fbe_adsHidden/);
});
