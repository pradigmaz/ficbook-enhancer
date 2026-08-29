const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SPRITE_ID = 'fbe-genre-sprite';

export const FICBOOK_GENRE_ICON_IDS = ['ic_gen', 'ic_het', 'ic_slash', 'ic_femslash', 'ic_mixed', 'ic_other', 'ic_article'];

const ALLOWED_TAGS = new Set(['symbol', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'defs', 'clipPath']);
const ALLOWED_ATTRIBUTES = new Set([
  'id', 'viewBox', 'd', 'fill', 'fill-rule', 'clip-rule', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'transform', 'opacity',
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height',
  'points', 'clip-path',
]);
const unavailable = (reason, details = {}) => ({ installed: false, reason, ...details });

const getCurrentFicbookSpriteUrl = () => {
  const href = [...document.querySelectorAll('use')]
    .map((element) => element.getAttribute('href') ?? element.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ?? '')
    .find((value) => FICBOOK_GENRE_ICON_IDS.some((iconId) => value.endsWith(`#${iconId}`)));
  if (!href) return null;

  const url = new URL(href, document.location.href);
  if (url.origin !== document.location.origin || !url.pathname.endsWith('.svg')) return null;
  url.hash = '';
  return url;
};

const copySafeSvgElement = (source) => {
  if (!ALLOWED_TAGS.has(source.localName)) return null;

  const copy = document.createElementNS(SVG_NAMESPACE, source.localName);
  for (const { name, value } of source.attributes) {
    if (ALLOWED_ATTRIBUTES.has(name)) copy.setAttribute(name, value);
  }
  for (const child of source.children) {
    const safeChild = copySafeSvgElement(child);
    if (safeChild) copy.append(safeChild);
  }
  return copy;
};

export const installFicbookGenreSprite = async (shadowRoot) => {
  if (shadowRoot.querySelector(`#${SPRITE_ID}`)) return { installed: true };

  try {
    const spriteUrl = getCurrentFicbookSpriteUrl();
    if (!spriteUrl) return unavailable('sprite-url-missing');

    const response = await fetch(spriteUrl, { credentials: 'omit' });
    if (!response.ok) return unavailable('http-status', { status: response.status });

    const documentNode = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    if (documentNode.querySelector('parsererror')) return unavailable('xml-parse-error');

    const sprite = document.createElementNS(SVG_NAMESPACE, 'svg');
    sprite.id = SPRITE_ID;
    sprite.setAttribute('aria-hidden', 'true');
    sprite.setAttribute('class', 'fbe-genre-sprite');

    const missingIcons = [];
    for (const iconId of FICBOOK_GENRE_ICON_IDS) {
      const symbol = documentNode.getElementById(iconId);
      const safeSymbol = symbol?.localName === 'symbol' ? copySafeSvgElement(symbol) : null;
      if (safeSymbol) sprite.append(safeSymbol);
      else missingIcons.push(iconId);
    }
    if (missingIcons.length) return unavailable('missing-icons', { missingIcons });

    shadowRoot.prepend(sprite);
    return { installed: true };
  } catch {
    return unavailable('fetch-error');
  }
};
