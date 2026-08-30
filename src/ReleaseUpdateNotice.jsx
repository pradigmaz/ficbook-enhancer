import { useEffect, useState } from 'react';
import { ArrowUpRight, Github } from 'lucide-react';
import { RELEASE_UPDATE_MESSAGE, RELEASES_URL, normalizeReleaseVersion } from './features/releaseUpdate';

const isTrustedUpdate = (update) => {
  if (typeof update?.version !== 'string' || typeof update?.url !== 'string') return false;
  if (normalizeReleaseVersion(update.version) !== update.version) return false;

  try {
    const url = new URL(update.url);
    return url.origin === 'https://github.com'
      && url.pathname.startsWith('/pradigmaz/ficbook-enhancer/releases/tag/');
  } catch {
    return false;
  }
};

const requestReleaseUpdate = () => new Promise((resolve) => {
  if (!globalThis.chrome?.runtime?.sendMessage) {
    resolve(null);
    return;
  }

  try {
    globalThis.chrome.runtime.sendMessage({ type: RELEASE_UPDATE_MESSAGE }, (response) => {
      if (globalThis.chrome?.runtime?.lastError || !isTrustedUpdate(response?.update)) {
        resolve(null);
        return;
      }
      resolve(response.update);
    });
  } catch {
    resolve(null);
  }
});

export const ReleasesLink = () => (
  <a
    className="fbe-releases-link"
    href={RELEASES_URL}
    target="_blank"
    rel="noreferrer"
    aria-label="Открыть релизы на GitHub"
    title="Открыть релизы на GitHub"
  >
    <Github size={17} aria-hidden="true" />
  </a>
);

const ReleaseUpdateNotice = () => {
  const [update, setUpdate] = useState(null);

  useEffect(() => {
    let active = true;
    void requestReleaseUpdate().then((nextUpdate) => {
      if (active) setUpdate(nextUpdate);
    });
    return () => { active = false; };
  }, []);

  if (!update) return null;
  return (
    <a
      className="fbe-release-notice"
      href={update.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Открыть релиз версии ${update.version} на GitHub`}
    >
      <span>Доступна v{update.version}</span>
      <ArrowUpRight size={16} aria-hidden="true" />
    </a>
  );
};

export default ReleaseUpdateNotice;
