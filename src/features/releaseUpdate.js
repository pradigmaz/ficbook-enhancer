export const RELEASES_URL = 'https://github.com/pradigmaz/ficbook-enhancer/releases';
export const RELEASE_UPDATE_MESSAGE = 'fbe:check-release-update';
export const RELEASE_CACHE_KEY = 'fbe_release_check';
export const RELEASE_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

const RELEASE_TAG_PATTERN = /^v?(\d+(?:\.\d+){0,3})$/;

export const normalizeReleaseVersion = (tagName) => {
  if (typeof tagName !== 'string') return null;
  return tagName.trim().match(RELEASE_TAG_PATTERN)?.[1] || null;
};

const getVersionParts = (version) => {
  const normalized = normalizeReleaseVersion(version);
  return normalized ? normalized.split('.').map(Number) : null;
};

export const isReleaseNewer = (candidate, installed) => {
  const candidateParts = getVersionParts(candidate);
  const installedParts = getVersionParts(installed);
  if (!candidateParts || !installedParts) return false;

  for (let index = 0; index < 4; index += 1) {
    const difference = (candidateParts[index] || 0) - (installedParts[index] || 0);
    if (difference) return difference > 0;
  }
  return false;
};

export const createReleaseUpdate = (tagName, installedVersion) => {
  const version = normalizeReleaseVersion(tagName);
  if (!version || !isReleaseNewer(version, installedVersion)) return null;

  return {
    version,
    url: `${RELEASES_URL}/tag/${encodeURIComponent(tagName.trim())}`,
  };
};
