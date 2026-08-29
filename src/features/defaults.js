export const DEFAULT_BUTTON_SETTINGS = {
  position: 'right',
  opacity: 1,
  scale: 1,
};

export const DEFAULT_THEME = {
  bgType: 'none', bgUrl: '', bgFile: '',
  fontType: 'name', fontName: '"YS Text", Helvetica, Arial, sans-serif', fontUrl: '', fontFile: '', fontFormat: '',
};

export const SYSTEM_FONTS = [
  { label: 'По умолчанию (Ficbook)', value: DEFAULT_THEME.fontName },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Comic Sans MS', value: "'Comic Sans MS', 'Chalkboard SE', sans-serif" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Segoe UI', value: "'Segoe UI', Tahoma, sans-serif" },
];

export const GENRES = [
  { id: 'gen', label: 'Джен', color: '#8d6e63', icon: 'ic_gen' },
  { id: 'het', label: 'Гет', color: '#78be20', icon: 'ic_het' },
  { id: 'slash', label: 'Слэш', color: '#3d8eb9', icon: 'ic_slash' },
  { id: 'femslash', label: 'Фемслэш', color: '#e6406d', icon: 'ic_femslash' },
  { id: 'mixed', label: 'Смешанная', color: '#fbc02d', icon: 'ic_mixed' },
  { id: 'other', label: 'Другие', color: '#9e9e9e', icon: 'ic_other' },
  { id: 'article', label: 'Статьи', color: '#424242', icon: 'ic_article' },
];

export const normalizeButtonSettings = (settings) => {
  const { position, opacity, scale } = settings || {};
  return {
    position: position === 'left' ? 'left' : DEFAULT_BUTTON_SETTINGS.position,
    opacity: Number.isFinite(opacity) ? opacity : DEFAULT_BUTTON_SETTINGS.opacity,
    scale: Number.isFinite(scale) ? scale : DEFAULT_BUTTON_SETTINGS.scale,
  };
};
