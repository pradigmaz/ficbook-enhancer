import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { test } from 'node:test';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('uses own PNG icons, keeps release versioning aligned, and excludes signing artifacts', async () => {
  const [manifest, ignore, index, packageText, lockText, readme, storeListing] = await Promise.all([
    readProjectFile('src/manifest.js'),
    readProjectFile('.gitignore'),
    readProjectFile('index.html'),
    readProjectFile('package.json'),
    readProjectFile('package-lock.json'),
    readProjectFile('README.md'),
    readProjectFile('STORE_LISTING.md'),
  ]);
  const packageJson = JSON.parse(packageText);
  const packageLock = JSON.parse(lockText);
  const manifestVersion = manifest.match(/version: '([^']+)'/)?.[1];

  assert.equal(manifestVersion, packageJson.version);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
  assert.match(readme, new RegExp(`ficbook-enhancer-${packageJson.version}\\.zip`));
  assert.match(storeListing, new RegExp(`ficbook-enhancer-${packageJson.version}\\.zip`));
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
