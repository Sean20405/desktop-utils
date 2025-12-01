import { useState } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import { useDesktop } from './context/DesktopContext';
import { Desktop } from './components/Desktop';
import { WindowManager } from './components/WindowManager';
import { Taskbar } from './components/Taskbar';

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMaximized: boolean;
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
      position: { x: 250, y: 20 },
      size: { width: 1100, height: 650 },
      isMaximized: false,
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

  const toggleMaximize = (id: string) => {
    setWindows(prev => prev.map(w => {
      if (w.id === id) {
        return { ...w, isMaximized: !w.isMaximized };
      }
      return w;
    }));
  };

  const resizeWindow = (id: string, size: { width: number; height: number }) => {
    setWindows(prev => prev.map(w => {
      if (w.id === id) {
        return { ...w, size };
      }
      return w;
    }));
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="relative w-full h-full overflow-hidden">
        <Desktop onOpenWindow={openWindow} />
        <WindowManager
          windows={windows}
          activeWindowId={activeWindowId}
          onCloseWindow={closeWindow}
          onFocusWindow={focusWindow}
          onToggleMaximize={toggleMaximize}
          onResizeWindow={resizeWindow}
        />
        <Taskbar
          windows={windows}
          activeWindowId={activeWindowId}
          onFocusWindow={focusWindow}
        />
      </div>
    </DndContext>
  );
}

export default App;
