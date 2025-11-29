import React, { useState } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import { Monitor } from 'lucide-react';
import { Window } from './components/Window';
import { DesktopIcon } from './components/DesktopIcon';
import { OrganizerApp } from './components/OrganizerApp';
import { useDesktop } from './context/DesktopContext';

interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  position: { x: number; y: number };
  type: 'organizer' | 'folder' | 'settings';
}

function App() {
  const { items, updateItemPosition } = useDesktop();
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [windows, setWindows] = useState<WindowState[]>([
    {
      id: 'organizer',
      title: 'Desktop Organizer',
      isOpen: false,
      position: { x: 100, y: 50 },
      type: 'organizer'
    }
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const activeId = String(active.id);

    if (activeId.startsWith('window-')) {
      const windowId = activeId.replace('window-', '');
      setWindows(prev => prev.map(w => {
        if (w.id === windowId) {
          return {
            ...w,
            position: {
              x: w.position.x + delta.x,
              y: w.position.y + delta.y
            }
          };
        }
        return w;
      }));
    } else if (activeId.startsWith('icon-')) {
      const iconId = activeId.replace('icon-', '');
      const item = items.find(i => i.id === iconId);
      if (item) {
        updateItemPosition(iconId, item.x + delta.x, item.y + delta.y);
      }
    }
  };

  const openWindow = (id: string) => {
    // Check if window already exists
    const existingWindow = windows.find(w => w.id === id);
    if (existingWindow) {
      setWindows(prev => prev.map(w => {
        if (w.id === id) {
          return { ...w, isOpen: true };
        }
        return w;
      }));
      setActiveWindowId(id);
    } else {
      // If it's a generic folder or file, we might want to open a generic window
      // For now, we only support opening the organizer explicitly or pre-defined windows
      console.log("Open window for", id);
    }
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.map(w => {
      if (w.id === id) {
        return { ...w, isOpen: false };
      }
      return w;
    }));
  };

  const focusWindow = (id: string) => {
    setActiveWindowId(id);
  };

  const renderWindowContent = (window: WindowState) => {
    switch (window.type) {
      case 'organizer':
        return <OrganizerApp />;
      default:
        return <div className="p-4">Content for {window.title}</div>;
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div 
        className="relative w-full h-full bg-cover bg-center overflow-hidden"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&q=80&w=2070")' 
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
                onClick={() => openWindow(item.id)}
                position={{ x: item.x, y: item.y }}
              />
            </div>
          ))}
        </div>

        {/* Windows Layer */}
        {windows.map(window => (
          <Window
            key={window.id}
            id={window.id}
            title={window.title}
            isOpen={window.isOpen}
            onClose={() => closeWindow(window.id)}
            initialPosition={window.position}
            isActive={activeWindowId === window.id}
            onFocus={() => focusWindow(window.id)}
          >
            {renderWindowContent(window)}
          </Window>
        ))}

        {/* Taskbar */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-[#202020]/85 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-4 z-50">
          
          {/* Left spacer for centering */}
          <div className="flex-1"></div>

          {/* Center Icons */}
          <div className="flex items-center gap-1">
            {/* Start Button */}
            <div className="p-2 hover:bg-white/10 rounded-md cursor-pointer transition-colors group relative">
               <div className="w-6 h-6 grid grid-cols-2 gap-[2px] p-[2px] transition-transform group-hover:scale-90 group-active:scale-75">
                <div className="bg-[#00a2ed] rounded-[1px]"></div>
                <div className="bg-[#00a2ed] rounded-[1px]"></div>
                <div className="bg-[#00a2ed] rounded-[1px]"></div>
                <div className="bg-[#00a2ed] rounded-[1px]"></div>
              </div>
            </div>

            {/* Pinned/Open Apps */}
            {windows.filter(w => w.isOpen).map(window => {
              const item = items.find(i => i.id === window.id);
              return (
                <button
                  key={window.id}
                  onClick={() => focusWindow(window.id)}
                  className={`
                    p-2 rounded-md transition-all flex items-center justify-center relative group w-10 h-10
                    ${activeWindowId === window.id 
                      ? 'bg-white/10' 
                      : 'hover:bg-white/5'}
                  `}
                  title={window.title}
                >
                  <div className="flex items-center justify-center w-6 h-6">
                    {item?.imageUrl ? (
                      <img src={item.imageUrl} alt={window.title} className="w-full h-full object-contain" />
                    ) : (
                      <Monitor size={20} className="text-blue-300" />
                    )}
                  </div>
                  {/* Active Indicator */}
                  <div className={`absolute bottom-0.5 w-1.5 h-0.5 rounded-full transition-all ${activeWindowId === window.id ? 'bg-blue-400 w-3' : 'bg-gray-400'}`}></div>
                </button>
              );
            })}
          </div>

          {/* System Tray */}
          <div className="flex-1 flex justify-end items-center gap-2">
             <div className="flex flex-col items-end justify-center px-2 py-1 hover:bg-white/5 rounded-md transition-colors cursor-default">
                <div className="text-white text-xs font-medium leading-none">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-white/80 text-[10px] leading-none mt-0.5">
                  {new Date().toLocaleDateString()}
                </div>
             </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}

export default App;
