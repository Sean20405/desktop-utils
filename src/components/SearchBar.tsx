import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function SearchBar({ isOpen, onClose, searchQuery, onSearchChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 當搜索欄打開時，自動聚焦輸入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      onSearchChange('');
    }
  }, [isOpen, onSearchChange]);

  // 處理鍵盤事件
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        onSearchChange('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSearchChange]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-4 right-4 z-[100] w-80">
      <div className="bg-white/95 backdrop-blur-xl rounded-lg shadow-2xl border border-gray-200/50">
        {/* 搜索輸入框 */}
        <div className="flex items-center gap-2 px-4 py-3">
          <Search size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜尋桌面應用程式..."
            className="flex-1 outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />
          <button
            onClick={() => {
              onClose();
              onSearchChange('');
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

