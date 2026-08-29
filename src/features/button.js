const BUTTON_OFFSET_VALUE = 30;
const BUTTON_OFFSET = `${BUTTON_OFFSET_VALUE}px`;
const BUTTON_SIZE = 60;
const PANEL_MARGIN = 8;

export const getButtonPositionStyle = ({ position = 'right' } = {}) => {
  const side = position === 'left' ? 'left' : 'right';
  return {
    bottom: BUTTON_OFFSET, [side]: BUTTON_OFFSET,
    alignItems: side === 'left' ? 'flex-start' : 'flex-end', transformOrigin: `bottom ${side}`,
  };
};

export const getPanelPositionStyle = ({ position = 'right' } = {}) => {
  const side = position === 'left' ? 'left' : 'right';
  return {
    bottom: `${BUTTON_OFFSET_VALUE + BUTTON_SIZE}px`, [side]: BUTTON_OFFSET, top: 'auto',
    maxHeight: `calc(100dvh - ${BUTTON_OFFSET_VALUE + BUTTON_SIZE + PANEL_MARGIN}px)`, transformOrigin: `bottom ${side}`,
  };
};
