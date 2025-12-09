import { useEffect, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { useDesktop } from '../context/DesktopContext';
import { DesktopIcon } from './DesktopIcon';
import { ContextMenu } from './ContextMenu';
import { getAssetUrl } from '../utils/assetUtils';
import { GRID_WIDTH, GRID_HEIGHT, GRID_START_X, GRID_START_Y, shufflePositions } from '../constants/gridConstants';

interface DesktopProps {
  onOpenWindow: (id: string) => void;
  searchQuery: string;
}

export function Desktop({ onOpenWindow, searchQuery }: DesktopProps) {
  const { items, background, setItems, referenceSize } = useDesktop();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ICON_HEIGHT = 110;
  const TASKBAR_HEIGHT = 48;

  // Calculate ratios based on available desktop area
  const ratioX = windowSize.width / referenceSize.width;
  const ratioY = Math.max(0, windowSize.height - TASKBAR_HEIGHT) / Math.max(1, referenceSize.height - TASKBAR_HEIGHT);

  // Keep icons at original size
  const iconScale = 1;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // TODO: context menu actions, will be replaced by functions inside organizer
  const handleOrganize = () => {
    const maxHeight = referenceSize.height - TASKBAR_HEIGHT - ICON_HEIGHT;

    let currentX = GRID_START_X;
    let currentY = GRID_START_Y;

    const newItems = items.map(item => {
      const newItem = { ...item, x: currentX, y: currentY };

      currentY += GRID_HEIGHT;
      if (currentY > maxHeight) {
        currentY = GRID_START_Y;
        currentX += GRID_WIDTH;
      }

      return newItem;
    });

    setItems(newItems);
  };

  const handleSortByName = () => {
    const sortedItems = [...items].sort((a, b) => a.label.localeCompare(b.label, 'zh-TW'));
    const maxHeight = referenceSize.height - TASKBAR_HEIGHT - ICON_HEIGHT;

    let currentX = GRID_START_X;
    let currentY = GRID_START_Y;

    const newItems = sortedItems.map(item => {
      const newItem = { ...item, x: currentX, y: currentY };

      currentY += GRID_HEIGHT;
      if (currentY > maxHeight) {
        currentY = GRID_START_Y;
        currentX += GRID_WIDTH;
      }

      return newItem;
    });

    setItems(newItems);
  };

  const handleShuffle = () => {
    const maxHeight = referenceSize.height - TASKBAR_HEIGHT;
    const shuffledItems = shufflePositions(items, referenceSize.width, maxHeight);
    setItems(shuffledItems);
  };

  return (
    <div
      id="desktop-container"
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
                position={{ x: item.x * ratioX, y: item.y * ratioY }}
                scale={iconScale}
                isVisible={isMatch}
              />
            </div>
          );
        })}
      </div>

      {/* Floating Shuffle Button */}
      <button
        onClick={handleShuffle}
        className="absolute top-4 right-4 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all hover:scale-110 active:scale-95 z-10 backdrop-blur-sm border border-gray-200"
        title="隨機打亂圖示位置"
      >
        <Shuffle size={20} className="text-gray-700" />
      </button>

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
