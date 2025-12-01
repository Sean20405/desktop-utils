import { Monitor } from 'lucide-react';
import { useDesktop } from '../context/DesktopContext';
import { getAssetUrl } from '../utils/assetUtils';

interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  position: { x: number; y: number };
  type: 'organizer' | 'folder' | 'settings';
}

interface TaskbarProps {
  windows: WindowState[];
  activeWindowId: string | null;
  onFocusWindow: (id: string) => void;
}

export function Taskbar({ windows, activeWindowId, onFocusWindow }: TaskbarProps) {
  const { items } = useDesktop();

  return (
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
              onClick={() => onFocusWindow(window.id)}
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
                  <img src={getAssetUrl(item.imageUrl)} alt={window.title} className="w-full h-full object-contain" />
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
  );
}
