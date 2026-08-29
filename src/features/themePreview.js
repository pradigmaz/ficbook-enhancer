const PREVIEW_STORAGE_KEY = 'fbe_themePreview';
const PREVIEW_MAX_EDGE = 480;
const PREVIEW_QUALITY = 0.82;

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isImageDataUrl = (value) => typeof value === 'string' && value.startsWith('data:image/');

const getBackgroundSignature = (theme) => {
  const activeBg = theme?.bgType === 'file' ? theme.bgFile : theme?.bgUrl;
  if (!activeBg) return '';
  return theme.bgType === 'file'
    ? `file:${activeBg.length}:${activeBg.slice(-64)}`
    : `url:${activeBg}`;
};

const readStoredPreview = () => {
  try {
    const preview = JSON.parse(localStorage.getItem(PREVIEW_STORAGE_KEY) || 'null');
    if (!preview || typeof preview !== 'object' || typeof preview.signature !== 'string') return null;
    if (preview.bgType === 'url' && isHttpUrl(preview.bgUrl)) return preview;
    if (preview.bgType === 'file' && isImageDataUrl(preview.bgFile)) return preview;
  } catch {
    // A preview is optional; IndexedDB remains the source of truth.
  }
  return null;
};

const writeStoredPreview = (preview) => {
  try {
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(preview));
  } catch {
    // LocalStorage quota errors must not block the selected theme.
  }
};

export const clearThemePreview = () => {
  try {
    localStorage.removeItem(PREVIEW_STORAGE_KEY);
  } catch {
    // The preview is a best-effort optimization.
  }
};

export const getThemePreview = () => {
  const preview = readStoredPreview();
  if (!preview) return null;
  return preview.bgType === 'file'
    ? { bgType: 'file', bgFile: preview.bgFile }
    : { bgType: 'url', bgUrl: preview.bgUrl };
};

const createImagePreview = (source) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return resolve('');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL('image/jpeg', PREVIEW_QUALITY));
  };
  image.onerror = () => resolve('');
  image.src = source;
});

export const cacheThemePreview = async (theme) => {
  const signature = getBackgroundSignature(theme);
  if (!signature) return clearThemePreview();
  if (readStoredPreview()?.signature === signature) return;

  if (theme.bgType === 'url' && isHttpUrl(theme.bgUrl)) {
    return writeStoredPreview({ bgType: 'url', bgUrl: theme.bgUrl, signature });
  }

  if (theme.bgType !== 'file' || !isImageDataUrl(theme.bgFile)) return clearThemePreview();
  clearThemePreview();
  const bgFile = await createImagePreview(theme.bgFile);
  if (bgFile) writeStoredPreview({ bgType: 'file', bgFile, signature });
};
