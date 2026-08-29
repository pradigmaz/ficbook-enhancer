import { useEffect } from 'react';

const CURRENT_TAB_TARGETS = new Set(['_self', '_top', '_parent']);
const PANEL_CLOSE_MESSAGE = 'Экспорт FB2 ещё идёт. Закрыть панель? Скачивание продолжится в этой вкладке.';

export const canCloseExportPanel = (isExporting, confirmClose) => !isExporting || confirmClose(PANEL_CLOSE_MESSAGE);

export const warnBeforeExportUnload = (event) => {
  event.preventDefault();
  event.returnValue = '';
};

export const protectExportNavigation = (event, pageUrl, openTab) => {
  if (
    event.defaultPrevented
    || (event.button != null && event.button !== 0)
    || event.ctrlKey
    || event.metaKey
    || event.shiftKey
    || event.altKey
  ) return false;

  const link = event.target?.closest?.('a[href]');
  const href = link?.href || link?.getAttribute?.('href');
  const target = link?.getAttribute?.('target')?.toLowerCase();
  if (!href || link?.hasAttribute?.('download') || (target && !CURRENT_TAB_TARGETS.has(target))) return false;

  let destination;
  let current;
  try {
    destination = new URL(href, pageUrl);
    current = new URL(pageUrl);
  } catch {
    return false;
  }
  if (
    !['http:', 'https:'].includes(destination.protocol)
    || (destination.origin === current.origin && destination.pathname === current.pathname && destination.search === current.search)
  ) return false;

  let tab;
  try {
    tab = openTab(destination.href);
  } catch {
    return false;
  }
  if (!tab) return false;

  try {
    tab.opener = null;
  } catch {
    // The navigation already opened; preserving export matters more than opener cleanup.
  }
  event.preventDefault();
  event.stopPropagation();
  return true;
};

export const useExportNavigationGuard = (isExporting) => {
  useEffect(() => {
    if (!isExporting) return undefined;
    const handleNavigation = (event) => {
      protectExportNavigation(event, window.location.href, (url) => window.open(url, '_blank'));
    };
    document.addEventListener('click', handleNavigation, true);
    window.addEventListener('beforeunload', warnBeforeExportUnload);
    return () => {
      document.removeEventListener('click', handleNavigation, true);
      window.removeEventListener('beforeunload', warnBeforeExportUnload);
    };
  }, [isExporting]);
};
