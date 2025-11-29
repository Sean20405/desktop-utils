import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X, Minus, Square } from 'lucide-react';
import { clsx } from 'clsx';

interface WindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  isActive: boolean;
  onFocus: () => void;
}

export function Window({ id, title, children, isOpen, onClose, initialPosition = { x: 100, y: 100 }, isActive, onFocus }: WindowProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `window-${id}`,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    left: initialPosition.x,
    top: initialPosition.y,
    zIndex: isActive ? 50 : 10,
  };

  if (!isOpen) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "absolute flex flex-col bg-white rounded-xl shadow-2xl border border-gray-200/50 overflow-hidden w-[600px] h-[400px] transition-shadow duration-200",
        isActive ? "shadow-[0_0_40px_-10px_rgba(0,0,0,0.3)]" : "opacity-95"
      )}
      onMouseDown={onFocus}
    >
      {/* Title Bar */}
      <div
        {...listeners}
        {...attributes}
        className={clsx(
          "h-10 px-3 flex items-center justify-between select-none cursor-default",
          isActive ? "bg-white" : "bg-gray-50"
        )}
      >
        <div className="flex items-center gap-2">
           {/* Optional: Window Icon could go here */}
           <span className="font-semibold text-xs text-gray-700 ml-1">{title}</span>
        </div>
        
        <div className="flex items-center" onMouseDown={(e) => e.stopPropagation()}>
          <button className="p-2 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
            <Minus size={14} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
            <Square size={12} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-500 hover:text-white rounded-md text-gray-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 bg-white cursor-default" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
