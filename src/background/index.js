import {
  RELEASE_CACHE_KEY,
  RELEASE_CHECK_INTERVAL_MS,
  RELEASE_UPDATE_MESSAGE,
  createReleaseUpdate,
} from '../features/releaseUpdate.js';

const RELEASE_API_URL = 'https://api.github.com/repos/pradigmaz/ficbook-enhancer/releases/latest';

const readCachedTag = async (installedVersion) => {
  try {
    const cache = (await globalThis.chrome.storage.local.get(RELEASE_CACHE_KEY))[RELEASE_CACHE_KEY];
    const age = Date.now() - cache?.checkedAt;
    if (!Number.isFinite(age) || age < 0 || age >= RELEASE_CHECK_INTERVAL_MS || cache.installedVersion !== installedVersion) return null;
    return { hit: true, tagName: typeof cache.tagName === 'string' ? cache.tagName : null };
  } catch {
    return null;
  }
};

const saveCachedTag = async (tagName, installedVersion) => {
  try {
    await globalThis.chrome.storage.local.set({ [RELEASE_CACHE_KEY]: { checkedAt: Date.now(), tagName, installedVersion } });
  } catch {
    // The update check still works when browser storage is temporarily unavailable.
  }
};

const fetchLatestReleaseTag = async () => {
  try {
    const response = await fetch(RELEASE_API_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return null;
    const release = await response.json();
    return typeof release?.tag_name === 'string' ? release.tag_name : null;
  } catch {
    return null;
  }
};

const getLatestReleaseTag = async (installedVersion) => {
  const cached = await readCachedTag(installedVersion);
  if (cached?.hit) return cached.tagName;

  const tagName = await fetchLatestReleaseTag();
  await saveCachedTag(tagName, installedVersion);
  return tagName;
};

globalThis.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== globalThis.chrome.runtime.id || message?.type !== RELEASE_UPDATE_MESSAGE) return;

  const installedVersion = globalThis.chrome.runtime.getManifest().version;
  void getLatestReleaseTag(installedVersion).then(
    (tagName) => sendResponse({ update: createReleaseUpdate(tagName, installedVersion) }),
    () => sendResponse({ update: null }),
  );
  return true;
});
