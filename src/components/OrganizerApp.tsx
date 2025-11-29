import React from 'react';
import { LayoutGrid, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import { useDesktop } from '../context/DesktopContext';

export function OrganizerApp() {
  const { setItems } = useDesktop();

  const handleOrganize = (type: 'files' | 'images' | 'cleanup') => {
    if (type === 'cleanup') {
      setItems(prev => prev.filter(item => !['notes', 'photo'].includes(item.id)));
      alert('已清理暫存檔案！');
    } else if (type === 'files') {
      setItems(prev => {
        const sorted = [...prev].sort((a, b) => {
          const isFileA = a.label.includes('.');
          const isFileB = b.label.includes('.');
          if (isFileA && !isFileB) return -1;
          if (!isFileA && isFileB) return 1;
          return 0;
        });
        
        return sorted.map((item, index) => ({
          ...item,
          x: 20 + Math.floor(index / 5) * 100,
          y: 20 + (index % 5) * 100
        }));
      });
    } else if (type === 'images') {
       alert('正在整理圖片...');
       setItems(prev => {
         const sorted = [...prev].sort((a, b) => {
           const isImgA = a.type === 'image';
           const isImgB = b.type === 'image';
           if (isImgA && !isImgB) return -1;
           if (!isImgA && isImgB) return 1;
           return 0;
         });
         
         return sorted.map((item, index) => ({
          ...item,
          x: 20 + Math.floor(index / 5) * 100,
          y: 20 + (index % 5) * 100
        }));
       });
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-2">
      <div className="p-4 bg-linear-to-br from-blue-50 to-white rounded-xl border border-blue-100 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <LayoutGrid size={18} className="text-blue-600" />
          桌面整理小幫手
        </h3>
        <p className="text-xs text-gray-500">
          自動分類與排列您的桌面圖示，保持整潔。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => handleOrganize('files')}
          className="flex flex-col items-center justify-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
            <FileText className="text-blue-500" size={24} />
          </div>
          <span className="text-sm font-medium text-gray-700">整理文件</span>
        </button>

        <button 
          onClick={() => handleOrganize('images')}
          className="flex flex-col items-center justify-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
            <ImageIcon className="text-purple-500" size={24} />
          </div>
          <span className="text-sm font-medium text-gray-700">整理圖片</span>
        </button>
        
        <button 
          onClick={() => handleOrganize('cleanup')}
          className="flex flex-col items-center justify-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-red-300 hover:shadow-md transition-all group col-span-2"
        >
          <div className="p-3 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
            <Trash2 className="text-red-500" size={24} />
          </div>
          <span className="text-sm font-medium text-gray-700">清理暫存檔</span>
        </button>
      </div>
    </div>
  );
}
