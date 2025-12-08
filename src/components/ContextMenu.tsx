import { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  actions: {
    label: string;
    onClick: () => void;
  }[];
}

export function ContextMenu({ x, y, onClose, actions }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg py-1 w-max"
      style={{ top: y, left: x }}
    >
      {actions.map((action, index) => (
        <button
          key={index}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors whitespace-nowrap"
          onClick={() => {
            action.onClick();
            onClose();
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
