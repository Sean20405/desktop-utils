import { useState, useEffect } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import { useDesktop } from './context/DesktopContext';
import { Desktop } from './components/Desktop';
import { WindowManager } from './components/WindowManager';
import { Taskbar } from './components/Taskbar';
import { SearchBar } from './components/SearchBar';
import { UploadScreen } from './components/UploadScreen';
import type { SimpleRule, TagItem, HistoryEntry } from './components/OrganizerTypes';
import { loadDebugData } from './utils/debugUtils';
import { findNearestAvailablePosition } from './utils/gridUtils';

const SKIP_UPLOAD = false; // Set to true to skip upload screen for debugging

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
  const { items, updateItemPosition, isLoaded, setItems, setIsLoaded, setReferenceSize, referenceSize } = useDesktop();
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [savedRules, setSavedRules] = useState<SimpleRule[]>(() => {
    const savedRulesData = localStorage.getItem('organizerSavedRules');
    if (savedRulesData) {
      try {
        return JSON.parse(savedRulesData);
      } catch (e) {
        console.error('Failed to parse saved rules data:', e);
      }
    }
    return [];
  });

  const [tags, setTags] = useState<TagItem[]>(() => {
    const savedTags = localStorage.getItem('organizerTags');
    if (savedTags) {
      try {
        return JSON.parse(savedTags);
      } catch (e) {
        console.error('Failed to parse saved tags:', e);
      }
    }
    return [];
  });

  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>(() => {
    const savedHistory = localStorage.getItem('organizerHistory');
    if (savedHistory) {
      try {
        return JSON.parse(savedHistory);
      } catch (e) {
        console.error('Failed to parse saved history:', e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('organizerTags', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem('organizerHistory', JSON.stringify(historyItems));
  }, [historyItems]);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (SKIP_UPLOAD && !isLoaded) {
      loadDebugData().then(({ items, size }) => {
        setItems(items);
        setReferenceSize(size);
        setIsLoaded(true);
      });
    }
  }, [isLoaded, setItems, setReferenceSize, setIsLoaded]);

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

  // 監聽 Ctrl+F 快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save savedRules to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('organizerSavedRules', JSON.stringify(savedRules));
  }, [savedRules]);

  if (!isLoaded) {
    return (
      <UploadScreen
        onDataLoaded={(newItems, size) => {
          setItems(newItems);
          setReferenceSize(size);
          setIsLoaded(true);
        }}
      />
    );
  }

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
        const TASKBAR_HEIGHT = 48;

        // Calculate responsive scaling ratio
        const ratioX = windowSize.width / referenceSize.width;
        const ratioY = Math.max(0, windowSize.height - TASKBAR_HEIGHT) / Math.max(1, referenceSize.height - TASKBAR_HEIGHT);

        // Apply delta with scaling
        const newX = item.x + delta.x / ratioX;
        const newY = item.y + delta.y / ratioY;

        // Find nearest available position (prevents overlaps)
        const { x: finalX, y: finalY } = findNearestAvailablePosition(
          newX,
          newY,
          iconId,
          items
        );

        updateItemPosition(iconId, finalX, finalY);
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
        <Desktop 
          onOpenWindow={openWindow} 
          searchQuery={searchQuery} 
          savedRules={savedRules}
          tags={tags}
          historyItems={historyItems}
        />
        <WindowManager
          windows={windows}
          activeWindowId={activeWindowId}
          onCloseWindow={closeWindow}
          onFocusWindow={focusWindow}
          onToggleMaximize={toggleMaximize}
          onResizeWindow={resizeWindow}
          savedRules={savedRules}
          setSavedRules={setSavedRules}
          tags={tags}  
          setTags={setTags}
          historyItems={historyItems}
          setHistoryItems={setHistoryItems}
        />
        <Taskbar
          windows={windows}
          activeWindowId={activeWindowId}
          onFocusWindow={focusWindow}
        />
        <SearchBar
          isOpen={isSearchOpen}
          onClose={() => {
            setIsSearchOpen(false);
            setSearchQuery('');
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>
    </DndContext>
  );
}

export default App;
