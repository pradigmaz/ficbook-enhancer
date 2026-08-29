import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Zap, Upload, Link2,
  Trash2, RotateCcw, ChevronDown, AlertTriangle 
} from 'lucide-react';
import FloatingButton from './FloatingButton';
import DownloadFb2Button from './DownloadFb2Button';
import { CleanerTab, FiltersTab, PanelTabs } from './PanelControls';
import { getButtonPositionStyle, getPanelPositionStyle } from './features/button';
import { parseHiddenGenres } from './features/selectors';
import { applyPageStyles, resolveFontFormat } from './features/theming';
import { loadTheme, resetStoredSettings, saveTheme } from './features/storage';
import { cacheThemePreview, clearThemePreview } from './features/themePreview';
import { getHttpUrlError } from './features/urlValidation';
import { canCloseExportPanel, useExportNavigationGuard } from './features/exportNavigation';
import { DEFAULT_BUTTON_SETTINGS, DEFAULT_THEME, GENRES, normalizeButtonSettings, SYSTEM_FONTS } from './features/defaults';
const App = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('cleaner');
  const [isLoaded, setIsLoaded] = useState(false);
  const [premiumHidden, setPremiumHidden] = useState(false);
  const [chapterPromoHidden, setChapterPromoHidden] = useState(false);
  const [hiddenGenres, setHiddenGenres] = useState({}); 
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [bgTab, setBgTab] = useState('url');
  const [fontTab, setFontTab] = useState('name');
  const [googleFontsList, setGoogleFontsList] = useState([]);
  const [btnStyle, setBtnStyle] = useState(DEFAULT_BUTTON_SETTINGS);
  const [isClosing, setIsClosing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [bgUrlError, setBgUrlError] = useState('');
  const [fontUrlError, setFontUrlError] = useState('');
  const bgInputRef = useRef(null);
  const fontInputRef = useRef(null);
  useExportNavigationGuard(isExporting);
  const parseGoogleFonts = (url, resetSelection = true) => {
    try {
        const urlObj = new URL(url);
        const families = urlObj.searchParams.getAll('family');
        const cleanNames = families.map(f => f.split(':')[0].replace(/\+/g, ' '));
        if (cleanNames.length > 0) {
            setGoogleFontsList(cleanNames);
            if (resetSelection) setTheme(prev => ({ ...prev, fontType: 'url', fontUrl: url, fontName: cleanNames[0] }));
        } else {
            setGoogleFontsList([]);
        }
    } catch { setGoogleFontsList([]); }
  };
  useEffect(() => {
    const init = async () => {
      setPremiumHidden(localStorage.getItem('fbe_premiumHidden') === 'true');
      setChapterPromoHidden(localStorage.getItem('fbe_chapterPromoHidden') === 'true');
      const savedGenres = localStorage.getItem('fbe_hiddenGenres');
      if (savedGenres) setHiddenGenres(parseHiddenGenres(savedGenres, GENRES.map(({ id }) => id)));
      if (globalThis.chrome?.storage?.local) {
        globalThis.chrome.storage.local.get(['buttonSettings'], (res) => {
          if (res.buttonSettings) setBtnStyle(normalizeButtonSettings(res.buttonSettings));
        });
      }
      try {
        const dbTheme = await loadTheme();
        if (dbTheme) {
          setTheme(prev => ({ ...prev, ...dbTheme }));
          if (dbTheme.bgType !== 'none') setBgTab(dbTheme.bgType);
          if (dbTheme.fontType) setFontTab(dbTheme.fontType);
          if (dbTheme.fontType === 'url' && dbTheme.fontUrl) parseGoogleFonts(dbTheme.fontUrl, false);
        } else {
          setTheme(DEFAULT_THEME);
        }
      } catch (error) {
        console.error('Ошибка инициализации темы:', error);
        setTheme(DEFAULT_THEME);
      } finally {
        setIsLoaded(true);
      }
    };
    init();
    const listener = (changes) => {
      if (changes.buttonSettings) setBtnStyle(normalizeButtonSettings(changes.buttonSettings.newValue));
    };
    if (globalThis.chrome?.storage?.onChanged) {
      globalThis.chrome.storage.onChanged.addListener(listener);
      return () => globalThis.chrome.storage.onChanged.removeListener(listener);
    }
  }, []);
  const handleBgUrlChange = (e) => {
    const bgUrl = e.target.value;
    setTheme(prev => ({ ...prev, bgType: 'url', bgUrl }));
    void cacheThemePreview({ bgType: 'url', bgUrl });
    setBgUrlError(error => error ? getHttpUrlError(bgUrl) : '');
  };
  const handleBgFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const bgFile = reader.result;
      setTheme(prev => ({ ...prev, bgType: 'file', bgFile }));
      void cacheThemePreview({ bgType: 'file', bgFile });
    };
    reader.readAsDataURL(file);
  };
  const handleSystemFontChange = (e) => setTheme(prev => ({ ...prev, fontType: 'name', fontName: e.target.value }));
  const handleGoogleUrlChange = (e) => {
      let val = e.target.value;
      if (val.includes('<link') && val.includes('href=')) {
          const match = val.match(/href=["'](.*?)["']/);
          if (match && match[1]) val = match[1];
      }
      setFontUrlError(error => error ? getHttpUrlError(val) : '');
      setTheme(prev => ({ ...prev, fontType: 'url', fontUrl: val }));
      parseGoogleFonts(val, true);
  };
  const handleFontFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fontFormat = resolveFontFormat({ fileName: file.name, mimeType: file.type });
    if (!fontFormat) return;
    const reader = new FileReader();
    reader.onloadend = () => setTheme(prev => ({ ...prev, fontType: 'file', fontFile: reader.result, fontFormat }));
    reader.readAsDataURL(file);
  };
  const toggleGenre = (genreId) => setHiddenGenres(prev => ({ ...prev, [genreId]: !prev[genreId] }));
  const handleResetBg = () => { clearThemePreview(); setTheme(prev => ({ ...prev, bgType: 'none', bgUrl: '', bgFile: '' })); setBgUrlError(''); setBgTab('url'); };
  const handleResetFont = () => { setTheme(prev => ({ ...prev, fontType: 'name', fontName: DEFAULT_THEME.fontName, fontUrl: '', fontFile: '', fontFormat: '' })); setFontUrlError(''); setGoogleFontsList([]); setFontTab('name'); };
  const handleResetRequest = () => {
    setShowResetConfirm(true);
  };
  const handleConfirmReset = async () => {
    setStorageError('');
    try {
      await resetStoredSettings({ defaultTheme: DEFAULT_THEME, defaultButtonSettings: DEFAULT_BUTTON_SETTINGS });
      clearThemePreview();
      setPremiumHidden(false);
      setChapterPromoHidden(false);
      setHiddenGenres({});
      setTheme(DEFAULT_THEME);
      setGoogleFontsList([]);
      setBgUrlError('');
      setFontUrlError('');
      setBgTab('url');
      setFontTab('name');
      setBtnStyle(DEFAULT_BUTTON_SETTINGS);
      setShowResetConfirm(false);
  } catch (error) {
      console.error('Ошибка сброса настроек:', error);
      setStorageError(error.partialReset ? 'Часть настроек могла измениться. Перезагрузите страницу и повторите сброс.' : 'Не удалось сбросить настройки. Попробуйте ещё раз.');
    }
  };
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      saveTheme(theme)
        .then(() => setStorageError(''))
        .catch(() => setStorageError('Не удалось сохранить настройки. Попробуйте ещё раз.'));
    }, 800);
    return () => clearTimeout(timer);
  }, [theme, isLoaded]);
  useEffect(() => { if (!isLoaded) return; localStorage.setItem('fbe_premiumHidden', premiumHidden); localStorage.setItem('fbe_chapterPromoHidden', chapterPromoHidden); localStorage.setItem('fbe_hiddenGenres', JSON.stringify(hiddenGenres)); }, [premiumHidden, chapterPromoHidden, hiddenGenres, isLoaded]);
  useEffect(() => {
    if (!isLoaded) return;
    applyPageStyles({ theme, hidePremium: premiumHidden, hideChapterPromo: chapterPromoHidden, hiddenGenres });
  }, [isLoaded, premiumHidden, chapterPromoHidden, theme, hiddenGenres]);
  const buttonStyle = {
    position: 'fixed', zIndex: 2147483647, ...getButtonPositionStyle(btnStyle),
    display: 'flex', flexDirection: 'column',
    opacity: btnStyle.opacity, transform: `scale(${btnStyle.scale})`,
    transition: 'opacity 0.18s var(--fbe-ease-flow), transform 0.18s var(--fbe-ease-flow)',
  };
  const handlePanelClose = () => {
    if (!canCloseExportPanel(isExporting, (message) => window.confirm(message))) return;
    setIsClosing(true);
  };
  return (
    <div id="fbe-app-container">
      {isOpen && (
        <div className={`fbe-panel${isClosing ? ' fbe-panel-closing' : ''}`} style={{ pointerEvents: 'auto', position: 'fixed', zIndex: 2147483647, ...getPanelPositionStyle(btnStyle) }} onAnimationEnd={(event) => { if (isClosing && event.target === event.currentTarget && event.animationName === 'fbe-panel-close') { setIsOpen(false); setIsClosing(false); } }}>
          
          <div className="fbe-header">
            <div className="fbe-title"><Zap size={18} aria-hidden="true" /> FB Enhancer</div>
            <button type="button" onClick={handlePanelClose} className="fbe-icon-btn" aria-label="Закрыть настройки" title="Закрыть настройки"><X size={20} aria-hidden="true" /></button>
          </div>

          {/* --- CUSTOM CONFIRM MODAL --- */}
          {showResetConfirm && (
            <div className="fbe-modal-overlay">
                <div className="fbe-confirm-dialog">
                <div className="flex justify-center text-red-500 mb-3">
                    <div className="bg-red-100 p-3 rounded-full dark:bg-red-900/30">
                    <AlertTriangle size={24} aria-hidden="true" />
                    </div>
                </div>
                <div className="fbe-confirm-title">Сбросить настройки?</div>
                <div className="fbe-confirm-text">
                    Все параметры внешнего вида и фильтры вернутся к значениям по умолчанию.
                </div>
                <div className="fbe-confirm-actions">
                    <button 
                    type="button"
                    className="fbe-btn-secondary" 
                    onClick={() => { setShowResetConfirm(false); setStorageError(''); }}
                    >
                    Отмена
                    </button>
                    <button 
                    type="button"
                    className="fbe-btn-danger" 
                    onClick={handleConfirmReset}
                    >
                    Сбросить
                    </button>
                </div>
                {storageError && (
                  <div role="status" aria-live="polite" className="mt-3 text-xs text-red-500">{storageError}</div>
                )}
                </div>
            </div>
          )}

          <PanelTabs activeTab={activeTab} onChange={setActiveTab} />

          {storageError && !showResetConfirm && (
            <div role="status" aria-live="polite" className="px-6 pt-3 text-xs text-red-500">{storageError}</div>
          )}

          <div className="fbe-content">
            {/* КЛЮЧЕВОЙ МОМЕНТ: key={activeTab} перезапускает анимацию fbe-flow-enter при смене вкладки */}
            <div key={activeTab} className="fbe-tab-enter space-y-4">

              {activeTab === 'cleaner' && (
                <CleanerTab
                  premiumHidden={premiumHidden}
                  chapterPromoHidden={chapterPromoHidden}
                  onTogglePremium={() => setPremiumHidden(!premiumHidden)}
                  onToggleChapterPromo={() => setChapterPromoHidden(!chapterPromoHidden)}
                />
              )}

              {activeTab === 'filters' && (
                <FiltersTab
                  genres={GENRES}
                  hiddenGenres={hiddenGenres}
                  onToggle={toggleGenre}
                  onClear={() => setHiddenGenres({})}
                />
              )}

              {activeTab === 'theme' && (
                <div className="space-y-6">
                  
                  {/* --- ФОН --- */}
                  <div>
                    <div className="fbe-section-title">Фон</div>
                    <div className="fbe-btn-group">
                      <button type="button" aria-pressed={bgTab === 'url'} onClick={() => setBgTab('url')} className={`fbe-btn-tab ${bgTab === 'url' ? 'active' : ''}`}>Ссылка</button>
                      <button type="button" aria-pressed={bgTab === 'file'} onClick={() => setBgTab('file')} className={`fbe-btn-tab ${bgTab === 'file' ? 'active' : ''}`}>Файл</button>
                      <button type="button" onClick={handleResetBg} className="fbe-btn-tab fbe-btn-delete" aria-label="Сбросить фон" title="Сбросить фон"><Trash2 size={16} aria-hidden="true" /></button>
                    </div>

                    {/* Анимация перетекания внутри вкладки Фон */}
                    <div key={bgTab} className="fbe-input-wrapper">
                      {bgTab === 'url' && (
                        <div>
                          <label className="fbe-input-label" htmlFor="fbe-bg-url">Ссылка на изображение</label>
                          <div className="relative w-full">
                              <Link2 size={17} aria-hidden="true" className="fbe-control-icon fbe-input-icon left-3 pointer-events-none"/>
                              <input 
                                id="fbe-bg-url"
                                type="url"
                                name="backgroundUrl"
                                autoComplete="off"
                                aria-invalid={Boolean(bgUrlError)}
                                aria-describedby={bgUrlError ? 'fbe-bg-url-error' : undefined}
                                style={{ paddingLeft: '38px' }}
                                placeholder="https://i.imgur.com/…" 
                                value={theme.bgUrl} 
                                onChange={handleBgUrlChange}
                                onBlur={(event) => setBgUrlError(getHttpUrlError(event.currentTarget.value))}
                              />
                          </div>
                          {bgUrlError && <p id="fbe-bg-url-error" className="fbe-input-error" role="status" aria-live="polite">{bgUrlError}</p>}
                        </div>
                      )}

                      {bgTab === 'file' && (
                        <>
                          <button type="button" onClick={() => bgInputRef.current.click()} className="fbe-file-upload">
                            <Upload size={16} aria-hidden="true" /> {theme.bgFile ? 'Заменить' : 'Выбрать файл'}
                          </button>
                          <input type="file" accept="image/*" ref={bgInputRef} onChange={handleBgFileChange} hidden />
                          {theme.bgFile && (
                            <div className="mt-3 h-28 rounded-xl bg-contain bg-center bg-no-repeat border border-slate-200 shadow-sm" style={{backgroundImage: `url(${theme.bgFile})`}}></div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* --- ШРИФТ --- */}
                  <div>
                    <div className="fbe-section-title">Шрифт</div>
                    <div className="fbe-btn-group">
                      <button type="button" aria-pressed={fontTab === 'name'} onClick={() => setFontTab('name')} className={`fbe-btn-tab ${fontTab === 'name' ? 'active' : ''}`}>Список</button>
                      <button type="button" aria-pressed={fontTab === 'url'} onClick={() => setFontTab('url')} className={`fbe-btn-tab ${fontTab === 'url' ? 'active' : ''}`}>Google</button>
                      <button type="button" aria-pressed={fontTab === 'file'} onClick={() => setFontTab('file')} className={`fbe-btn-tab ${fontTab === 'file' ? 'active' : ''}`}>Файл</button>
                      <button type="button" onClick={handleResetFont} className="fbe-btn-tab fbe-btn-delete" aria-label="Сбросить шрифт" title="Сбросить шрифт"><Trash2 size={16} aria-hidden="true" /></button>
                    </div>

                    {/* Анимация перетекания внутри вкладки Шрифт */}
                    <div key={fontTab} className="fbe-input-wrapper">
                      {fontTab === 'name' && (
                         <div className="relative w-full">
                           <ChevronDown size={16} aria-hidden="true" className="fbe-control-icon right-3 opacity-40 pointer-events-none"/>
                           <select 
                             name="fontName"
                             value={theme.fontName} 
                             onChange={handleSystemFontChange}
                             className="cursor-pointer appearance-none"
                           >
                             {SYSTEM_FONTS.map((f, i) => (
                               <option key={i} value={f.value} disabled={f.disabled} style={f.disabled ? {background:'#eee'} : {}}>
                                 {f.label}
                               </option>
                             ))}
                           </select>
                         </div>
                      )}
                      
                      {fontTab === 'url' && (
                        <div className="space-y-3">
                            <div>
                              <label className="fbe-input-label" htmlFor="fbe-font-url">Ссылка на CSS Google Fonts</label>
                              <div className="relative w-full">
                                  <Link2 size={17} aria-hidden="true" className="fbe-control-icon fbe-input-icon left-3 pointer-events-none"/>
                                  <input 
                                      id="fbe-font-url"
                                      type="url"
                                      name="fontUrl"
                                      autoComplete="off"
                                      aria-invalid={Boolean(fontUrlError)}
                                      aria-describedby={fontUrlError ? 'fbe-font-url-error' : undefined}
                                      style={{ paddingLeft: '38px' }} 
                                      placeholder="https://fonts.googleapis.com/…" 
                                      value={theme.fontUrl} 
                                      onChange={handleGoogleUrlChange}
                                      onBlur={(event) => setFontUrlError(getHttpUrlError(event.currentTarget.value))}
                                  />
                              </div>
                              {fontUrlError && <p id="fbe-font-url-error" className="fbe-input-error" role="status" aria-live="polite">{fontUrlError}</p>}
                            </div>
                            
                            {googleFontsList.length > 0 && (
                                 <div className="relative w-full fbe-tab-enter">
                                    <ChevronDown size={16} aria-hidden="true" className="fbe-control-icon right-3 opacity-40 pointer-events-none"/>
                                    <select 
                                        name="googleFontName"
                                        value={theme.fontName} 
                                        onChange={(e) => setTheme({...theme, fontName: e.target.value})}
                                        className="cursor-pointer appearance-none border-l-4 border-l-orange-500"
                                    >
                                    {googleFontsList.map((font, i) => (
                                        <option key={i} value={font}>{font}</option>
                                    ))}
                                    </select>
                                 </div>
                            )}
                        </div>
                      )}

                      {fontTab === 'file' && (
                        <>
                          <button type="button" onClick={() => fontInputRef.current.click()} className="fbe-file-upload">
                            <Upload size={16} aria-hidden="true" /> {theme.fontFile ? 'Заменить шрифт' : 'Выбрать .ttf'}
                          </button>
                          <input type="file" accept=".ttf,.otf,.woff,.woff2" ref={fontInputRef} onChange={handleFontFileChange} hidden />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="fbe-danger-zone">
                    <div className="fbe-section-title">Опасная зона</div>
                    <p className="fbe-danger-zone-copy">Сбрасывает фон, шрифт и фильтры.</p>
                    <button 
                      type="button"
                      onClick={handleResetRequest}
                      className="fbe-reset-button"
                    >
                      <RotateCcw size={14} aria-hidden="true" /> Сбросить все настройки
                    </button>
                  </div>

                </div>
              )}
            </div>
            <div className="fbe-export-slot" hidden={activeTab !== 'cleaner'}><DownloadFb2Button isExporting={isExporting} onExportingChange={setIsExporting} /></div>
          </div>
        </div>
      )}

      {!isOpen && <div style={buttonStyle}><FloatingButton onOpen={() => setIsOpen(true)} /></div>}
    </div>
  );
};

export default App;
