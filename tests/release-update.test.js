import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RELEASE_CACHE_KEY,
  RELEASES_URL,
  RELEASE_UPDATE_MESSAGE,
  createReleaseUpdate,
  isReleaseNewer,
  normalizeReleaseVersion,
} from '../src/features/releaseUpdate.js';

test('release tags are normalized only when they can represent a Chrome version', () => {
  assert.equal(RELEASES_URL, 'https://github.com/pradigmaz/ficbook-enhancer/releases');
  assert.equal(normalizeReleaseVersion('v1.2.3'), '1.2.3');
  assert.equal(normalizeReleaseVersion('1.2.3.4'), '1.2.3.4');
  assert.equal(normalizeReleaseVersion('v1.2.3-beta.1'), null);
  assert.equal(normalizeReleaseVersion('https://example.test'), null);
});

test('release notification is shown only for a numerically newer version', () => {
  assert.equal(isReleaseNewer('1.0.1', '1.0.0'), true);
  assert.equal(isReleaseNewer('1.0.0.1', '1.0.0'), true);
  assert.equal(isReleaseNewer('1.0.0', '1.0.0'), false);
  assert.equal(isReleaseNewer('1.0.0', '1.0.1'), false);

  assert.deepEqual(createReleaseUpdate('v1.1.0', '1.0.0'), {
    version: '1.1.0',
    url: 'https://github.com/pradigmaz/ficbook-enhancer/releases/tag/v1.1.0',
  });
  assert.equal(createReleaseUpdate('v1.0.0-beta.1', '1.0.0'), null);
  assert.equal(createReleaseUpdate('v1.0.0', '1.0.0'), null);
});

test('background checks only internal requests and reuses its cached latest tag', async () => {
  const previousChrome = globalThis.chrome;
  const previousFetch = globalThis.fetch;
  const storage = {};
  let listener;
  let fetchCalls = 0;
  let installedVersion = '1.0.0';

  globalThis.chrome = {
    storage: {
      local: {
        get: async (key) => ({ [key]: storage[key] }),
        set: async (values) => Object.assign(storage, values),
      },
    },
    runtime: {
      id: 'test-extension',
      getManifest: () => ({ version: installedVersion }),
      onMessage: { addListener: (callback) => { listener = callback; } },
    },
  };
  globalThis.fetch = async (url) => {
    fetchCalls += 1;
    assert.equal(url, 'https://api.github.com/repos/pradigmaz/ficbook-enhancer/releases/latest');
    return { ok: true, json: async () => ({ tag_name: 'v1.0.1' }) };
  };

  try {
    const backgroundUrl = new URL('../src/background/index.js', import.meta.url);
    await import(`${backgroundUrl.href}?release-update-test=${Date.now()}`);
    const requestUpdate = () => new Promise((resolve) => {
      assert.equal(listener({ type: RELEASE_UPDATE_MESSAGE }, { id: 'test-extension' }, resolve), true);
    });

    assert.deepEqual(await requestUpdate(), {
      update: { version: '1.0.1', url: 'https://github.com/pradigmaz/ficbook-enhancer/releases/tag/v1.0.1' },
    });
    await requestUpdate();
    assert.equal(fetchCalls, 1);
    assert.equal(storage[RELEASE_CACHE_KEY].installedVersion, '1.0.0');
    installedVersion = '1.1.0';
    await requestUpdate();
    assert.equal(fetchCalls, 2);
    assert.equal(listener({ type: RELEASE_UPDATE_MESSAGE }, { id: 'other-extension' }, () => {}), undefined);
  } finally {
    if (previousChrome === undefined) delete globalThis.chrome;
    else globalThis.chrome = previousChrome;
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});
