import { serializeFb2 } from './fb2.js';

const PART_CONTENT_SELECTOR = '#content.part_text[itemprop="articleBody"]';
const NOISE_SELECTOR = 'script, style, noscript, .fanfic-text-promo, [data-place-id]';
const CONTAINER_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'LI', 'UL', 'OL']);
const PARAGRAPH_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
const CHAPTER_REQUEST_PAUSE_MS = 2000;
const RATE_LIMIT_FALLBACK_MS = 15000;
const MAX_RATE_LIMIT_ATTEMPTS = 3;
const WORK_ID_PATH = '(?:\\d+|[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})';
const WORK_URL_PATH = new RegExp(`^/readfic/(${WORK_ID_PATH})(?:/\\d+)?/?$`, 'i');
const CHAPTER_URL_PATH = new RegExp(`^/readfic/(${WORK_ID_PATH})/(\\d+)$`, 'i');

export const getWorkUrl = (pageUrl, expectedOrigin) => {
  try {
    const url = new URL(pageUrl);
    if (url.origin !== expectedOrigin) return null;
    const match = url.pathname.match(WORK_URL_PATH);
    return match ? `${url.origin}/readfic/${match[1]}` : null;
  } catch {
    return null;
  }
};

const getText = (node) => node?.textContent?.replace(/\s+/g, ' ').trim() || '';

const getInfoValue = (documentNode, label) => {
  const labelNode = [...documentNode.querySelectorAll('div.mb-10 > strong')]
    .find((node) => getText(node) === label);
  const value = getText(labelNode?.parentElement);
  return value.startsWith(label) ? value.slice(label.length).trim() : '';
};

const extractWorkAnnotation = (documentNode) => {
  const badges = documentNode.querySelector('.fanfic-badges');
  return {
    fandom: getInfoValue(documentNode, 'Фэндом:'),
    club: getInfoValue(documentNode, 'Клуб фикса:'),
    direction: getText(badges?.querySelector('[class*="direction-"]')),
    rating: getText(badges?.querySelector('[class*="ds-label-rating-"]')),
    status: getText(badges?.querySelector('[class*="ds-label-status-"]')),
    pairing: getInfoValue(documentNode, 'Пэйринг и персонажи:'),
    size: getInfoValue(documentNode, 'Размер:'),
    genres: getInfoValue(documentNode, 'Жанры:'),
    warnings: getInfoValue(documentNode, 'Предупреждения:'),
    intermediate: getInfoValue(documentNode, 'Промежуточные направленности и жанры:'),
    description: getInfoValue(documentNode, 'Описание:'),
    notes: getInfoValue(documentNode, 'Примечания:'),
    request: getInfoValue(documentNode, 'Работа написана по заявке:'),
    publication: getInfoValue(documentNode, 'Публикация на других ресурсах:'),
  };
};

export const getRetryDelayMs = (retryAfter, now = Date.now()) => {
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;

  const retryAt = Date.parse(retryAfter ?? '');
  if (Number.isFinite(retryAt) && retryAt > now) return retryAt - now;
  return RATE_LIMIT_FALLBACK_MS;
};

const waitWithCountdown = (delayMs, onWait) => new Promise((resolve) => {
  const endsAt = Date.now() + delayMs;
  const notify = () => onWait?.(Math.max(1, Math.ceil((endsAt - Date.now()) / 1000)));
  notify();
  const timer = window.setInterval(notify, 1000);
  window.setTimeout(() => {
    window.clearInterval(timer);
    resolve();
  }, delayMs);
});

const yieldToBrowser = () => new Promise((resolve) => window.setTimeout(resolve, 0));

const fetchDocument = async (url, onRateLimit) => {
  for (let attempt = 0; attempt < MAX_RATE_LIMIT_ATTEMPTS; attempt += 1) {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (response.status === 429) {
      if (attempt === MAX_RATE_LIMIT_ATTEMPTS - 1) {
        throw new Error('Ficbook временно ограничил запросы. Попробуйте позже.');
      }
      await waitWithCountdown(
        getRetryDelayMs(response.headers.get('Retry-After')),
        (seconds) => onRateLimit?.({ seconds, rateLimited: true }),
      );
      continue;
    }
    if (!response.ok) throw new Error(`Не удалось получить страницу (${response.status}).`);
    return new DOMParser().parseFromString(await response.text(), 'text/html');
  }

  throw new Error('Не удалось получить страницу.');
};

export const getChapterLinks = (documentNode, workUrl) => {
  const workId = new URL(workUrl).pathname.split('/')[2];
  const seen = new Set();

  return [...documentNode.querySelectorAll('a.part-link[href*="#part_content"]')].flatMap((anchor) => {
    const href = anchor.getAttribute('href');
    if (!href) return [];

    const url = new URL(href, workUrl);
    const path = url.pathname.match(CHAPTER_URL_PATH);
    if (url.origin !== new URL(workUrl).origin || !path || path[1] !== workId) return [];

    url.hash = '';
    if (seen.has(url.href)) return [];
    seen.add(url.href);
    return [{ url: url.href, title: getText(anchor.querySelector('h3')) || getText(anchor) }];
  });
};

const inlineNodes = (nodes) => [...nodes].flatMap((node) => {
  if (node.nodeType === 3) return [{ type: 'text', value: node.nodeValue }];
  if (node.nodeType !== 1) return [];

  const children = inlineNodes(node.childNodes);
  if (node.tagName === 'BR') return [{ type: 'break' }];
  if (node.tagName === 'B' || node.tagName === 'STRONG') return children.length ? [{ type: 'strong', children }] : [];
  if (node.tagName === 'I' || node.tagName === 'EM') return children.length ? [{ type: 'emphasis', children }] : [];
  return children;
});

