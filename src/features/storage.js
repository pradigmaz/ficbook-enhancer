// src/features/storage.js

const DB_NAME = 'FicbookEnhancerDB';
const DB_VERSION = 1;
const STORE_NAME = 'settings';
const THEME_KEY = 'user_theme';
const RESET_KEYS = ['fbe_premiumHidden', 'fbe_hiddenGenres', 'fbe_chapterPromoHidden'];

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveTheme = async (themeData) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      let settled = false;
      const complete = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const fail = (error) => {
        if (settled) return;
        settled = true;
        reject(error || tx.error || new Error('IndexedDB transaction failed'));
      };

      tx.oncomplete = complete;
      tx.onerror = () => fail(tx.error);
      tx.onabort = () => fail(tx.error || new Error('IndexedDB transaction aborted'));

      try {
        const request = store.put(themeData, THEME_KEY);
        request?.addEventListener?.('error', () => fail(request.error));
      } catch (error) {
        fail(error);
      }
    });
  } catch (error) {
    console.error('Ошибка сохранения темы:', error);
    throw error;
  }
};

const readThemeRecord = async () => {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    let value;
    let exists = false;
    let settled = false;

    const complete = () => {
      if (settled) return;
      settled = true;
      resolve({ exists, value });
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error || tx.error || new Error('IndexedDB read transaction failed'));
    };

    tx.oncomplete = complete;
    tx.onerror = () => fail(tx.error);
    tx.onabort = () => fail(tx.error || new Error('IndexedDB read transaction aborted'));

    const request = store.get(THEME_KEY);
    request.onsuccess = () => {
      exists = request.result !== undefined;
      value = request.result;
    };
    request.onerror = () => fail(request.error || new Error('IndexedDB theme read failed'));
  });
};

const deleteTheme = async () => {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let settled = false;

    const complete = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error || tx.error || new Error('IndexedDB delete transaction failed'));
    };

    tx.oncomplete = complete;
    tx.onerror = () => fail(tx.error);
    tx.onabort = () => fail(tx.error || new Error('IndexedDB delete transaction aborted'));

    const request = store.delete(THEME_KEY);
    request?.addEventListener?.('error', () => fail(request.error));
  });
};

const callChromeStorage = (storageArea, method, args = []) => {
  if (!storageArea?.[method]) return Promise.resolve(method === 'get' ? {} : undefined);

  return new Promise((resolve, reject) => {
    let settled = false;
    const complete = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error || new Error(`Chrome storage ${method} failed`));
    };

    try {
      const result = storageArea[method](...args, (...values) => {
        const error = globalThis.chrome?.runtime?.lastError;
        if (error) fail(error);
        else complete(values[0]);
      });
      if (result?.then) result.then(complete, fail);
    } catch (error) {
      fail(error);
    }
  });
};

const setChromeStorage = (storageArea, value) => callChromeStorage(storageArea, 'set', [value]);
const getChromeStorage = (storageArea, keys) => callChromeStorage(storageArea, 'get', [keys]);
const removeChromeStorage = (storageArea, keys) => callChromeStorage(storageArea, 'remove', [keys]);

const restoreLocalStorage = (storageArea, snapshot) => {
  if (!storageArea || !snapshot) return;

  for (const key of RESET_KEYS) {
    const value = snapshot[key];
    if (value === null || value === undefined) storageArea.removeItem(key);
    else storageArea.setItem(key, value);
  }
};

export const resetStoredSettings = async ({ defaultTheme, defaultButtonSettings } = {}) => {
  const chromeStorage = globalThis.chrome?.storage?.local;
  const localStorageArea = globalThis.localStorage;
  let themeSnapshot = null;
  try {
    themeSnapshot = await readThemeRecord();
  } catch {
    // Resetting to defaults is still useful when the old theme cannot be read.
  }
  const chromeValues = await getChromeStorage(chromeStorage, ['buttonSettings']);
  const chromeSnapshot = {
    exists: Object.prototype.hasOwnProperty.call(chromeValues, 'buttonSettings'),
    value: chromeValues.buttonSettings,
  };
  const localSnapshot = localStorageArea?.getItem
    ? Object.fromEntries(RESET_KEYS.map((key) => [key, localStorageArea.getItem(key)]))
    : null;
  let chromeAttempted = false;
  let themeAttempted = false;
  let localAttempted = false;

  try {
    chromeAttempted = true;
    await setChromeStorage(chromeStorage, { buttonSettings: defaultButtonSettings });
    themeAttempted = true;
    await saveTheme(defaultTheme);
    localAttempted = true;
    for (const key of RESET_KEYS) {
      localStorageArea?.removeItem(key);
    }
  } catch (error) {
    const rollbackErrors = [];
    const rollback = async (name, action) => {
      try {
        await action();
      } catch (rollbackError) {
        rollbackErrors.push({ name, error: rollbackError });
      }
    };

    if (localAttempted) {
      await rollback('localStorage', () => restoreLocalStorage(localStorageArea, localSnapshot));
    }
    if (themeAttempted && themeSnapshot) {
      await rollback('IndexedDB', () => (
        themeSnapshot.exists ? saveTheme(themeSnapshot.value) : deleteTheme()
      ));
    }
    if (chromeAttempted) {
      await rollback('Chrome Storage', () => (
        chromeSnapshot.exists
          ? setChromeStorage(chromeStorage, { buttonSettings: chromeSnapshot.value })
          : removeChromeStorage(chromeStorage, ['buttonSettings'])
      ));
    }
    if (rollbackErrors.length) console.error('Ошибка отката настроек:', rollbackErrors);
    if (rollbackErrors.length || (themeAttempted && !themeSnapshot)) error.partialReset = true;
    throw error;
  }
};

export const loadTheme = async () => {
  try {
    const record = await readThemeRecord();
    return record.exists ? record.value || null : null;
  } catch (error) {
    console.error('Ошибка загрузки темы:', error);
    return null;
  }
};
