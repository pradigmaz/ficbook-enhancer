const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

export const getHttpUrlError = (value) => {
  const urlValue = String(value ?? '').trim();
  if (!urlValue) return '';

  try {
    return HTTP_PROTOCOLS.has(new URL(urlValue).protocol)
      ? ''
      : 'Используйте ссылку, начинающуюся с http:// или https://.';
  } catch {
    return 'Введите корректную ссылку.';
  }
};
