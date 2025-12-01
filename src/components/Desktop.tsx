import { DesktopIcon } from './DesktopIcon';
import { useDesktop } from '../context/DesktopContext';
import { getAssetUrl } from '../utils/assetUtils';

interface DesktopProps {
  onOpenWindow: (id: string) => void;
}

export function Desktop({ onOpenWindow }: DesktopProps) {
  const { items, background } = useDesktop();

  return (
    <div 
      className="relative w-full h-full bg-cover bg-center overflow-hidden"
      style={{ 
        backgroundImage: `url("${getAssetUrl(background)}")` 
      }}
    >
      {/* Desktop Icons Grid */}
      <div className="absolute inset-0 pointer-events-none">
        {items.map(item => (
          <div key={item.id} className="pointer-events-auto">
            <DesktopIcon 
              id={item.id}
              label={item.label} 
              imageUrl={item.imageUrl}
              onClick={() => onOpenWindow(item.id)}
              position={{ x: item.x, y: item.y }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
