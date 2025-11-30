import React from 'react';
import { Monitor, FolderOpen, Settings, FileText, Image as ImageIcon, HelpCircle } from 'lucide-react';

export type IconType = 'app' | 'folder' | 'settings' | 'file' | 'image';

export const getIconByType = (type: string): React.ReactNode => {
  switch (type) {
    case 'app':
      return <Monitor size={32} />;
    case 'folder':
      return <FolderOpen size={32} />;
    case 'settings':
      return <Settings size={32} />;
    case 'file':
      return <FileText size={32} />;
    case 'image':
      return <ImageIcon size={32} />;
    default:
      return <HelpCircle size={32} />;
  }
};
