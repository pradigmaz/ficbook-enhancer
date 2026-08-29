import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_GENRE_SECTION_CLASS,
  generateChapterPromoStyles,
  generateGenreStyles,
  syncEmptyGenreSections,
} from '../src/features/selectors.js';

test('genre styles cover current and legacy fanfiction card badges only', () => {
  const styles = generateGenreStyles({ slash: true });

  assert.match(styles, /article\.fanfic-inline:has\(\.small-direction-slash\)/);
  assert.match(styles, /article\.fanfic-inline:has\(\.direction-slash\)/);
  assert.match(styles, /a\.fanfic-promo-item\.direction-slash/);
  assert.match(styles, /\.request-card:has\(\.small-direction-slash\)/);
  assert.doesNotMatch(styles, /helper|Помощник/i);
});

test('chapter promo styles hide only inline promo cards', () => {
  const styles = generateChapterPromoStyles(true);

  assert.match(styles, /^\.fanfic-text-promo \{ display: none !important; \}\n$/);
  assert.doesNotMatch(styles, /fanfic-promo-carousel/);
  assert.equal(generateChapterPromoStyles(false), '');
});

test('genre styles collapse empty promo and hot sections', () => {
  const styles = generateGenreStyles({ gen: true, slash: true });
  const hiddenClasses = new Set();
  const hotWorks = {
    classList: {
      toggle: (name, hidden) => {
        if (hidden) hiddenClasses.add(name);
        else hiddenClasses.delete(name);
      },
    },
    querySelector: (selector) => selector === ':scope > .heading' ? { textContent: 'Горячие работы' } : null,
    querySelectorAll: (selector) => selector === ':scope > article.fanfic-inline' ? [
      { querySelector: (badge) => badge.includes('.small-direction-gen') },
      { querySelector: (badge) => badge.includes('.direction-slash') },
    ] : [],
  };
  const root = {
    querySelectorAll: (selector) => selector === 'section' ? [hotWorks] : [],
  };

  syncEmptyGenreSections({ gen: true, slash: true }, root);

  assert.match(styles, /\.fanfic-promo-carousel:has\(a\.fanfic-promo-item\)/);
  assert.match(styles, new RegExp(`\\.${EMPTY_GENRE_SECTION_CLASS} \\{ display: none !important; \\}`));
  assert.equal(hiddenClasses.has(EMPTY_GENRE_SECTION_CLASS), true);

  syncEmptyGenreSections({}, root);
  assert.equal(hiddenClasses.has(EMPTY_GENRE_SECTION_CLASS), false);
});
