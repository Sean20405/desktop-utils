import { Window } from './Window';
import { OrganizerApp } from './OrganizerApp';

interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMaximized: boolean;
  type: 'organizer' | 'folder' | 'settings';
}

interface WindowManagerProps {
  windows: WindowState[];
  activeWindowId: string | null;
  onCloseWindow: (id: string) => void;
  onFocusWindow: (id: string) => void;
  onToggleMaximize: (id: string) => void;
  onResizeWindow: (id: string, size: { width: number; height: number }) => void;
}

export function WindowManager({ 
  windows, 
  activeWindowId, 
  onCloseWindow, 
  onFocusWindow,
  onToggleMaximize,
  onResizeWindow
}: WindowManagerProps) {
  
  const renderWindowContent = (window: WindowState) => {
    switch (window.type) {
      case 'organizer':
        return <OrganizerApp />;
      default:
        return <div className="p-4">Content for {window.title}</div>;
    }
  };

  return (
    <>
      {windows.map(window => (
        <Window
          key={window.id}
          id={window.id}
          title={window.title}
          isOpen={window.isOpen}
          onClose={() => onCloseWindow(window.id)}
          initialPosition={window.position}
          isActive={activeWindowId === window.id}
          onFocus={() => onFocusWindow(window.id)}
          isMaximized={window.isMaximized}
          size={window.size}
          onToggleMaximize={() => onToggleMaximize(window.id)}
          onResize={(size) => onResizeWindow(window.id, size)}
        >
          {renderWindowContent(window)}
        </Window>
      ))}
    </>
  );
}
