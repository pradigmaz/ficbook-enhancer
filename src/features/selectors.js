// src/features/selectors.js

// Селекторы премиум-функций (анализ source: 11, 14, 54, 84, 216)
export const PREMIUM_SELECTORS = [
  '.btn-on-book-background--premium', // Кнопка в шапке 
  '.premium-button',                  // Пункт в меню профиля 
  '.discount-modal-btn',              // Кнопка скидок в шапке
  '.discount-sticky',                 // Плашка скидок сбоку
  '.discount-sticky-container',       // Старая обёртка плашки скидок
  '.discount-modal',                  // Модалка скидок 
  '.hot-fanfic',                      // Значок "Горячая работа" в списке 
  '.main-discount'                    // Старая кнопка скидок в шапке
];

export const CHAPTER_PROMO_SELECTOR = '.fanfic-text-promo';
export const EMPTY_GENRE_SECTION_CLASS = 'fbe-empty-genre-section';

export const generateHideStyles = (hidePremium) => (
  hidePremium ? `${PREMIUM_SELECTORS.join(', ')} { display: none !important; }\n` : ''
);

export const generateChapterPromoStyles = (hideChapterPromo) => (
  hideChapterPromo ? `${CHAPTER_PROMO_SELECTOR} { display: none !important; }\n` : ''
);

export const parseHiddenGenres = (serialized, allowedGenreIds = []) => {
  if (!serialized) return {};

  try {
    const parsed = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const allowed = new Set(allowedGenreIds);
    const entries = Object.entries(parsed);
    if (entries.some(([genre, isHidden]) => !allowed.has(genre) || typeof isHidden !== 'boolean')) {
      return {};
    }

    return Object.fromEntries(entries);
  } catch {
    return {};
  }
};

const getHiddenGenreIds = (hiddenGenres) => (
  hiddenGenres && typeof hiddenGenres === 'object' && !Array.isArray(hiddenGenres)
    ? Object.entries(hiddenGenres).filter(([, isHidden]) => isHidden).map(([genre]) => genre)
    : []
);

export const syncEmptyGenreSections = (hiddenGenres = {}, root = document) => {
  const hiddenGenreIds = getHiddenGenreIds(hiddenGenres);

  root.querySelectorAll('section').forEach((section) => {
    const title = section.querySelector(':scope > .heading')?.textContent.trim();
    const requestSection = title === 'Горячие заявки';
    const cardSelector = title === 'Горячие работы'
      ? ':scope > article.fanfic-inline'
      : requestSection ? ':scope > .request-card' : '';
    if (!cardSelector) return;

    const markerPrefixes = requestSection ? ['small-direction-', 'ic_'] : ['small-direction-', 'direction-'];
    const cards = [...section.querySelectorAll(cardSelector)];
    const allCardsHidden = hiddenGenreIds.length > 0 && cards.length > 0 && cards.every((card) => (
      hiddenGenreIds.some((genre) => markerPrefixes.some((prefix) => card.querySelector(`.${prefix}${genre}`)))
    ));
    section.classList.toggle(EMPTY_GENRE_SECTION_CLASS, allCardsHidden);
  });
};

export const generateGenreStyles = (hiddenGenres = {}) => {
  const hiddenGenreIds = getHiddenGenreIds(hiddenGenres);
  if (!hiddenGenreIds.length) return '';

  const cardStyles = hiddenGenreIds.map((genre) => (
    `article.fanfic-inline:has(.small-direction-${genre}), article.fanfic-inline:has(.direction-${genre}), a.fanfic-promo-item.direction-${genre}, .request-card:has(.small-direction-${genre}), .request-card:has(.ic_${genre}) { display: none !important; }`
  )).join('\n');
  const visiblePromoCard = `a.fanfic-promo-item:not(${hiddenGenreIds.map((genre) => `.direction-${genre}`).join(', ')})`;

  return `${cardStyles}\n.fanfic-promo-carousel:has(a.fanfic-promo-item):not(:has(${visiblePromoCard})) { display: none !important; }\n.${EMPTY_GENRE_SECTION_CLASS} { display: none !important; }`;
};
