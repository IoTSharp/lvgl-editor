import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { ResizeHandle } from '../../types';

interface SelectionOverlayProps {
  componentId: string;
  onResizeStart: (e: React.MouseEvent, handle: ResizeHandle) => void;
}

const resizeHandles: ResizeHandle[] = [
  'top-left', 'top', 'top-right',
  'left', 'right',
  'bottom-left', 'bottom', 'bottom-right',
];

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ componentId, onResizeStart }) => {
  const component = useEditorStore(state => state.getComponentById(componentId));
  
  if (!component) return null;

  return (
    <div
      className="selection-overlay"
      style={{
        position: 'absolute',
        left: component.x - 1,
        top: component.y - 1,
        width: component.width + 2,
        height: component.height + 2,
        border: '2px solid #2196F3',
        pointerEvents: 'none',
        boxSizing: 'border-box',
      }}
    >
      {resizeHandles.map(handle => (
        <div
          key={handle}
          className={`resize-handle ${handle}`}
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            background: '#fff',
            border: '2px solid #2196F3',
            borderRadius: 1,
            pointerEvents: 'auto',
            ...getHandlePosition(handle),
          }}
          onMouseDown={(e) => onResizeStart(e, handle)}
        />
      ))}
    </div>
  );
};

function getHandlePosition(handle: ResizeHandle): React.CSSProperties {
  switch (handle) {
    case 'top-left':
      return { top: -4, left: -4, cursor: 'nwse-resize' };
    case 'top':
      return { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
    case 'top-right':
      return { top: -4, right: -4, cursor: 'nesw-resize' };
    case 'left':
      return { top: '50%', left: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' };
    case 'right':
      return { top: '50%', right: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' };
    case 'bottom-left':
      return { bottom: -4, left: -4, cursor: 'nesw-resize' };
    case 'bottom':
      return { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
    case 'bottom-right':
      return { bottom: -4, right: -4, cursor: 'nwse-resize' };
    default:
      return {};
  }
}

export default SelectionOverlay;
