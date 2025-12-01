import React from 'react';
import { DesktopIcon } from './DesktopIcon';
import { useDesktop } from '../context/DesktopContext';

interface DesktopProps {
  onOpenWindow: (id: string) => void;
  searchQuery: string;
}

export function Desktop({ onOpenWindow, searchQuery }: DesktopProps) {
  const { items, background } = useDesktop();

  return (
    <div 
      className="relative w-full h-full bg-cover bg-center overflow-hidden"
      style={{ 
        backgroundImage: `url("${background}")` 
      }}
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
    </div>
  );
}
