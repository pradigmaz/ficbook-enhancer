const XML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export const escapeXml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => XML_ENTITIES[character]);

export const ANNOTATION_FIELDS = [
  ['Автор', 'author'],
  ['Фэндом', 'fandom'],
  ['Клуб фикса', 'club'],
  ['Направленность', 'direction'],
  ['Рейтинг', 'rating'],
  ['Статус', 'status'],
  ['Пэйринг и персонажи', 'pairing'],
  ['Размер', 'size'],
  ['Жанры', 'genres'],
  ['Предупреждения', 'warnings'],
  ['Промежуточные направленности и жанры', 'intermediate'],
  ['Описание', 'description'],
  ['Примечания', 'notes'],
  ['Работа написана по заявке', 'request'],
  ['Публикация на других ресурсах', 'publication'],
];

const renderAnnotation = (annotation) => {
  const paragraphs = ANNOTATION_FIELDS.flatMap(([label, key]) => {
    const value = String(annotation?.[key] ?? '').trim();
    return value ? [`        <p><strong>${label}:</strong> ${escapeXml(value)}</p>`] : [];
  });
  return paragraphs.length ? `\n      <annotation>\n${paragraphs.join('\n')}\n      </annotation>` : '';
};

const renderInline = (inline) => {
  if (!inline || typeof inline !== 'object') return '';
  if (inline.type === 'text') return escapeXml(inline.value);
  if (inline.type === 'break') return '<br/>';

  const content = (inline.children ?? []).map(renderInline).join('');
  if (!content) return '';
  if (inline.type === 'strong') return `<strong>${content}</strong>`;
  if (inline.type === 'emphasis') return `<emphasis>${content}</emphasis>`;
  return content;
};

const renderChapter = (chapter, index) => {
  const blocks = (chapter.blocks ?? [])
    .filter((block) => block?.type === 'paragraph')
    .map((block) => `<p>${(block.inlines ?? []).map(renderInline).join('')}</p>`)
    .filter((block) => block !== '<p></p>')
    .join('\n      ');
  const title = escapeXml(chapter.title || `Глава ${index + 1}`);

  return [
    `    <section id="chapter-${index + 1}">`,
    `      <title><p>${title}</p></title>`,
    blocks ? `      ${blocks}` : '      <empty-line/>',
    '    </section>',
  ].join('\n');
};

export const serializeFb2 = ({ work, chapters, generatedAt = new Date().toISOString().slice(0, 10) }) => {
  const title = escapeXml(work.title || `Ficbook ${work.id}`);
  const author = escapeXml(work.author || 'Неизвестный автор');
  const sourceUrl = escapeXml(work.sourceUrl);
  const sections = chapters.map(renderChapter).join('\n');
  const annotation = work.annotation ? renderAnnotation({ ...work.annotation, author: work.author }) : '';

  return `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>
    <title-info>
      <genre>other</genre>
      <author><nickname>${author}</nickname></author>
      <book-title>${title}</book-title>${annotation}
      <lang>ru</lang>
    </title-info>
    <document-info>
      <author><nickname>Ficbook Enhancer Pro</nickname></author>
      <program-used>Ficbook Enhancer Pro</program-used>
      <date value="${generatedAt}">${generatedAt}</date>
      <src-url>${sourceUrl}</src-url>
      <id>ficbook-${escapeXml(work.id)}</id>
      <version>1.0</version>
    </document-info>
  </description>
  <body>
${sections}
  </body>
</FictionBook>
`;
};
