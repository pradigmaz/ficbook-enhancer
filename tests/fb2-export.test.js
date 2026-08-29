import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeFb2 } from '../src/features/fb2.js';
import { getChapterLinks, getRetryDelayMs, getWorkUrl } from '../src/features/fb2Export.js';
import { canCloseExportPanel, protectExportNavigation, warnBeforeExportUnload } from '../src/features/exportNavigation.js';

test('accepts only a Ficbook work or chapter URL from the current origin', () => {
  assert.equal(
    getWorkUrl('https://ficbook.net/readfic/1671369/14627113#part_content', 'https://ficbook.net'),
    'https://ficbook.net/readfic/1671369',
  );
  assert.equal(
    getWorkUrl('https://ficbook.net/readfic/01974ade-1bee-7811-a92a-e9ee2898d526/39897833#part_content', 'https://ficbook.net'),
    'https://ficbook.net/readfic/01974ade-1bee-7811-a92a-e9ee2898d526',
  );
  assert.equal(
    getWorkUrl('https://ficbook.net/readfic/01974ade-1bee-7811-a92a-e9ee2898d526?from_promo=1', 'https://ficbook.net'),
    'https://ficbook.net/readfic/01974ade-1bee-7811-a92a-e9ee2898d526',
  );
  assert.equal(getWorkUrl('https://ficbook.net/readfic/1671369', 'https://ficbook.net'), 'https://ficbook.net/readfic/1671369');
  assert.equal(getWorkUrl('https://example.test/readfic/1671369', 'https://ficbook.net'), null);
  assert.equal(getWorkUrl('https://ficbook.net/readfic/1671369/comments', 'https://ficbook.net'), null);
  assert.equal(getWorkUrl('https://ficbook.net/readfic/01974ade-1bee-7811-a92a-e9ee2898d526/comments', 'https://ficbook.net'), null);
});

test('uses Retry-After before falling back to a safe rate-limit pause', () => {
  assert.equal(getRetryDelayMs('5', 0), 5000);
  assert.equal(getRetryDelayMs('Thu, 01 Jan 1970 00:00:10 GMT', 0), 10000);
  assert.equal(getRetryDelayMs(null, 0), 15000);
});

test('keeps UUID work chapters when collecting export links', () => {
  const workUrl = 'https://ficbook.net/readfic/01974ade-1bee-7811-a92a-e9ee2898d526';
  const anchor = (href, title) => ({
    getAttribute: () => href,
    querySelector: () => ({ textContent: title }),
    textContent: title,
  });
  const documentNode = {
    querySelectorAll: () => [
      anchor('/readfic/01974ade-1bee-7811-a92a-e9ee2898d526/39897833#part_content', 'Глава 1'),
      anchor('/readfic/01974ade-1bee-7811-a92a-e9ee2898d526/39897833#part_content', 'Дубль'),
      anchor('/readfic/other-work/39897834#part_content', 'Другая работа'),
    ],
  };

  assert.deepEqual(getChapterLinks(documentNode, workUrl), [{
    url: 'https://ficbook.net/readfic/01974ade-1bee-7811-a92a-e9ee2898d526/39897833',
    title: 'Глава 1',
  }]);
});

test('opens normal navigation in a new tab while export is active', () => {
  const makeEvent = ({ href, target, download = false, modifier = false }) => {
    const actions = { prevented: false, stopped: false };
    const link = {
      href,
      getAttribute: (name) => (name === 'target' ? target : name === 'href' ? href : null),
      hasAttribute: (name) => name === 'download' && download,
    };
    return {
      actions,
      event: {
        button: 0,
        ctrlKey: modifier,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        target: { closest: () => link },
        preventDefault: () => { actions.prevented = true; },
        stopPropagation: () => { actions.stopped = true; },
      },
    };
  };
  const pageUrl = 'https://ficbook.net/readfic/1671369';
  const { event, actions } = makeEvent({ href: 'https://ficbook.net/readfic/1671370' });
  const newTab = { opener: {} };
  const opened = [];

  assert.equal(protectExportNavigation(event, pageUrl, (url) => {
    opened.push(url);
    return newTab;
  }), true);
  assert.deepEqual(opened, ['https://ficbook.net/readfic/1671370']);
  assert.equal(newTab.opener, null);
  assert.deepEqual(actions, { prevented: true, stopped: true });

  for (const options of [
    { href: 'https://ficbook.net/readfic/1671369#part_content' },
    { href: 'https://ficbook.net/readfic/1671370', modifier: true },
    { href: 'https://ficbook.net/readfic/1671370', download: true },
    { href: 'https://ficbook.net/readfic/1671370', target: '_blank' },
  ]) {
    const ignored = makeEvent(options);
    assert.equal(protectExportNavigation(ignored.event, pageUrl, () => newTab), false);
    assert.deepEqual(ignored.actions, { prevented: false, stopped: false });
  }

  const blocked = makeEvent({ href: 'https://ficbook.net/readfic/1671370' });
  assert.equal(protectExportNavigation(blocked.event, pageUrl, () => null), false);
  assert.deepEqual(blocked.actions, { prevented: false, stopped: false });
});

