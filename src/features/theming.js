// src/features/theming.js
import { generateChapterPromoStyles, generateGenreStyles, generateHideStyles, syncEmptyGenreSections } from './selectors.js';

const FONT_FORMAT_BY_EXTENSION = {
  ttf: 'truetype',
  otf: 'opentype',
  woff: 'woff',
  woff2: 'woff2',
};

const FONT_FORMAT_BY_MIME = {
  'font/ttf': 'truetype',
  'application/x-font-ttf': 'truetype',
  'font/otf': 'opentype',
  'application/x-font-opentype': 'opentype',
  'font/woff': 'woff',
  'application/font-woff': 'woff',
  'font/woff2': 'woff2',
};

const VALID_FONT_FORMATS = new Set(Object.values(FONT_FORMAT_BY_EXTENSION));

export const resolveFontFormat = ({ fileName = '', mimeType = '', dataUrl = '', format = '' } = {}) => {
  if (VALID_FONT_FORMATS.has(format)) return format;

  const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (extension && FONT_FORMAT_BY_EXTENSION[extension]) return FONT_FORMAT_BY_EXTENSION[extension];

  const dataMime = dataUrl.match(/^data:([^;,]+)/i)?.[1];
  for (const mime of [mimeType, dataMime]) {
    const format = FONT_FORMAT_BY_MIME[mime?.toLowerCase()];
    if (format) return format;
  }
  return null;
};

const generateThemeStyleSections = (theme) => {
  let imports = '';
  let rules = '';
  const DEFAULT_STACK = '"YS Text", Helvetica, Arial, sans-serif';

  // --- 1. ФОН ---
  const activeBg = theme.bgType === 'file' ? theme.bgFile : theme.bgUrl;

  if (theme.bgType !== 'none' && activeBg) {
    rules += `
      body, body.dark-theme {
        background-image: url('${activeBg}'), linear-gradient(rgba(20, 20, 20, 0.72), rgba(20, 20, 20, 0.72)), url('${activeBg}') !important;
        background-repeat: no-repeat !important;
        background-attachment: fixed !important;
        background-position: center center !important;
        background-size: contain, 100% 100%, cover !important;
      }
      .main-holder, .book-container, .modal-content,
      .part_text, .js-public-beta-container,
      .fanfic-promo-grid, .home-promo, .categories-block {
        background-color: rgba(255, 255, 255, 0.90) !important;
        backdrop-filter: blur(5px);
      }
      body.dark-theme .main-holder,
      body.dark-theme .book-container,
      body.dark-theme .modal-content,
      body.dark-theme .part_text,
      body.dark-theme .js-public-beta-container,
      body.dark-theme .fanfic-promo-grid,
      body.dark-theme .home-promo,
      body.dark-theme .categories-block {
        background-color: rgba(30, 30, 30, 0.90) !important;
        backdrop-filter: blur(5px);
      }
      .part-wrapper, .global-banner-2 { background: transparent !important; }
    `;
  }

  // --- 2. ШРИФТЫ ---
  const { fontType, fontName, fontUrl, fontFile, fontFormat } = theme;

  if (fontType === 'url' && fontUrl) {
    imports += `@import url('${fontUrl}');\n`;
  }

  if (fontType === 'file' && fontFile) {
    const format = resolveFontFormat({ dataUrl: fontFile, format: fontFormat });
    const formatHint = format ? ` format('${format}')` : '';
    rules += `
      @font-face {
        font-family: 'MyCustomFont';
        src: url('${fontFile}')${formatHint};
        font-weight: normal; font-style: normal;
      }
    `;
  }

  let siteFontFamily = '';

  if (fontType === 'name') {
    siteFontFamily = fontName;
  } else if (fontType === 'url') {
    siteFontFamily = fontName ? `'${fontName}', sans-serif` : '';
  } else if (fontType === 'file') {
    siteFontFamily = "'MyCustomFont', sans-serif";
  }

  if (siteFontFamily && siteFontFamily !== DEFAULT_STACK) {
    rules += `
      body, p, div, span, a, button, input, textarea,
      .text-content, h1, h2, h3, h4,
      .part_text, .text-t1, .text-t2, .text-n1 {
        font-family: ${siteFontFamily} !important;
      }
    `;
  }

  // --- ЗАЩИТА ИНТЕРФЕЙСА (ПРИМЕНЯЕТСЯ ВСЕГДА) ---
  rules += `
    #ficbook-enhancer-root,
    #ficbook-enhancer-root * {
      font-family: "YS Text", Helvetica, Arial, sans-serif !important;
    }
  `;

  return { imports, rules };
};

export const generateThemeStyles = (theme) => { const { imports, rules } = generateThemeStyleSections(theme); return imports + rules; };

export const composePageStyles = ({ theme, hidePremium, hideChapterPromo, hiddenGenres }) => {
  const { imports, rules } = generateThemeStyleSections(theme);
  return [
    imports,
    rules,
    generateHideStyles(hidePremium),
    generateChapterPromoStyles(hideChapterPromo),
    generateGenreStyles(hiddenGenres),
  ].filter(Boolean).join('\n');
};

export const applyPageStyles = (settings) => {
  const styleId = 'fbe-styles';
  let styleTag = document.getElementById(styleId);
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    (document.head || document.documentElement).appendChild(styleTag);
  }
  styleTag.textContent = composePageStyles(settings);
  syncEmptyGenreSections(settings.hiddenGenres);
};
