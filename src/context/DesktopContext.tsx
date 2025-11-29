import { createContext, useContext, useState, type ReactNode } from 'react';
import initialData from '../data/desktop-icons.json';

export interface DesktopItem {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  imageUrl?: string;
}

interface DesktopContextType {
  items: DesktopItem[];
  background: string;
  setItems: React.Dispatch<React.SetStateAction<DesktopItem[]>>;
  updateItemPosition: (id: string, x: number, y: number) => void;
}

const DesktopContext = createContext<DesktopContextType | undefined>(undefined);

export function DesktopProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DesktopItem[]>(initialData.icons);
  const [background] = useState<string>(initialData.background);

  const updateItemPosition = (id: string, x: number, y: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, x, y } : item
    ));
  };

  return (
    <DesktopContext.Provider value={{ items, background, setItems, updateItemPosition }}>
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
