import React from 'react';
import { Window } from './Window';
import { OrganizerApp } from './OrganizerApp';

interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  position: { x: number; y: number };
  type: 'organizer' | 'folder' | 'settings';
}

interface WindowManagerProps {
  windows: WindowState[];
  activeWindowId: string | null;
  onCloseWindow: (id: string) => void;
  onFocusWindow: (id: string) => void;
}

export function WindowManager({ windows, activeWindowId, onCloseWindow, onFocusWindow }: WindowManagerProps) {
  
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
        >
          {renderWindowContent(window)}
        </Window>
      ))}
    </>
  );
}
