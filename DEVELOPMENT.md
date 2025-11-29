# Development Guide

## 0. 環境建置與執行 (Setup & Run)

1.  Clone 專案
    ```bash
    git clone https://github.com/Sean20405/desktop-utils.git
    cd desktop-utils
    ```

2.  安裝 dependencies
    確保你已經安裝了 [Node.js](https://nodejs.org/zh-tw/download) (建議 v24+)。
    ```bash
    npm install
    ```

3.  啟動開發伺服器
    ```bash
    npm run dev
    ```

## 專案結構

```
src/
├── components/
│   ├── OrganizerApp.tsx    # 桌面管理程式主內容
│   ├── Window.tsx          # 視窗元件
│   ├── WindowManager.tsx   # 視窗管理器
│   ├── Desktop.tsx         # 桌面容器 (背景與圖示)
│   ├── DesktopIcon.tsx     # 桌面圖示元件
│   └── Taskbar.tsx         # 工作列
├── context/
│   └── DesktopContext.tsx  # 提供桌面圖示狀態與操作方法
├── data/                   # 模擬資料庫（desktop.json）
├── App.tsx                 # 主程式入口（桌面容器、視窗管理、工作列）
└── index.css               # 全域樣式與 Tailwind 設定
public/
└── icons/                  # 存放桌面圖示圖片 (.svg, .png)
```

## 2. 設定桌面內容 (Desktop Configuration)

桌面的背景圖片與圖示都定義在 `src/data/desktop-icons.json` 中。

### 2.1 修改背景圖片

直接修改 JSON 檔中的 `background` 欄位：

```json
{
  "background": "https://your-image-url.com/bg.jpg",
  "icons": [ ... ]
}
```

### 2.2 新增桌面圖示

在 `icons` 陣列中新增一個物件：

1.  將圖片檔案放入 `public/icons/` 資料夾。
2.  編輯 `src/data/desktop-icons.json`：

    ```json
    {
      "id": "unique-id",
      "label": "顯示名稱",
      "type": "app",
      "x": 20,
      "y": 20,
      "imageUrl": "/icons/your-icon.svg"
    }
    ```

## 3. 實作桌面整理功能 (Implementing Desktop Organization)

本專案的核心功能是透過 `OrganizerApp` 來整理桌面圖示。這涉及到讀取目前的圖示狀態、計算新的座標位置，並更新狀態。

### 3.1 理解狀態管理 (DesktopContext)

所有的桌面圖示狀態都儲存在 `DesktopContext` 中。你可以透過 `useDesktop` hook 來存取：

*   **`items`**: `DesktopItem[]` - 目前桌面上所有圖示的陣列。每個 item 包含 `id`, `label`, `type`, `x`, `y`, `imageUrl`。
*   **`setItems`**: `React.Dispatch` - 用來更新整個圖示列表的函式。這是實作排序或過濾功能的關鍵。
*   **`updateItemPosition`**: `(id, x, y) => void` - 僅更新單一圖示位置的輔助函式（通常用於拖曳結束時）。

>[!Note]
> 程式運行中的圖示狀態都儲存在 `DesktopContext`，而非 `/data/desktop.json`，該檔案僅負責紀錄初始位置。此設計是避免頻繁修改檔案內容，以及保留初始桌面狀態，以供下次啟動使用。

### 3.2 實作整理邏輯

要在 `OrganizerApp.tsx` 中實作整理功能，請遵循以下步驟：

1.  **引入 Hook**：
    ```tsx
    import { useDesktop } from '../context/DesktopContext';
    
    export function OrganizerApp() {
      const { items, setItems } = useDesktop();
      // ...
    }
    ```

2.  **定義排列演算法**：
    你需要一個函式來計算每個圖示的新 `x` 和 `y` 座標。
    
    *   **網格系統**：假設每個圖示佔用 `100x100` 的空間，起始位置為 `(20, 20)`。
    *   **排序邏輯**：可以根據 `type` (檔案類型) 或 `label` (名稱) 進行排序。

3.  **更新狀態**：
    使用 `setItems` 來套用新的順序與座標。

    ```tsx
    const handleOrganize = () => {
      setItems(prevItems => {
        // 1. 先進行排序 (例如：將圖片排在前面)
        const sortedItems = [...prevItems].sort((a, b) => {
           if (a.type === 'image' && b.type !== 'image') return -1;
           if (a.type !== 'image' && b.type === 'image') return 1;
           return 0;
        });

        // 2. 再重新計算座標 (排成網格)
        return sortedItems.map((item, index) => ({
          ...item,
          // 每 5 個換一行 (直向排列範例)
          x: 20 + Math.floor(index / 5) * 100, 
          y: 20 + (index % 5) * 100
        }));
      });
    };
    ```

### 3.3 實作清理功能 (Cleanup)

如果你需要移除特定類型的檔案（例如暫存檔），可以使用 `filter`：

```tsx
const handleCleanup = () => {
  setItems(prev => prev.filter(item => item.type !== 'temp'));
};
```