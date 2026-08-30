import { ANNOTATION_FIELDS } from './fb2.js';

const NEWLINE = '\r\n';
const HEADER_RULE = '*'.repeat(95);
const MULTILINE_FIELDS = new Set(['description', 'notes']);

const text = (value) => String(value ?? '').replace(/\r?\n/g, NEWLINE).trim();

const renderInline = (inline) => {
  if (!inline || typeof inline !== 'object') return '';
  if (inline.type === 'text') return String(inline.value ?? '').replace(/\r?\n/g, NEWLINE);
  if (inline.type === 'break') return NEWLINE;
  return (inline.children ?? []).map(renderInline).join('');
};

const renderAnnotation = (work) => {
  const annotation = { author: work.author, ...(work.annotation ?? {}) };
  return ANNOTATION_FIELDS.flatMap(([label, key]) => {
    const value = text(annotation[key]);
    if (!value) return [];
    return MULTILINE_FIELDS.has(key) ? [`${label}:`, value] : [`${label}: ${value}`];
  }).join(NEWLINE);
};

const renderChapter = (chapter, index) => {
  const paragraphs = (chapter.blocks ?? [])
    .filter((block) => block?.type === 'paragraph')
    .map((block) => (block.inlines ?? []).map(renderInline).join('').trim())
    .filter(Boolean)
    .join(`${NEWLINE}${NEWLINE}`);
  const title = text(chapter.title) || `Глава ${index + 1}`;
  return [`========== ${title} ==========`, paragraphs].filter(Boolean).join(`${NEWLINE}${NEWLINE}`);
};

export const serializeTxt = ({ work, chapters }) => {
  const title = text(work?.title) || `Ficbook ${work?.id ?? ''}`.trim();
  const sourceUrl = text(work?.sourceUrl);
  const annotation = renderAnnotation(work ?? {});
  const chapterText = (chapters ?? []).map(renderChapter).join(`${NEWLINE}${NEWLINE}`);

  return [[HEADER_RULE, title, sourceUrl, HEADER_RULE].join(NEWLINE), annotation, chapterText]
    .filter(Boolean)
    .join(`${NEWLINE}${NEWLINE}`)
    .concat(NEWLINE);
};
