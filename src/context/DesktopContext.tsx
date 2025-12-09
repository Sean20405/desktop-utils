import { createContext, useContext, useState, type ReactNode } from 'react';
// import type { SimpleRule } from '../components/OrganizerTypes';
import initialData from '../data/desktop.json';

export interface DesktopItem {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  imageUrl?: string;
  path?: string;
  lastAccessed?: string; // ISO 8601 date string
  lastModified?: string; // ISO 8601 date string
  createdTime?: string;  // ISO 8601 date string
  fileSize?: number;     // File size in bytes
}

export interface Size {
  width: number;
  height: number;
}



interface DesktopContextType {
  items: DesktopItem[];
  background: string;
  isLoaded: boolean;
  referenceSize: Size;
  // savedRules: SimpleRule[];
  setItems: React.Dispatch<React.SetStateAction<DesktopItem[]>>;
  setIsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setReferenceSize: React.Dispatch<React.SetStateAction<Size>>;
  // setSavedRules: React.Dispatch<React.SetStateAction<SimpleRule[]>>;
  updateItemPosition: (id: string, x: number, y: number) => void;
}

const DesktopContext = createContext<DesktopContextType | undefined>(undefined);

export function DesktopProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DesktopItem[]>([]);
  const [background] = useState<string>(initialData.background);
  const [isLoaded, setIsLoaded] = useState(false);
  const [referenceSize, setReferenceSize] = useState<Size>({ width: 1920, height: 1080 });
  // const [savedRules, setSavedRules] = useState<SimpleRule[]>([]);

  const updateItemPosition = (id: string, x: number, y: number) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, x, y } : item
    ));
  };

  return (
    <DesktopContext.Provider value={{
      items,
      background,
      isLoaded,
      referenceSize,
      // savedRules,
      setItems,
      setIsLoaded,
      setReferenceSize,
      // setSavedRules,
      updateItemPosition
    }}>
      {children}
    </DesktopContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDesktop() {
  const context = useContext(DesktopContext);
  if (context === undefined) {
    throw new Error('useDesktop must be used within a DesktopProvider');
  }
  return context;
}