const normalizeInlines = (items) => {
  const normalized = [];
  for (const item of items) {
    if (item.type === 'text') {
      const value = String(item.value ?? '').replace(/\s+/g, ' ');
      if (!value) continue;
      const previous = normalized.at(-1);
      if (previous?.type === 'text') previous.value += value;
      else normalized.push({ type: 'text', value });
      continue;
    }
    if (item.type === 'break') {
      if (normalized.at(-1)?.type !== 'break') normalized.push(item);
      continue;
    }

    const children = normalizeInlines(item.children ?? []);
    if (children.length) normalized.push({ ...item, children });
  }

  while (normalized[0]?.type === 'text' && !normalized[0].value.trim()) normalized.shift();
  if (normalized[0]?.type === 'text') normalized[0].value = normalized[0].value.trimStart();
  while (normalized.at(-1)?.type === 'text' && !normalized.at(-1).value.trim()) normalized.pop();
  if (normalized.at(-1)?.type === 'text') normalized.at(-1).value = normalized.at(-1).value.trimEnd();
  return normalized;
};

const extractBlocks = (content) => {
  const root = content.cloneNode(true);
  root.querySelectorAll(NOISE_SELECTOR).forEach((node) => node.remove());

  const blocks = [];
  let pending = [];
  const flush = () => {
    const inlines = normalizeInlines(pending);
    if (inlines.length) blocks.push({ type: 'paragraph', inlines });
    pending = [];
  };
  const appendText = (value) => {
    const lines = String(value ?? '').replace(/\r/g, '').split('\n');
    let previousLineHadText = false;
    for (const line of lines) {
      const text = line.trim();
      if (!text) {
        flush();
        previousLineHadText = false;
        continue;
      }
      if (previousLineHadText) pending.push({ type: 'break' });
      pending.push({ type: 'text', value: text });
      previousLineHadText = true;
    }
  };
  const visit = (node) => {
    if (node.nodeType === 3) {
      appendText(node.nodeValue);
      return;
    }
    if (node.nodeType !== 1 || node.matches(NOISE_SELECTOR)) return;
    if (node.tagName === 'BR') {
      flush();
      return;
    }
    if (PARAGRAPH_TAGS.has(node.tagName)) {
      flush();
      const inlines = normalizeInlines(inlineNodes(node.childNodes));
      if (inlines.length) blocks.push({ type: 'paragraph', inlines });
      return;
    }
    if (CONTAINER_TAGS.has(node.tagName)) {
      flush();
      node.childNodes.forEach(visit);
      flush();
      return;
    }
    pending.push(...inlineNodes([node]));
  };

  root.childNodes.forEach(visit);
  flush();
  return blocks;
};

const extractWork = (documentNode, workUrl) => {
  const title = getText(documentNode.querySelector('h1.heading'));
  if (!title) throw new Error('Не удалось определить название работы.');
  return {
    id: new URL(workUrl).pathname.split('/')[2],
    title,
    author: getText(documentNode.querySelector('[itemprop="author"]')),
    sourceUrl: workUrl,
    annotation: extractWorkAnnotation(documentNode),
  };
};

const extractChapter = (documentNode, fallbackTitle) => {
  const content = documentNode.querySelector(PART_CONTENT_SELECTOR);
  if (!content) throw new Error('Текст одной из глав не найден.');
  const blocks = extractBlocks(content);
  if (!blocks.length) throw new Error('Одна из глав не содержит текста.');
  return {
    title: getText(documentNode.querySelector('#part_content [itemprop="headline"]')) || fallbackTitle,
    blocks,
  };
};

const download = (contents, fileName) => {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/x-fictionbook+xml;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.documentElement.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const fileNameFor = (title, workId) => {
  const cleanTitle = title
    .replace(/[<>:"/\\|?*]/g, '')
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return `${cleanTitle || `ficbook-${workId}`}.fb2`;
};

// ponytail: text and inline formatting only; add cover/illustration binaries after an explicit asset policy.
export const exportCurrentWorkToFb2 = async ({ pageUrl = window.location.href, origin = window.location.origin, onProgress, onWait } = {}) => {
  const workUrl = getWorkUrl(pageUrl, origin);
  if (!workUrl) throw new Error('Откройте страницу работы или её главы на Ficbook.');

  const workDocument = await fetchDocument(workUrl, onWait);
  const work = extractWork(workDocument, workUrl);
  const chapterLinks = getChapterLinks(workDocument, workUrl);
  if (!chapterLinks.length) throw new Error('В оглавлении не найдены главы.');

  const chapters = [];
  onProgress?.({ completed: 0, total: chapterLinks.length, phase: 'collecting' });
  for (const [index, chapterLink] of chapterLinks.entries()) {
    await waitWithCountdown(
      CHAPTER_REQUEST_PAUSE_MS,
      (seconds) => onWait?.({ seconds, rateLimited: false }),
    );
    const chapterDocument = await fetchDocument(chapterLink.url, onWait);
    chapters.push(extractChapter(chapterDocument, chapterLink.title));
    onProgress?.({ completed: index + 1, total: chapterLinks.length, phase: 'collecting' });
  }

  onProgress?.({ completed: chapters.length, total: chapterLinks.length, phase: 'serializing' });
  await yieldToBrowser();
  const fb2 = serializeFb2({ work, chapters });
  download(fb2, fileNameFor(work.title, work.id));
  return { title: work.title, chapterCount: chapters.length, total: chapterLinks.length };
};
