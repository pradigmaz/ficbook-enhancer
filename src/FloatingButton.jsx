import { Settings } from 'lucide-react';

const FloatingButton = ({ onOpen }) => (
  <button type="button" aria-label="Открыть настройки" className="fbe-main-button" onClick={onOpen}>
    <Settings size={26} aria-hidden="true" />
  </button>
);

export default FloatingButton;
