import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { test } from 'node:test';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('uses own PNG icons and keeps starter assets and signing artifacts out of a public release', async () => {
  const [manifest, ignore, index] = await Promise.all([
    readProjectFile('src/manifest.js'),
    readProjectFile('.gitignore'),
    readProjectFile('index.html'),
  ]);

  assert.match(manifest, /16:\s*'icons\/icon16\.png'/);
  assert.match(manifest, /48:\s*'icons\/icon48\.png'/);
  assert.match(manifest, /128:\s*'icons\/icon128\.png'/);
  assert.doesNotMatch(manifest, /vite\.svg/);
  assert.doesNotMatch(index, /vite\.svg/);
  assert.match(ignore, /^\*\.pem$/m);
  assert.match(ignore, /^\*\.crx$/m);
  assert.match(ignore, /^\*\.rar$/m);

  await Promise.all([
    stat(new URL('../public/icons/icon16.png', import.meta.url)),
    stat(new URL('../public/icons/icon48.png', import.meta.url)),
    stat(new URL('../public/icons/icon128.png', import.meta.url)),
  ]);
});
