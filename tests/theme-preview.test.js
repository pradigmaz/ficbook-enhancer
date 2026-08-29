import assert from 'node:assert/strict';
import test from 'node:test';

import { cacheThemePreview, getThemePreview } from '../src/features/themePreview.js';

const createLocalStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
};

test('cached URL background is available before IndexedDB and clears with reset', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: createLocalStorage() });
  try {
    await cacheThemePreview({ bgType: 'url', bgUrl: 'https://example.test/background.jpg' });
    assert.deepEqual(getThemePreview(), { bgType: 'url', bgUrl: 'https://example.test/background.jpg' });

    await cacheThemePreview({ bgType: 'none' });
    assert.equal(getThemePreview(), null);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('cached file background is reduced before it reaches localStorage', async () => {
  const storage = createLocalStorage();
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const canvas = {
    getContext: () => ({ drawImage: () => {} }),
    toDataURL: () => 'data:image/jpeg;base64,preview',
  };
  class FakeImage {
    set src(value) {
      this.naturalWidth = 3000;
      this.naturalHeight = 5000;
      queueMicrotask(() => this.onload(value));
    }
  }
  Object.defineProperties(globalThis, {
    localStorage: { configurable: true, value: storage },
    Image: { configurable: true, value: FakeImage },
    document: { configurable: true, value: { createElement: () => canvas } },
  });
  try {
    await cacheThemePreview({ bgType: 'file', bgFile: 'data:image/jpeg;base64,source' });
    assert.equal(canvas.width, 288);
    assert.equal(canvas.height, 480);
    assert.deepEqual(getThemePreview(), { bgType: 'file', bgFile: 'data:image/jpeg;base64,preview' });
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
    if (originalImage) Object.defineProperty(globalThis, 'Image', originalImage);
    else delete globalThis.Image;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete globalThis.document;
  }
});
