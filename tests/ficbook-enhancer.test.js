import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { DEFAULT_BUTTON_SETTINGS, DEFAULT_THEME } from '../src/features/defaults.js';
import { PREMIUM_SELECTORS, parseHiddenGenres } from '../src/features/selectors.js';
import {
  composePageStyles,
  generateThemeStyles,
  resolveFontFormat,
} from '../src/features/theming.js';
import { loadTheme, resetStoredSettings, saveTheme } from '../src/features/storage.js';

const waitForCallback = () => new Promise((resolve) => setTimeout(resolve, 0));

test('page CSS keeps imports before ordinary rules for every remaining cleaner state', () => {
  for (const hidePremium of [false, true]) {
    const css = composePageStyles({
      theme: {
        ...DEFAULT_THEME,
        fontType: 'url',
        fontName: 'Inter',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Inter',
      },
      hidePremium,
      hiddenGenres: { gen: true },
    });
    const importIndex = css.indexOf('@import');
    const ordinaryRuleIndexes = [
      '.premium-button',
      'article.fanfic-inline',
      '#ficbook-enhancer-root',
    ]
      .map((selector) => css.indexOf(selector))
      .filter((index) => index >= 0);

    assert.ok(importIndex >= 0);
    assert.ok(ordinaryRuleIndexes.every((index) => index > importIndex), `state ${hidePremium}`);
    assert.equal(css.slice(importIndex + 1).includes('@import'), false);
    if (hidePremium) {
      assert.match(css, /\.discount-modal-btn/);
      assert.match(css, /\.discount-sticky/);
    }
  }
});

test('Premium cleanup targets live Ficbook discount controls', () => {
  assert.ok(PREMIUM_SELECTORS.includes('.discount-modal-btn'));
  assert.ok(PREMIUM_SELECTORS.includes('.discount-sticky'));
});

test('portrait backgrounds fill the viewport without losing the source image', () => {
  const css = generateThemeStyles({
    ...DEFAULT_THEME,
    bgType: 'file',
    bgFile: 'data:image/jpeg;base64,AA==',
  });

  assert.match(css, /background-image: url\('data:image\/jpeg;base64,AA=='\), linear-gradient\(rgba\(20, 20, 20, 0\.72\), rgba\(20, 20, 20, 0\.72\)\), url\('data:image\/jpeg;base64,AA=='\) !important;/);
  assert.match(css, /background-size: contain, 100% 100%, cover !important;/);
});

test('hidden genre persistence accepts only the expected object shape', () => {
  const allowed = ['gen', 'slash'];
  assert.deepEqual(parseHiddenGenres('{"gen":true}', allowed), { gen: true });
  for (const value of ['not-json', 'null', '[]', 'true', '{"gen":"yes"}', '{"other":true}']) {
    assert.deepEqual(parseHiddenGenres(value, allowed), {});
  }
});

test('font files resolve to their matching CSS format', () => {
  const cases = [
    ['font.ttf', 'truetype'],
    ['font.otf', 'opentype'],
    ['font.woff', 'woff'],
    ['font.WOFF2', 'woff2'],
  ];
  for (const [fileName, expected] of cases) {
    assert.equal(resolveFontFormat({ fileName }), expected);
  }
  assert.equal(resolveFontFormat({ dataUrl: 'data:font/woff2;base64,AA==' }), 'woff2');
  assert.equal(resolveFontFormat({ fileName: 'font.txt', mimeType: 'text/plain' }), null);
  assert.match(
    generateThemeStyles({ ...DEFAULT_THEME, fontType: 'file', fontFile: 'data:font/woff2;base64,AA==' }),
    /format\('woff2'\)/,
  );
});

