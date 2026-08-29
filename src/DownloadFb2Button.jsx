import { useState } from 'react';
import { Download } from 'lucide-react';
import { exportCurrentWorkToFb2 } from './features/fb2Export';

const DownloadFb2Button = ({ isExporting, onExportingChange }) => {
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState({ completed: 0, total: 0, phase: 'idle' });
  const progressPercent = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;

  const handleExport = async () => {
    onExportingChange(true);
    setStatus('Собираю оглавление…');
    setProgress({ completed: 0, total: 0, phase: 'collecting' });
    try {
      const result = await exportCurrentWorkToFb2({
        onProgress: (nextProgress) => {
          setProgress(nextProgress);
          setStatus(
            nextProgress.phase === 'serializing'
              ? `Собираю FB2: ${nextProgress.completed} из ${nextProgress.total} глав…`
              : `Собрано: ${nextProgress.completed} из ${nextProgress.total} глав…`,
          );
        },
        onWait: ({ seconds, rateLimited }) => setStatus(
          rateLimited ? `Ficbook ограничил запросы: жду ${seconds} с…` : `Пауза перед следующей главой: ${seconds} с…`,
        ),
      });
      setProgress({ completed: result.chapterCount, total: result.total, phase: 'done' });
      setStatus(`Скачано: ${result.chapterCount} из ${result.total} глав.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось подготовить FB2.');
    } finally {
      onExportingChange(false);
    }
  };

  return (
    <div className="fbe-export">
      <div className="fbe-section-title">Экспорт</div>
      <button type="button" className="fbe-export-button" onClick={handleExport} disabled={isExporting} aria-busy={isExporting}>
        <Download size={16} /> {isExporting ? 'Готовлю FB2…' : 'Скачать FB2'}
      </button>
      {progress.total > 0 && (
        <div className="fbe-export-progress">
          <div className="fbe-export-progress-meta">
            <span>{progress.phase === 'serializing' ? 'Подготовка файла' : 'Главы'}</span>
            <strong>{progress.completed} из {progress.total}</strong>
          </div>
          <div className="fbe-export-meter" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed}>
            <span className="fbe-export-meter-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}
      {status && <div role="status" aria-live="polite" className="fbe-export-status">{status}</div>}
    </div>
  );
};

export default DownloadFb2Button;
