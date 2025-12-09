import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface ContextMenuAction {
  label: string;
  onClick: () => void;
  submenu?: ContextMenuAction[];
}


interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  actions: ContextMenuAction[];
}

export function ContextMenu({ x, y, onClose, actions }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);

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
        <div key={index} className="relative">
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors whitespace-nowrap flex items-center justify-between gap-2"
            onClick={() => {
              if (!action.submenu) {
                action.onClick();
                onClose();
              } else {
                setActiveSubmenu(activeSubmenu === index ? null : index);
              }
            }}
            onMouseEnter={() => action.submenu && setActiveSubmenu(index)}
          >
            {action.label}
            {action.submenu && <ChevronRight size={16} />}
          </button>
          
          {action.submenu && activeSubmenu === index && (
            <div className="absolute left-full top-0 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg py-1 ml-2 w-max">
              {action.submenu.map((subaction, subindex) => (
                <button
                  key={subindex}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors whitespace-nowrap"
                  onClick={() => {
                    subaction.onClick();
                    onClose();
                  }}
                >
                  {subaction.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