test('button defaults are shared and content CSS is inline-only', async () => {
  assert.deepEqual(DEFAULT_BUTTON_SETTINGS, { position: 'right', opacity: 1, scale: 1 });
  const contentEntry = await readFile(new URL('../src/content/index.jsx', import.meta.url), 'utf8');
  const appEntry = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const popupEntry = await readFile(new URL('../src/popup/main.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles/index.css', import.meta.url), 'utf8');

  assert.match(contentEntry, /styles\/index\.css\?inline/);
  assert.doesNotMatch(contentEntry, /import ['"]\.\.\/styles\/index\.css['"]/);
  assert.doesNotMatch(appEntry, /import ['"]\.\/styles\/index\.css['"]/);
  assert.match(appEntry, /error\.partialReset/);
  assert.match(popupEntry, /import ['"]\.\.\/styles\/index\.css['"]/);
  assert.match(styles, /:host\s*\{/);
  assert.match(contentEntry, /attachShadow\(\{ mode: ['"]open['"] \}\)/);
});

const installIndexedDb = (options = {}) => {
  const {
    completeAutomatically = false,
    events = [],
    failReadCount = 0,
    failPutCount = 0,
    initialTheme,
  } = options;
  let lastTransaction;
  let storedTheme = initialTheme;
  let themeExists = Object.prototype.hasOwnProperty.call(options, 'initialTheme');
  let readFailuresRemaining = failReadCount;
  let putFailuresRemaining = failPutCount;

  globalThis.indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = {
          objectStoreNames: { contains: () => true },
          transaction() {
            lastTransaction = {
              error: null,
              objectStore: () => ({
                put: (value) => {
                  events.push('idb:put');
                  if (putFailuresRemaining > 0) {
                    putFailuresRemaining -= 1;
                    lastTransaction.error = new Error('IndexedDB write failed');
                    queueMicrotask(() => lastTransaction.onabort?.());
                    return;
                  }
                  storedTheme = value;
                  themeExists = true;
                  if (completeAutomatically) queueMicrotask(() => lastTransaction.oncomplete?.());
                },
                get: () => {
                  const readRequest = {};
                  if (readFailuresRemaining > 0) {
                    readFailuresRemaining -= 1;
                    lastTransaction.error = new Error('IndexedDB read failed');
                    queueMicrotask(() => lastTransaction.onabort?.());
                    return readRequest;
                  }
                  queueMicrotask(() => {
                    readRequest.result = themeExists ? storedTheme : undefined;
                    readRequest.onsuccess?.();
                    if (completeAutomatically) lastTransaction.oncomplete?.();
                  });
                  return readRequest;
                },
                delete: () => {
                  const deleteRequest = {};
                  queueMicrotask(() => {
                    themeExists = false;
                    storedTheme = undefined;
                    deleteRequest.onsuccess?.();
                    if (completeAutomatically) lastTransaction.oncomplete?.();
                  });
                  return deleteRequest;
                },
              }),
            };
            return lastTransaction;
          },
        };
        request.onsuccess?.();
      });
      return request;
    },
  };
  const getTransaction = () => lastTransaction;
  getTransaction.getStoredTheme = () => (themeExists ? storedTheme : undefined);
  return getTransaction;
};

const installAbortedReadIndexedDb = () => {
  let lastTransaction;
  globalThis.indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        const readRequest = {};
        lastTransaction = {
          objectStore: () => ({ get: () => readRequest }),
        };
        request.result = { transaction: () => lastTransaction };
        request.onsuccess?.();
        queueMicrotask(() => lastTransaction.onabort?.());
      });
      return request;
    },
  };
  return () => lastTransaction;
};

test('loadTheme resolves a safe fallback when its read transaction aborts', { concurrency: false }, async () => {
  const previousIndexedDb = globalThis.indexedDB;
  try {
    installAbortedReadIndexedDb();
    const loaded = await Promise.race([
      loadTheme(),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 40)),
    ]);
    assert.equal(loaded, null);
  } finally {
    if (previousIndexedDb) globalThis.indexedDB = previousIndexedDb;
    else delete globalThis.indexedDB;
  }
});

test('saveTheme resolves only after transaction completion and rejects aborts', { concurrency: false }, async () => {
  const previousIndexedDb = globalThis.indexedDB;
  try {
    const getTransaction = installIndexedDb();
    const pending = saveTheme(DEFAULT_THEME);
    await waitForCallback();
    const transaction = getTransaction();
    assert.ok(transaction);

    let completed = false;
    pending.then(() => { completed = true; });
    await Promise.resolve();
    assert.equal(completed, false);
    transaction.oncomplete();
    await pending;
    assert.equal(completed, true);

    const getAbortedTransaction = installIndexedDb();
    const aborted = saveTheme(DEFAULT_THEME);
    await waitForCallback();
    getAbortedTransaction().onabort();
    await assert.rejects(aborted, /aborted/);
  } finally {
    if (previousIndexedDb) globalThis.indexedDB = previousIndexedDb;
    else delete globalThis.indexedDB;
  }
});

test('resetStoredSettings updates all three persistence backends', { concurrency: false }, async () => {
  const previousIndexedDb = globalThis.indexedDB;
  const previousLocalStorage = globalThis.localStorage;
  const previousChrome = globalThis.chrome;
  const removedKeys = [];
  const chromeWrites = [];

  try {
    installIndexedDb({ completeAutomatically: true });
    globalThis.localStorage = { removeItem: (key) => removedKeys.push(key) };
    globalThis.chrome = {
      runtime: {},
      storage: {
        local: {
          set: (value, callback) => {
            chromeWrites.push(value);
            callback?.();
          },
        },
      },
    };

    await resetStoredSettings({
      defaultTheme: DEFAULT_THEME,
      defaultButtonSettings: DEFAULT_BUTTON_SETTINGS,
    });

    assert.deepEqual(removedKeys, ['fbe_premiumHidden', 'fbe_hiddenGenres', 'fbe_chapterPromoHidden']);
    assert.deepEqual(chromeWrites, [{ buttonSettings: DEFAULT_BUTTON_SETTINGS }]);
  } finally {
    if (previousIndexedDb) globalThis.indexedDB = previousIndexedDb;
    else delete globalThis.indexedDB;
    if (previousLocalStorage) globalThis.localStorage = previousLocalStorage;
    else delete globalThis.localStorage;
    if (previousChrome) globalThis.chrome = previousChrome;
    else delete globalThis.chrome;
  }
});

test('resetStoredSettings restores earlier backends when IndexedDB reset fails', { concurrency: false }, async () => {
  const previousIndexedDb = globalThis.indexedDB;
  const previousLocalStorage = globalThis.localStorage;
  const previousChrome = globalThis.chrome;
  const originalTheme = { ...DEFAULT_THEME, bgType: 'color', bgColor: '#123456' };
    const originalLocalValues = new Map([
    ['fbe_premiumHidden', 'false'],
    ['fbe_hiddenGenres', '{"gen":true}'],
    ['fbe_chapterPromoHidden', 'true'],
  ]);
  const originalButtonSettings = { position: 'left', opacity: 0.5, scale: 0.8 };
  let chromeSettings = { buttonSettings: originalButtonSettings };

  try {
    const getTransaction = installIndexedDb({
      completeAutomatically: true,
      failPutCount: 1,
      initialTheme: originalTheme,
    });
    globalThis.localStorage = {
      getItem: (key) => originalLocalValues.get(key) ?? null,
      setItem: (key, value) => originalLocalValues.set(key, value),
      removeItem: (key) => originalLocalValues.delete(key),
    };
    globalThis.chrome = {
      runtime: {},
      storage: {
        local: {
          get: (_keys, callback) => callback({ ...chromeSettings }),
          set: (value, callback) => {
            chromeSettings = { ...chromeSettings, ...value };
            callback?.();
          },
        },
      },
    };

    await assert.rejects(
      resetStoredSettings({ defaultTheme: DEFAULT_THEME, defaultButtonSettings: DEFAULT_BUTTON_SETTINGS }),
      /IndexedDB write failed/,
    );

    assert.deepEqual(chromeSettings, { buttonSettings: originalButtonSettings });
    assert.deepEqual([...originalLocalValues.entries()], [
      ['fbe_premiumHidden', 'false'],
      ['fbe_hiddenGenres', '{"gen":true}'],
      ['fbe_chapterPromoHidden', 'true'],
    ]);
    assert.deepEqual(getTransaction.getStoredTheme(), originalTheme);
  } finally {
    if (previousIndexedDb) globalThis.indexedDB = previousIndexedDb;
    else delete globalThis.indexedDB;
    if (previousLocalStorage) globalThis.localStorage = previousLocalStorage;
    else delete globalThis.localStorage;
    if (previousChrome) globalThis.chrome = previousChrome;
    else delete globalThis.chrome;
  }
});

test('resetStoredSettings writes defaults when the theme snapshot read fails', { concurrency: false }, async () => {
  const previousIndexedDb = globalThis.indexedDB;
  const previousLocalStorage = globalThis.localStorage;
  const previousChrome = globalThis.chrome;
  const localValues = new Map([['fbe_premiumHidden', 'true'], ['fbe_chapterPromoHidden', 'true']]);
  let chromeSettings = { buttonSettings: { position: 'left', opacity: 0.5, scale: 0.8 } };

  try {
    const getTransaction = installIndexedDb({
      completeAutomatically: true,
      failReadCount: 1,
      initialTheme: { ...DEFAULT_THEME, bgType: 'color', bgColor: '#123456' },
    });
    globalThis.localStorage = {
      getItem: (key) => localValues.get(key) ?? null,
      setItem: (key, value) => localValues.set(key, value),
      removeItem: (key) => localValues.delete(key),
    };
    globalThis.chrome = {
      runtime: {},
      storage: {
        local: {
          get: (_keys, callback) => callback({ ...chromeSettings }),
          set: (value, callback) => {
            chromeSettings = { ...chromeSettings, ...value };
            callback?.();
          },
        },
      },
    };

    await resetStoredSettings({ defaultTheme: DEFAULT_THEME, defaultButtonSettings: DEFAULT_BUTTON_SETTINGS });

    assert.deepEqual(chromeSettings, { buttonSettings: DEFAULT_BUTTON_SETTINGS });
    assert.deepEqual(getTransaction.getStoredTheme(), DEFAULT_THEME);
    assert.deepEqual([...localValues.entries()], []);
  } finally {
    if (previousIndexedDb) globalThis.indexedDB = previousIndexedDb;
    else delete globalThis.indexedDB;
    if (previousLocalStorage) globalThis.localStorage = previousLocalStorage;
    else delete globalThis.localStorage;
    if (previousChrome) globalThis.chrome = previousChrome;
    else delete globalThis.chrome;
  }
});

test('resetStoredSettings marks an error partial when the theme snapshot is unavailable', { concurrency: false }, async () => {
  const previousIndexedDb = globalThis.indexedDB;
  const previousLocalStorage = globalThis.localStorage;
  const previousChrome = globalThis.chrome;
  const originalButtonSettings = { position: 'left', opacity: 0.5, scale: 0.8 };
  let chromeSettings = { buttonSettings: originalButtonSettings };

  try {
    installIndexedDb({ completeAutomatically: true, failReadCount: 1, failPutCount: 1 });
    globalThis.localStorage = { getItem: () => null, removeItem: () => {} };
    globalThis.chrome = {
      runtime: {},
      storage: {
        local: {
          get: (_keys, callback) => callback({ ...chromeSettings }),
          set: (value, callback) => {
            chromeSettings = { ...chromeSettings, ...value };
            callback?.();
          },
        },
      },
    };

    await assert.rejects(
      resetStoredSettings({ defaultTheme: DEFAULT_THEME, defaultButtonSettings: DEFAULT_BUTTON_SETTINGS }),
      (error) => error.partialReset === true && /IndexedDB write failed/.test(error.message),
    );
    assert.deepEqual(chromeSettings, { buttonSettings: originalButtonSettings });
  } finally {
    if (previousIndexedDb) globalThis.indexedDB = previousIndexedDb;
    else delete globalThis.indexedDB;
    if (previousLocalStorage) globalThis.localStorage = previousLocalStorage;
    else delete globalThis.localStorage;
    if (previousChrome) globalThis.chrome = previousChrome;
    else delete globalThis.chrome;
  }
});

test('resetStoredSettings marks an error partial when Chrome rollback fails', { concurrency: false }, async () => {
  const previousIndexedDb = globalThis.indexedDB;
  const previousLocalStorage = globalThis.localStorage;
  const previousChrome = globalThis.chrome;
  const originalButtonSettings = { position: 'left', opacity: 0.5, scale: 0.8 };
  let chromeSettings = { buttonSettings: originalButtonSettings };
  let writes = 0;

  try {
    installIndexedDb({ completeAutomatically: true, failPutCount: 1 });
    globalThis.localStorage = { getItem: () => null, removeItem: () => {} };
    globalThis.chrome = { runtime: {}, storage: { local: {
      get: (_keys, callback) => callback({ ...chromeSettings }),
      set: (value, callback) => {
        writes += 1;
        if (writes === 2) globalThis.chrome.runtime.lastError = new Error('Chrome rollback failed');
        else chromeSettings = { ...chromeSettings, ...value };
        callback?.();
        delete globalThis.chrome.runtime.lastError;
      },
    } } };

    await assert.rejects(
      resetStoredSettings({ defaultTheme: DEFAULT_THEME, defaultButtonSettings: DEFAULT_BUTTON_SETTINGS }),
      (error) => error.partialReset === true && /IndexedDB write failed/.test(error.message),
    );
    assert.deepEqual(chromeSettings, { buttonSettings: DEFAULT_BUTTON_SETTINGS });
  } finally {
    if (previousIndexedDb) globalThis.indexedDB = previousIndexedDb;
    else delete globalThis.indexedDB;
    if (previousLocalStorage) globalThis.localStorage = previousLocalStorage;
    else delete globalThis.localStorage;
    if (previousChrome) globalThis.chrome = previousChrome;
    else delete globalThis.chrome;
  }
});

test('reset stops before other backends when Chrome storage rejects', { concurrency: false }, async () => {
  const previousIndexedDb = globalThis.indexedDB;
  const previousLocalStorage = globalThis.localStorage;
  const previousChrome = globalThis.chrome;
  const calls = [];

  try {
    installIndexedDb({ completeAutomatically: true, events: calls });
    globalThis.localStorage = { removeItem: key => calls.push(`local:${key}`) };
    globalThis.chrome = {
      runtime: { lastError: new Error('chrome storage failed') },
      storage: {
        local: {
          set: (_value, callback) => {
            calls.push('chrome:set');
            callback?.();
          },
        },
      },
    };

    await assert.rejects(
      resetStoredSettings({ defaultTheme: DEFAULT_THEME, defaultButtonSettings: DEFAULT_BUTTON_SETTINGS }),
      /chrome storage failed/,
    );
    assert.deepEqual(calls, ['chrome:set']);
  } finally {
    if (previousIndexedDb) globalThis.indexedDB = previousIndexedDb;
    else delete globalThis.indexedDB;
    if (previousLocalStorage) globalThis.localStorage = previousLocalStorage;
    else delete globalThis.localStorage;
    if (previousChrome) globalThis.chrome = previousChrome;
    else delete globalThis.chrome;
  }
});