test('warns before closing an active export panel or unloading its page', () => {
  let prompt = '';
  assert.equal(canCloseExportPanel(false, () => { throw new Error('not needed'); }), true);
  assert.equal(canCloseExportPanel(true, (message) => {
    prompt = message;
    return false;
  }), false);
  assert.match(prompt, /Экспорт FB2 ещё идёт/);
  assert.equal(canCloseExportPanel(true, () => true), true);

  const event = {
    prevented: false,
    preventDefault() { this.prevented = true; },
  };
  warnBeforeExportUnload(event);
  assert.equal(event.prevented, true);
  assert.equal(event.returnValue, '');
});

test('serializes escaped metadata and normalized FB2 paragraphs', () => {
  const fb2 = serializeFb2({
    work: {
      id: '1671369',
      title: 'Работа & <черновик>',
      author: 'Автор & Соавтор',
      sourceUrl: 'https://ficbook.net/readfic/1671369',
    },
    chapters: [{
      title: 'Глава <1>',
      blocks: [
        { type: 'paragraph', inlines: [{ type: 'text', value: 'Текст & <разметка>' }] },
        { type: 'paragraph', inlines: [{ type: 'strong', children: [{ type: 'text', value: 'Выделено' }] }] },
        { type: 'paragraph', inlines: [{ type: 'emphasis', children: [{ type: 'text', value: 'Курсив' }] }] },
      ],
    }],
    generatedAt: '2026-08-29',
  });

  assert.match(fb2, /<book-title>Работа &amp; &lt;черновик&gt;<\/book-title>/);
  assert.match(fb2, /<p>Глава &lt;1&gt;<\/p>/);
  assert.match(fb2, /<p>Текст &amp; &lt;разметка&gt;<\/p>/);
  assert.match(fb2, /<strong>Выделено<\/strong>/);
  assert.match(fb2, /<emphasis>Курсив<\/emphasis>/);
  assert.doesNotMatch(fb2, /Работа & <черновик>/);
  assert.doesNotMatch(fb2, /<annotation>/);
});

test('serializes a compact Ficbook annotation without binary assets', () => {
  const fb2 = serializeFb2({
    work: {
      id: '1671369',
      title: 'Работа',
      author: 'Автор',
      sourceUrl: 'https://ficbook.net/readfic/1671369',
      annotation: {
        fandom: 'Школа волшебниц & <кроссовер>',
        club: 'Клуб фикса',
        direction: 'Джен',
        rating: 'R',
        status: 'Заморожен',
        pairing: 'ОМП, ОЖП',
        size: '59 страниц, 17 171 слово, 7 частей',
        genres: 'AU, Попаданчество',
        warnings: 'Нецензурная лексика, 18+',
        intermediate: 'Элементы гета',
        description: 'Короткое описание работы.',
        notes: 'Авторские примечания.',
        request: 'Работа по заявке.',
        publication: 'Уточнять у автора.',
      },
    },
    chapters: [],
    generatedAt: '2026-08-29',
  });

  assert.match(fb2, /<annotation>\s*<p><strong>Автор:<\/strong> Автор<\/p>/);
  assert.match(fb2, /<annotation>[\s\S]*<strong>Фэндом:<\/strong> Школа волшебниц &amp; &lt;кроссовер&gt;/);
  assert.match(fb2, /<strong>Рейтинг:<\/strong> R/);
  assert.match(fb2, /<strong>Промежуточные направленности и жанры:<\/strong> Элементы гета/);
  assert.match(fb2, /<strong>Описание:<\/strong> Короткое описание работы\./);
  assert.match(fb2, /<strong>Работа написана по заявке:<\/strong> Работа по заявке\./);
  assert.match(fb2, /<strong>Публикация на других ресурсах:<\/strong> Уточнять у автора\./);
  assert.doesNotMatch(fb2, /<(?:binary|image)\b|ficbook_logo/);
});

test('omits empty optional annotation fields', () => {
  const fb2 = serializeFb2({
    work: {
      id: '1',
      title: 'Работа',
      author: 'Автор',
      sourceUrl: 'https://ficbook.net/readfic/1',
      annotation: { fandom: '', description: 'Только описание.' },
    },
    chapters: [],
    generatedAt: '2026-08-29',
  });

  assert.match(fb2, /<strong>Описание:<\/strong> Только описание\./);
  assert.doesNotMatch(fb2, /<strong>Фэндом:<\/strong>|<strong>Клуб фикса:<\/strong>/);
});
