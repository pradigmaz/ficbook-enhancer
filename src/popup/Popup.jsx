// src/popup/Popup.jsx
import React, { useState, useEffect } from 'react';
import { Settings, AlignLeft, AlignRight, Eye, Maximize } from 'lucide-react';
import { DEFAULT_BUTTON_SETTINGS, normalizeButtonSettings } from '../features/defaults';
import '../styles/index.css'; 

const Popup = () => {
  // Дефолтные значения, чтобы не было "мигания"
  const [settings, setSettings] = useState(DEFAULT_BUTTON_SETTINGS);

  useEffect(() => {
    // Безопасное чтение из storage
    if (globalThis.chrome?.storage?.local) {
      globalThis.chrome.storage.local.get(['buttonSettings'], (result) => {
        if (result.buttonSettings) {
          setSettings(normalizeButtonSettings(result.buttonSettings));
        }
      });
    }
  }, []);

  const updateSetting = (key, value) => {
    const newSettings = normalizeButtonSettings({ ...settings, [key]: value });
    setSettings(newSettings);
    if (globalThis.chrome?.storage?.local) {
      globalThis.chrome.storage.local.set({ buttonSettings: newSettings });
    }
  };

  return (
    // Добавил border, чтобы четко видеть границы окна при отладке
    <div className="w-[300px] bg-slate-50 min-h-[350px] border border-slate-200">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 p-4 flex items-center gap-3 shadow-md">
        <div className="bg-white/20 p-2 rounded-lg text-white backdrop-blur-sm">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-none mb-1">FB Enhancer</h1>
          <p className="text-[10px] text-orange-100 font-medium opacity-90">Настройки кнопки</p>
        </div>
      </div>

      <div className="p-5 space-y-6">
        
        {/* Позиция */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
            Положение на экране
          </label>
          <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
            <button 
              onClick={() => updateSetting('position', 'left')}
              className={`flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                settings.position === 'left' 
                  ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <AlignLeft size={16}/> Слева
            </button>
            <button 
              onClick={() => updateSetting('position', 'right')}
              className={`flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                settings.position === 'right' 
                  ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Справа <AlignRight size={16}/>
            </button>
          </div>
        </div>

        {/* Прозрачность */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={14}/> Прозрачность
            </label>
            <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
              {Math.round(settings.opacity * 100)}%
            </span>
          </div>
          <input 
            type="range" min="0.2" max="1" step="0.1"
            value={settings.opacity}
            onChange={(e) => updateSetting('opacity', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-600"
          />
        </div>

        {/* Размер */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Maximize size={14}/> Размер кнопки
            </label>
            <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
              {settings.scale}x
            </span>
          </div>
          <input 
            type="range" min="0.5" max="1.5" step="0.1"
            value={settings.scale}
            onChange={(e) => updateSetting('scale', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-600"
          />
        </div>

      </div>
    </div>
  );
};

export default Popup;
