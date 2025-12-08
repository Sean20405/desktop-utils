import { useState } from 'react';
import { DesktopIcon } from './DesktopIcon';
import { useDesktop } from '../context/DesktopContext';
import { getAssetUrl } from '../utils/assetUtils';
import { ContextMenu } from './ContextMenu';

interface DesktopProps {
  onOpenWindow: (id: string) => void;
  searchQuery: string;
}

export function Desktop({ onOpenWindow, searchQuery }: DesktopProps) {
  const { items, background, setItems } = useDesktop();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // TODO: context menu actions, will be replaced by functions inside organizer
  const handleOrganize = () => {
    const startX = 20;
    const startY = 20;
    const gapX = 100;
    const gapY = 110;
    const maxHeight = window.innerHeight - 100; // Leave space for taskbar

    let currentX = startX;
    let currentY = startY;

    const newItems = items.map(item => {
      const newItem = { ...item, x: currentX, y: currentY };
      
      currentY += gapY;
      if (currentY > maxHeight) {
        currentY = startY;
        currentX += gapX;
      }
      
      return newItem;
    });

    setItems(newItems);
  };

  const handleSortByName = () => {
    const sortedItems = [...items].sort((a, b) => a.label.localeCompare(b.label, 'zh-TW'));
    
    const startX = 20;
    const startY = 20;
    const gapX = 100;
    const gapY = 110;
    const maxHeight = window.innerHeight - 100;

    let currentX = startX;
    let currentY = startY;

    const newItems = sortedItems.map(item => {
      const newItem = { ...item, x: currentX, y: currentY };
      
      currentY += gapY;
      if (currentY > maxHeight) {
        currentY = startY;
        currentX += gapX;
      }
      
      return newItem;
    });

    setItems(newItems);
  };

  return (
    <div 
      className="relative w-full h-full bg-cover bg-center overflow-hidden"
      style={{ 
        backgroundImage: `url("${getAssetUrl(background)}")` 
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Desktop Icons Grid */}
      <div className="absolute inset-0 pointer-events-none">
        {items.map(item => {
          const isMatch = searchQuery === '' || 
            item.label.toLowerCase().includes(searchQuery.toLowerCase());
          
          return (
            <div key={item.id} className="pointer-events-auto">
              <DesktopIcon 
                id={item.id}
                label={item.label} 
                imageUrl={item.imageUrl}
                onClick={() => onOpenWindow(item.id)}
                position={{ x: item.x, y: item.y }}
                isVisible={isMatch}
              />
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          actions={[
            { label: '快速整理', onClick: handleOrganize },
            { label: '依名稱排序', onClick: handleSortByName },
          ]}
        />
      )}
    </div>
  );
}
