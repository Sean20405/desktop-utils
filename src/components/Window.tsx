import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X, Minus, Square, Maximize2 } from 'lucide-react';
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
  isMaximized?: boolean;
  size?: { width: number; height: number };
  onToggleMaximize?: () => void;
  onResize?: (size: { width: number; height: number }) => void;
}

export function Window({ 
  id, 
  title, 
  children, 
  isOpen, 
  onClose, 
  initialPosition = { x: 100, y: 100 }, 
  isActive, 
  onFocus,
  isMaximized = false,
  size = { width: 600, height: 400 },
  onToggleMaximize,
  onResize
}: WindowProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `window-${id}`,
    disabled: isMaximized,
  });

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!onResize) return;
      
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction.includes('e')) newWidth = Math.max(300, startWidth + deltaX);
      if (direction.includes('s')) newHeight = Math.max(200, startHeight + deltaY);
      
      onResize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const style: React.CSSProperties = isMaximized ? {
    left: 0,
    top: 0,
    width: '100%',
    height: 'calc(100% - 48px)', // Assuming taskbar is 48px (h-12)
    zIndex: isActive ? 50 : 10,
    transform: 'none',
  } : {
    transform: CSS.Translate.toString(transform),
    left: initialPosition.x,
    top: initialPosition.y,
    width: size.width,
    height: size.height,
    zIndex: isActive ? 50 : 10,
  };

  if (!isOpen) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "absolute flex flex-col bg-white shadow-2xl border border-gray-200/50 overflow-hidden transition-shadow duration-200",
        isMaximized ? "rounded-none" : "rounded-xl",
        isActive ? "shadow-[0_0_40px_-10px_rgba(0,0,0,0.3)]" : "opacity-95"
      )}
      onMouseDown={onFocus}
    >
      {/* Title Bar */}
      <div
        {...listeners}
        {...attributes}
        className={clsx(
          "h-10 px-3 flex items-center justify-between select-none cursor-default shrink-0",
          isActive ? "bg-white" : "bg-gray-50"
        )}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onToggleMaximize?.();
        }}
      >
        <div className="flex items-center gap-2">
           {/* Optional: Window Icon could go here */}
           <span className="font-semibold text-xs text-gray-700 ml-1">{title}</span>
        </div>
        
        <div className="flex items-center" onMouseDown={(e) => e.stopPropagation()}>
          <button className="p-2 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
            <Minus size={14} />
          </button>
          <button 
            onClick={onToggleMaximize}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"
          >
            {isMaximized ? <Maximize2 size={12} /> : <Square size={12} />}
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
      <div className="flex-1 overflow-auto p-4 bg-white cursor-default relative" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>

      {/* Resize Handles */}
      {!isMaximized && (
        <>
          {/* Right Handle */}
          <div 
            className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-400/50 transition-colors z-50"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
          {/* Bottom Handle */}
          <div 
            className="absolute bottom-0 left-0 w-full h-1 cursor-ns-resize hover:bg-blue-400/50 transition-colors z-50"
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          {/* Bottom-Right Corner Handle */}
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-blue-400/50 transition-colors z-50 rounded-tl-lg"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
        </>
      )}
    </div>
  );
}
