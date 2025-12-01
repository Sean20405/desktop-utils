import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { getAssetUrl } from '../utils/assetUtils';

interface DesktopIconProps {
  id: string;
  label: string;
  imageUrl?: string;
  onClick: () => void;
  position: { x: number; y: number };
}

export function DesktopIcon({ id, label, imageUrl, onClick, position }: DesktopIconProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `icon-${id}`,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    left: position.x,
    top: position.y,
    position: 'absolute' as const,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center gap-1 p-2 w-24 rounded border border-transparent hover:bg-white/5 hover:backdrop-blur-[2px] hover:border-white/10 cursor-default group transition-colors duration-100",
        isDragging && "opacity-50"
      )}
    >
      <div className="w-12 h-12 flex items-center justify-center drop-shadow-lg group-hover:scale-105 transition-transform duration-200">
        {imageUrl ? (
          <img src={getAssetUrl(imageUrl)} alt={label} className="w-full h-full object-contain pointer-events-none" />
        ) : (
          <div className="w-full h-full bg-gray-400 rounded-lg" />
        )}
      </div>
      <span className="text-white text-xs font-normal drop-shadow-md text-center select-none px-1 rounded-sm line-clamp-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
        {label}
      </span>
    </div>
  );
}
