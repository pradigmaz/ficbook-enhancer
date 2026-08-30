import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('release notice uses a narrow MV3 background request and accessible GitHub links', async () => {
  const [app, manifest, notice, background, styles] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/manifest.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/ReleaseUpdateNotice.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/background/index.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles/index.css', import.meta.url), 'utf8'),
  ]);

  assert.match(app, /ReleaseUpdateNotice/);
  assert.match(app, /ReleasesLink/);
  assert.match(manifest, /host_permissions: \['\*:\/\/ficbook\.net\/\*', 'https:\/\/api\.github\.com\/\*'\]/);
  assert.match(manifest, /service_worker: 'src\/background\/index\.js'/);
  assert.match(manifest, /type: 'module'/);
  assert.match(notice, /RELEASES_URL/);
  assert.match(notice, /aria-label="Открыть релизы на GitHub"/);
  assert.match(notice, /aria-label=\{`Открыть релиз версии \$\{update\.version\} на GitHub`\}/);
  assert.match(notice, /target="_blank"/);
  assert.match(notice, /rel="noreferrer"/);
  assert.match(notice, /RELEASE_UPDATE_MESSAGE/);
  assert.match(notice, /isTrustedUpdate/);
  assert.doesNotMatch(notice, /innerHTML|eval\(/);
  assert.match(background, /sender\.id !== globalThis\.chrome\.runtime\.id/);
  assert.match(background, /RELEASE_CHECK_INTERVAL_MS/);
  assert.match(background, /fetch\(RELEASE_API_URL/);
  assert.doesNotMatch(background, /setInterval|setTimeout|chrome\.alarms/);
  assert.match(styles, /\.fbe-releases-link/);
  assert.match(styles, /\.fbe-release-notice/);
});
