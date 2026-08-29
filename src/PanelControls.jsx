import { createElement } from 'react';
import { Brush, Filter, Palette } from 'lucide-react';

const TABS = [
  { id: 'cleaner', label: 'Очистка', Icon: Brush },
  { id: 'filters', label: 'Фильтры', Icon: Filter },
  { id: 'theme', label: 'Вид', Icon: Palette },
];

export const PanelTabs = ({ activeTab, onChange }) => (
  <nav className="fbe-nav" aria-label="Разделы настроек">
    {TABS.map(({ id, label, Icon }) => {
      const active = activeTab === id;
      return (
        <button
          key={id}
          type="button"
          className={`fbe-nav-item ${active ? 'active' : ''}`}
          aria-pressed={active}
          onClick={() => onChange(id)}
        >
          {createElement(Icon, { size: 16, 'aria-hidden': true, className: 'mb-1 mx-auto' })}
          {label}
        </button>
      );
    })}
  </nav>
);

export const CleanerTab = ({ premiumHidden, chapterPromoHidden, onTogglePremium, onToggleChapterPromo }) => (
  <section aria-label="Блокировка">
    <div className="fbe-section-title">Блокировка</div>
    <button type="button" className="fbe-row" aria-pressed={premiumHidden} onClick={onTogglePremium}>
      <span className="fbe-label">Убрать Premium</span>
      <span className={`fbe-toggle ${premiumHidden ? 'active' : ''}`} aria-hidden="true"><span className="fbe-toggle-circle" /></span>
    </button>
    <button type="button" className="fbe-row" aria-pressed={chapterPromoHidden} onClick={onToggleChapterPromo}>
      <span className="fbe-label">Скрыть промо в главе</span>
      <span className={`fbe-toggle ${chapterPromoHidden ? 'active' : ''}`} aria-hidden="true"><span className="fbe-toggle-circle" /></span>
    </button>
  </section>
);

export const FiltersTab = ({ genres, hiddenGenres, onToggle, onClear }) => {
  const hiddenCount = genres.filter(({ id }) => hiddenGenres[id]).length;

  return (
    <section aria-label="Фильтры жанров">
      <div className="fbe-section-heading">
        <div>
          <div className="fbe-section-title">Скрыть жанры</div>
          <p className="fbe-section-status" aria-live="polite">Скрыто: {hiddenCount} из {genres.length}</p>
        </div>
        <button type="button" className="fbe-text-button" onClick={onClear} disabled={hiddenCount === 0}>Показать все</button>
      </div>
      <div className="fbe-filter-panel">
        <p id="fbe-filter-help" className="fbe-filter-help">Отмеченные жанры исчезнут из ленты.</p>
        {genres.map((genre) => {
          const hidden = Boolean(hiddenGenres[genre.id]);
          return (
            <button key={genre.id} type="button" className="fbe-row fbe-genre-row" aria-pressed={hidden} aria-describedby="fbe-filter-help" onClick={() => onToggle(genre.id)}>
              <span className="fbe-genre-label">
                <span className="fbe-genre-mark" style={{ color: genre.color }}><span className="fbe-genre-dot" /><svg className="fbe-genre-icon" aria-hidden="true"><use href={`#${genre.icon}`} /></svg></span>
                <span className="fbe-label">{genre.label}</span>
              </span>
              <span className={`fbe-toggle ${hidden ? 'active' : ''}`} aria-hidden="true"><span className="fbe-toggle-circle" /></span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
