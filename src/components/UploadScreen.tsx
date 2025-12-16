import { useState, useRef } from 'react';
import { parseDesktopInfo } from '../utils/parser';
import { loadDebugData } from '../utils/debugUtils';
import type { DesktopItem } from '../context/DesktopContext';

interface UploadScreenProps {
  onDataLoaded: (items: DesktopItem[], size: { width: number; height: number }) => void;
}

export function UploadScreen({ onDataLoaded }: UploadScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSkip = async () => {
    try {
      const { items, size } = await loadDebugData();
      onDataLoaded(items, size);
    } catch (e) {
      setError('載入預設資料時發生錯誤');
      console.error(e);
    }
  };

  const handleFiles = async (files: FileList) => {
    setError(null);
    const imageMap = new Map<string, string>();
    let textContent = '';

    // First pass: collect images and find text file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.ico')) {
        imageMap.set(file.name, URL.createObjectURL(file));
      } else if (file.name === 'Desktop_Icons_Info.txt') {
        textContent = await file.text();
      }
    }

    if (!textContent) {
      setError('找不到 Desktop_Icons_Info.txt 檔案');
      return;
    }

    try {
      const items = parseDesktopInfo(textContent, imageMap);

      // Add Organizer app
      items.push({
        id: 'organizer',
        label: 'Desktop Organizer',
        type: 'app',
        x: width / 2 - 40,
        y: height / 2 - 55,
      });

      onDataLoaded(items, { width, height });
    } catch (e) {
      setError('解析檔案時發生錯誤');
      console.error(e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Handle folder drop if possible, or just files
    // Note: DataTransferItem.webkitGetAsEntry() is needed for folder recursion in drop
    // For simplicity, we assume user drops the files or uses the button for folder selection
    // If they drop a folder, files might be empty or contain the folder itself depending on browser
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className={`w-full h-full flex flex-col items-center justify-center bg-gray-100 transition-colors ${isDragging ? 'bg-blue-50' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md w-full">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">上傳桌面資訊</h2>
          <p className="text-gray-600 mb-6">
            請上傳包含 Desktop_Icons_Info.txt 的資料夾
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">原始螢幕寬度</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">原始螢幕高度</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          {...{ webkitdirectory: "", directory: "" } as any}
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors w-full"
        >
          選擇資料夾
        </button>

        <button
          onClick={handleSkip}
          className="mt-3 text-gray-500 hover:text-gray-700 text-sm underline w-full text-center"
        >
          略過上傳 (使用預設資料)
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
