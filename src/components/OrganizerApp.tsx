import { useEffect, useMemo, useRef, useState } from "react";
import { X, Monitor } from "lucide-react";
import { useDesktop } from "../context/DesktopContext";
import { DndContext, type DragEndEvent, useDraggable } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { assignFilesToTags, generateAndAssignTags, hasGeminiApiKey, setGeminiApiKey } from "../utils/geminiApi";
import { executeRule, parseRuleText } from "../utils/ruleEngine";
import type { RuleContext } from "../utils/ruleEngine";
import type { SimpleRule, HistoryEntry, TagItem } from './OrganizerTypes';
import type { DesktopItem } from '../context/DesktopContext';
import { HistoryPanel } from './OrganizerHistory';
import { TagsPanel } from './OrganizerTag';
import { RulesPanel, SavedRulesPanel } from './OrganizerRule';
import { getSubjectOptionsWithTags, getActionOptionsWithFolders } from './OrganizerConstants';
import { getAssetUrl } from "../utils/assetUtils";
import { generateThumbnail } from "../utils/thumbnailUtils";


// Draggable Preview File Component
function DraggablePreviewFile({
  item,
  scale,
  isSelected,
}: {
  item: { id: string; label: string; x: number; y: number; imageUrl?: string };
  scale: number;
  isSelected?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `preview-file-${item.id}`,
    data: {
      fileName: item.label,
      sourceTagId: null, // 來自 preview，不是來自任何 tag
    },
  });

  const iconSrc = getAssetUrl(item.imageUrl);
  const dragStyle = CSS.Translate.toString(transform);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute flex flex-col items-center gap-1 p-1 w-20 cursor-grab active:cursor-grabbing transition-all ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-500/20 rounded' : ''
        }`}
      style={{
        left: item.x * scale,
        top: item.y * scale,
        transform: dragStyle ? `${dragStyle} scale(${scale})` : `scale(${scale})`,
        transformOrigin: "top left",
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="w-12 h-12 flex items-center justify-center">
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={item.label}
            className="w-full h-full object-contain drop-shadow pointer-events-none"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = `${import.meta.env.BASE_URL || "/"}icons/organizer.svg`;
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-400/50 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Monitor className="w-8 h-8 text-white/80" />
          </div>
        )}
      </div>
      <div
        className="text-white text-xs font-normal drop-shadow-md text-center select-none px-1 rounded-sm line-clamp-2"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
      >
        {item.label}
      </div>
    </div>
  );
}

function DesktopPreview({
  previewItems,
  isPreviewMode,
  selectedRegion,
  onRegionChange,
  selectedItemIds,
}: {
  previewItems: DesktopItem[];
  isPreviewMode?: boolean;
  selectedRegion?: { x: number; y: number; width: number; height: number } | null;
  onRegionChange?: (region: { x: number; y: number; width: number; height: number } | null) => void;
  selectedItemIds?: Set<string>;
}) {
  const { background } = useDesktop();
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Read initial size immediately
    const initialRect = containerRef.current.getBoundingClientRect();
    if (initialRect.width > 0 && initialRect.height > 0) {
      setContainerSize({ width: initialRect.width, height: initialRect.height });
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Keep preview proportional to a 1920x1080 desktop but scaled down without stretching layout.
  const { scale, previewWidth, previewHeight } = useMemo(() => {
    const baseWidth = 1920;
    const baseHeight = 1080 - 48;

    if (containerSize.width === 0 || containerSize.height === 0) {
      return { scale: 0.32, previewWidth: baseWidth * 0.32, previewHeight: baseHeight * 0.32 };
    }

    const availableWidth = containerSize.width;
    const availableHeight = containerSize.height;

    const scaleX = availableWidth / baseWidth;
    const scaleY = availableHeight / baseHeight;
    const scale = Math.min(scaleX, scaleY);

    return {
      scale,
      previewWidth: baseWidth * scale,
      previewHeight: baseHeight * scale,
    };
  }, [containerSize]);

  // 將屏幕座標轉換為預覽座標（相對於 1920x1080）
  const screenToPreview = (screenX: number, screenY: number) => {
    if (!previewRef.current) return { x: 0, y: 0 };
    const rect = previewRef.current.getBoundingClientRect();
    const x = (screenX - rect.left) / scale;
    const y = (screenY - rect.top) / scale;
    return { x: Math.max(0, Math.min(1920, x)), y: Math.max(0, Math.min(1080 - 48, y)) };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onRegionChange || e.button !== 0) return; // 只處理左鍵
    const previewPos = screenToPreview(e.clientX, e.clientY);
    setIsSelecting(true);
    setSelectionStart(previewPos);
    setCurrentSelection({ x: previewPos.x, y: previewPos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart) return;
    const previewPos = screenToPreview(e.clientX, e.clientY);
    const x = Math.min(selectionStart.x, previewPos.x);
    const y = Math.min(selectionStart.y, previewPos.y);
    const width = Math.abs(previewPos.x - selectionStart.x);
    const height = Math.abs(previewPos.y - selectionStart.y);
    setCurrentSelection({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isSelecting || !currentSelection) return;
    // 只有當選擇區域足夠大時才保存
    if (currentSelection.width > 10 && currentSelection.height > 10) {
      onRegionChange?.(currentSelection);
    } else {
      onRegionChange?.(null);
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setCurrentSelection(null);
  };

  // 顯示的區域（優先顯示當前選擇，否則顯示已保存的區域）
  const displayRegion = currentSelection || selectedRegion;

  return (
    <div ref={containerRef} className="w-full h-full relative border border-gray-500 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
      <div
        ref={previewRef}
        className="relative rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10"
        style={{
          width: previewWidth,
          height: previewHeight,
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "top center",
          backgroundRepeat: "no-repeat",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {previewItems.map((item) => (
          <DraggablePreviewFile
            key={item.id}
            item={item}
            scale={scale}
            isSelected={selectedItemIds?.has(item.id)}
          />
        ))}
        {displayRegion && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
            style={{
              left: displayRegion.x * scale,
              top: displayRegion.y * scale,
              width: displayRegion.width * scale,
              height: displayRegion.height * scale,
            }}
          />
        )}
        {isPreviewMode && (
          <div className="absolute bottom-4 right-4 bg-blue-500 text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium">
            Preview Mode
          </div>
        )}
        {selectedRegion && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
            已選擇區域
          </div>
        )}
      </div>
    </div>
  );
}

export function OrganizerApp({
  savedRules,
  setSavedRules,
  tags,
  setTags,
  historyItems,
  setHistoryItems
}: {
  savedRules: SimpleRule[];
  setSavedRules: React.Dispatch<React.SetStateAction<SimpleRule[]>>;
  tags: TagItem[];
  setTags: React.Dispatch<React.SetStateAction<TagItem[]>>;
  historyItems: HistoryEntry[];
  setHistoryItems: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
}) {
  const [tab, setTab] = useState<"rule" | "tag" | "history" | "saved">("tag");

  // Load rules from localStorage or use default
  const [rules, setRules] = useState<SimpleRule[]>(() => {
    const savedRules = localStorage.getItem('organizerRules');
    if (savedRules) {
      try {
        return JSON.parse(savedRules);
      } catch (e) {
        console.error('Failed to parse saved rules:', e);
      }
    }
    return [
      { id: "rule-1", text: 'Tags > game + Put in "game" folder' },
      { id: "rule-2", text: 'File Type > .txt + Put in "text file" folder' },
    ];
  });


  const [openSavedMenu, setOpenSavedMenu] = useState<string | null>(null);
  const [openRuleMenu, setOpenRuleMenu] = useState<string | null>(null);
  const savedMenuRef = useRef<HTMLDivElement | null>(null);
  const ruleMenuRef = useRef<HTMLDivElement | null>(null);
  const [subjectSelection, setSubjectSelection] = useState<string>("");
  const [actionSelection, setActionSelection] = useState<string>("");
  // Load folders from localStorage or start with empty array
  const [folders, setFolders] = useState<string[]>(() => {
    const savedFolders = localStorage.getItem('organizerFolders');
    if (savedFolders) {
      try {
        return JSON.parse(savedFolders);
      } catch (e) {
        console.error('Failed to parse saved folders:', e);
      }
    }
    return [];
  });

  // Load F-string patterns from localStorage
  const [fstringPatterns, setFstringPatterns] = useState<string[]>(() => {
    const saved = localStorage.getItem('organizerFstringPatterns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved F-string patterns:', e);
      }
    }
    return [];
  });

  // Load Time conditions from localStorage
  const [timeConditions, setTimeConditions] = useState<string[]>(() => {
    const saved = localStorage.getItem('organizerTimeConditions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved Time conditions:', e);
      }
    }
    return [];
  });

  // Load Zip names from localStorage (separate from folders)
  const [zipNames, setZipNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('organizerZipNames');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved Zip names:', e);
      }
    }
    return [];
  });
  // History is now managed from parent (App.tsx), no need for local state
  // Load tags from localStorage or start with empty array
  // const [tags, setTags] = useState<{ id: string; name: string; color: string; items: string[]; expanded: boolean }[]>(() => {
  //   const savedTags = localStorage.getItem('organizerTags');
  //   if (savedTags) {
  //     try {
  //       return JSON.parse(savedTags);
  //     } catch (e) {
  //       console.error('Failed to parse saved tags:', e);
  //     }
  //   }
  //   return [];
  // });
  // Load last applied items from localStorage
  const [lastAppliedItems, setLastAppliedItems] = useState<DesktopItem[] | null>(() => {
    const saved = localStorage.getItem('organizerLastApplied');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved last applied items:', e);
      }
    }
    return null;
  });

  // Save last applied items to localStorage whenever they change
  useEffect(() => {
    if (lastAppliedItems) {
      localStorage.setItem('organizerLastApplied', JSON.stringify(lastAppliedItems));
    }
  }, [lastAppliedItems]);

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isAssigningTags, setIsAssigningTags] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [pendingAction, setPendingAction] = useState<"generate" | "assign" | null>(null);
  const { items, setItems } = useDesktop();

  // Preview state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewItems, setPreviewItems] = useState<DesktopItem[]>(items);
  const [selectedRegion, setSelectedRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Update preview items when desktop items change
  useEffect(() => {
    if (!isPreviewMode) {
      setPreviewItems(items);
    }
  }, [items, isPreviewMode]);

  // Save rules to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('organizerRules', JSON.stringify(rules));
  }, [rules]);

  // Save savedRules to localStorage whenever they change
  // useEffect(() => {
  //   localStorage.setItem('organizerSavedRules', JSON.stringify(savedRules));
  // }, [savedRules]);

  // Save tags to localStorage whenever they change
  // useEffect(() => {
  //   localStorage.setItem('organizerTags', JSON.stringify(tags));
  // }, [tags]);

  // Save folders to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('organizerFolders', JSON.stringify(folders));
  }, [folders]);

  // Save F-string patterns to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('organizerFstringPatterns', JSON.stringify(fstringPatterns));
  }, [fstringPatterns]);

  // Save Time conditions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('organizerTimeConditions', JSON.stringify(timeConditions));
  }, [timeConditions]);

  // Save Zip names to localStorage
  useEffect(() => {
    localStorage.setItem('organizerZipNames', JSON.stringify(zipNames));
  }, [zipNames]);

  const handleRollback = (id: string) => {
    const entry = historyItems.find((item) => item.id === id);
    if (entry && entry.items) {
      setItems(entry.items);
      return true;
    } else {
      alert('無法還原：找不到該歷史紀錄或該紀錄無備份資料');
      return false;
    }
  };

  const toggleHistoryStar = (id: string) => {
    setHistoryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item))
    );
  };

  const deleteHistoryItem = (id: string) => {
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddRule = () => {
    if (!subjectSelection || !actionSelection) return;

    // Build the complete subject text
    let finalSubject = subjectSelection;

    // For F-string and Time, the selection already contains the complete info
    // e.g., "F-string: *.txt" or "Time > Last Accessed within 2024-12-10"
    // No need to modify them further

    // Build the complete action text
    let finalAction = actionSelection;
    if (actionSelection.startsWith('Put in folder > ')) {
      const folderPart = actionSelection.replace('Put in folder > ', '');

      // Handle "New folder..." option (though this is now handled via input field)
      if (folderPart === 'New folder...') {
        const newFolderName = window.prompt('請輸入新資料夾名稱:');
        if (!newFolderName || !newFolderName.trim()) {
          return; // User cancelled or entered empty name
        }
        const trimmedName = newFolderName.trim();

        // Add to folders list if not already exists
        if (!folders.includes(trimmedName)) {
          setFolders((prev) => [...prev, trimmedName]);
        }

        finalAction = `Put in \"${trimmedName}\" folder`;
      } else {
        // Use selected folder from the list
        finalAction = `Put in \"${folderPart}\" folder`;
      }
    } else if (actionSelection.startsWith('Zip > ')) {
      const folderPart = actionSelection.replace('Zip > ', '');

      // Handle input from Zip folder selection
      if (folderPart === 'New folder...') {
        const newFolderName = window.prompt('請輸入新 Zip 檔案名稱:');
        if (!newFolderName || !newFolderName.trim()) {
          return; // User cancelled or entered empty name
        }
        const trimmedName = newFolderName.trim();

        // Add to folders list if not already exists (shared with Put in folder)
        if (!folders.includes(trimmedName)) {
          setFolders((prev) => [...prev, trimmedName]);
        }

        finalAction = `Zip in \"${trimmedName}\" folder`;
      } else {
        // Use selected folder name from the list
        finalAction = `Zip in \"${folderPart}\" folder`;
      }
    } else if (actionSelection === "Delete") {
      // Delete action doesn't need modification
      finalAction = "Delete";
    }

    const text = `${finalSubject} + ${finalAction}`;
    setRules((prev) => [...prev, {
      id: `rule-${Date.now()}`,
      text,
      selectedRegion: selectedRegion, // 將當前區域選取保存到規則對象
    }]);
    setSubjectSelection("");
    setActionSelection("");
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const handleSaveRule = () => {
    // 如果規則列表是空的，就不儲存
    if (rules.length === 0) {
      alert("目前沒有任何規則可以儲存");
      return;
    }

    // 跳出命名視窗
    const defaultName = `My Rule Set ${savedRules.length + 1}`;
    const ruleName = window.prompt("請為此規則組合輸入名稱:", defaultName);

    if (ruleName === null) return; // 使用者按取消

    const finalName = ruleName.trim() || defaultName;

    // 建立一個包含當前所有規則的物件
    // 規則對象已經包含各自的區域信息，所以直接複製即可
    const newSavedRule: SimpleRule = {
      id: `saved-${Date.now()}`,
      name: finalName,
      text: `${rules.length} rules`, // 這裡的 text 僅作顯示用途(fallback)
      // 關鍵：將目前的 rules 陣列完整複製一份存起來（包含各自的區域信息）
      rules: rules.map(rule => ({
        ...rule,
        // 確保每個規則都包含區域信息（如果有的話）
        selectedRegion: rule.selectedRegion ?? selectedRegion,
      })),
      // 保存全局區域選取作為後備（向後兼容）
      selectedRegion: selectedRegion,
    };

    setSavedRules((prev) => [newSavedRule, ...prev]);
  };

  const handleRuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRules((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleEditRule = (id: string) => {
    const current = rules.find((r) => r.id === id);
    if (!current) return;
    const next = window.prompt("Edit rule", current.text);
    if (next && next.trim()) {
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, text: next.trim() } : r)));
    }
  };

  // 注意：這裡的參數從 text 改為 rule 物件，因為我們需要存取內部的 rules 陣列
  const addSavedToApplied = (savedItem: SimpleRule) => {
    if (savedItem.rules && savedItem.rules.length > 0) {
      // 情況 A: 這是一個規則群組（包含多條規則）
      // 我們需要為每條規則生成新的 ID，避免 ID 衝突
      // 保留規則對象中的區域信息
      const newRules = savedItem.rules.map(r => ({
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: r.text,
        // 保留規則的區域信息，如果沒有則使用保存規則的全局區域（向後兼容）
        selectedRegion: r.selectedRegion ?? savedItem.selectedRegion,
      }));

      // 將整組規則加入到現有列表的後方
      setRules((prev) => [...prev, ...newRules]);

      // 如果有全局區域選取，也設置到組件狀態（用於 UI 顯示）
      if (savedItem.selectedRegion) {
        setSelectedRegion(savedItem.selectedRegion);
      }
    } else {
      // 情況 B: 舊的單一規則或是手動建立的單一規則
      setRules((prev) => [...prev, {
        id: `rule-${Date.now()}`,
        text: savedItem.text,
        // 保留區域信息
        selectedRegion: savedItem.selectedRegion,
      }]);

      // 如果有區域選取，設置到組件狀態（用於 UI 顯示）
      if (savedItem.selectedRegion) {
        setSelectedRegion(savedItem.selectedRegion);
      }
    }
  };

  const deleteSavedRule = (id: string) => {
    setSavedRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const handleRenameFolder = (oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return;
    const trimmedNewName = newName.trim();

    // Check for duplicates
    if (folders.includes(trimmedNewName) && oldName !== trimmedNewName) {
      alert('此資料夾名稱已存在');
      return;
    }

    setFolders((prev) => prev.map(f => f === oldName ? trimmedNewName : f));
  };

  const handleAddFolder = (folderName: string) => {
    if (!folderName.trim()) return;
    const trimmedName = folderName.trim();

    // Check for duplicates
    if (folders.includes(trimmedName)) {
      alert('此資料夾名稱已存在');
      return;
    }

    setFolders((prev) => [...prev, trimmedName]);
  };

  const handleDeleteFolder = (folderName: string) => {
    setFolders((prev) => prev.filter(f => f !== folderName));
  };

  const handleAddFstringPattern = (pattern: string) => {
    if (!pattern.trim()) return;
    const trimmedPattern = pattern.trim();
    if (fstringPatterns.includes(trimmedPattern)) {
      return; // Silently ignore duplicates
    }
    setFstringPatterns((prev) => [...prev, trimmedPattern]);
  };

  const handleDeleteFstringPattern = (pattern: string) => {
    setFstringPatterns((prev) => prev.filter(p => p !== pattern));
  };

  const handleAddTimeCondition = (condition: string) => {
    if (!condition.trim()) return;
    const trimmedCondition = condition.trim();
    if (timeConditions.includes(trimmedCondition)) {
      return; // Silently ignore duplicates
    }
    setTimeConditions((prev) => [...prev, trimmedCondition]);
  };

  const handleDeleteTimeCondition = (condition: string) => {
    setTimeConditions((prev) => prev.filter(c => c !== condition));
  };

  const handleAddZipName = (zipName: string) => {
    if (!zipName.trim()) return;
    const trimmedName = zipName.trim();
    if (zipNames.includes(trimmedName)) {
      return; // Silently ignore duplicates
    }
    setZipNames((prev) => [...prev, trimmedName]);
  };

  const handleDeleteZipName = (zipName: string) => {
    setZipNames((prev) => prev.filter(z => z !== zipName));
  };

  // Handle Preview
  // 過濾區域內的檔案（需要完全包覆，x 軸和 y 軸都需要完全包覆）
  const filterItemsByRegion = (itemsToFilter: DesktopItem[], region: { x: number; y: number; width: number; height: number } | null): DesktopItem[] => {
    if (!region) return itemsToFilter;

    // 圖標大小：GRID_WIDTH x GRID_HEIGHT = 100x110px
    const iconWidth = 100;
    const iconHeight = 110;

    return itemsToFilter.filter(item => {
      const itemX = item.x;
      const itemY = item.y;
      const itemRight = itemX + iconWidth;
      const itemBottom = itemY + iconHeight;

      // 檢查檔案的整個圖標是否完全在區域內（x 軸和 y 軸都需要完全包覆）
      return itemX >= region.x &&
        itemRight <= region.x + region.width &&
        itemY >= region.y &&
        itemBottom <= region.y + region.height;
    });
  };

  // 計算哪些檔案被框選到（用於高亮顯示）
  const selectedItemIds = useMemo(() => {
    if (!selectedRegion) return new Set<string>();
    return new Set(filterItemsByRegion(items, selectedRegion).map(item => item.id));
  }, [selectedRegion, items]);

  const handlePreview = () => {
    // If already in preview mode, toggle off
    if (isPreviewMode) {
      setIsPreviewMode(false);
      setPreviewItems(items);
      return;
    }

    if (rules.length === 0) {
      alert('請先添加至少一個規則');
      return;
    }

    // Execute all rules in order
    let resultItems = [...items];
    let success = false;

    for (const rule of rules) {
      const parsed = parseRuleText(rule.text);
      if (parsed) {
        // 從規則對象讀取區域信息，如果沒有則使用全局的 selectedRegion（向後兼容）
        const ruleRegion = rule.selectedRegion ?? selectedRegion;

        // 如果有限定區域，只對區域內的檔案執行規則
        const context: RuleContext = {
          items: ruleRegion ? filterItemsByRegion(resultItems, ruleRegion) : resultItems,
          tags: tags,
          selectedRegion: ruleRegion,
        };
        const result = executeRule(parsed.subject, parsed.action, context);
        if (result) {
          // 合併結果：保留區域外的檔案，更新區域內的檔案
          if (ruleRegion) {
            const regionItems = filterItemsByRegion(resultItems, ruleRegion);
            const nonRegionItems = resultItems.filter(item =>
              !regionItems.some(ri => ri.id === item.id)
            );
            resultItems = [...nonRegionItems, ...result.items];
          } else {
            resultItems = result.items;
          }
          success = true;
        }
      }
    }

    if (success) {
      setPreviewItems(resultItems);
      setIsPreviewMode(true);
    } else {
      alert('無法執行這些規則，請檢查規則格式');
    }
  };

  // Handle Apply
  const handleApply = async () => {
    if (rules.length === 0) {
      alert('請先添加至少一個規則');
      return;
    }

    setIsApplying(true);

    try {
      // Execute all rules in order
      let resultItems = [...items];
      const descriptions: string[] = [];

      for (const rule of rules) {
        const parsed = parseRuleText(rule.text);
        if (parsed) {
          // 從規則對象讀取區域信息，如果沒有則使用全局的 selectedRegion（向後兼容）
          const ruleRegion = rule.selectedRegion ?? selectedRegion;

          // 如果有限定區域，只對區域內的檔案執行規則
          const context: RuleContext = {
            items: ruleRegion ? filterItemsByRegion(resultItems, ruleRegion) : resultItems,
            tags: tags,
            selectedRegion: ruleRegion,
          };
          const result = executeRule(parsed.subject, parsed.action, context);
          if (result) {
            // 合併結果：保留區域外的檔案，更新區域內的檔案
            if (ruleRegion) {
              const regionItems = filterItemsByRegion(resultItems, ruleRegion);
              const nonRegionItems = resultItems.filter(item =>
                !regionItems.some(ri => ri.id === item.id)
              );
              resultItems = [...nonRegionItems, ...result.items];
            } else {
              resultItems = result.items;
            }
            descriptions.push(result.description);
          }
        }
      }

      if (descriptions.length > 0) {
        // Use a small delay to allow UI to update to loading state
        await new Promise(resolve => setTimeout(resolve, 100));

        const now = new Date();
        const timeStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // 1. Save "Before" state (Manual Changes) if different from last applied
        // If lastAppliedItems is null, we assume it's different (first run or cleared)
        const isDifferent = !lastAppliedItems || JSON.stringify(items) !== JSON.stringify(lastAppliedItems);

        if (isDifferent) {
          const thumbnailBefore = await generateThumbnail(items);
          const beforeHistoryEntry: HistoryEntry = {
            id: `h-${Date.now()}-before`,
            time: timeStr,
            title: `Before apply rule: ${descriptions.join(', ')}`,
            starred: false,
            items: items,
            thumbnail: thumbnailBefore,
          };
          setHistoryItems((prev) => [beforeHistoryEntry, ...prev]);
        }

        // Apply to actual desktop FIRST to render the new state
        setItems(resultItems);
        setLastAppliedItems(resultItems);
        setPreviewItems(resultItems);
        setIsPreviewMode(false);  // Exit preview mode after applying

        // Wait for DOM to update with new items
        await new Promise(resolve => setTimeout(resolve, 500));

        // 2. Save "After" state (Rule Result)
        const thumbnailAfter = await generateThumbnail(resultItems);
        const afterHistoryEntry: HistoryEntry = {
          id: `h-${Date.now()}-after`,
          time: timeStr,
          title: `Rules: ${descriptions.join(', ')}`,
          starred: false,
          items: resultItems,
          thumbnail: thumbnailAfter,
        };
        setHistoryItems((prev) => [afterHistoryEntry, ...prev]);

        alert('規則已成功應用!');
      } else {
        alert('無法執行這些規則，請檢查規則格式');
      }
    } catch (error) {
      console.error('Error applying rules:', error);
      alert('應用規則時發生錯誤');
    } finally {
      setIsApplying(false);
    }
  };

  const createNewTag = () => {
    const baseName = "NewTag";
    let counter = 0;
    let newName = baseName;

    while (tags.some((tag) => tag.name === newName)) {
      counter++;
      newName = `${baseName}${counter}`;
    }

    const newTag = {
      id: `tag-${Date.now()}`,
      name: newName,
      color: "#fb923c",
      items: [],
      expanded: true,
    };
    setTags((prev) => [...prev, newTag]);
  };

  const deleteTag = (id: string) => {
    setTags((prev) => prev.filter((tag) => tag.id !== id));
  };

  const deleteAllTags = () => {
    if (tags.length === 0) return;
    if (window.confirm(`確定要刪除所有 ${tags.length} 個標籤嗎？`)) {
      setTags([]);
    }
  };

  const removeFileFromTag = (tagId: string, fileName: string) => {
    setTags((prev) =>
      prev.map((tag) => {
        if (tag.id === tagId) {
          return {
            ...tag,
            items: tag.items.filter((item) => item !== fileName),
          };
        }
        return tag;
      })
    );
  };

  const toggleTagExpand = (id: string) => {
    setTags((prev) => prev.map((tag) => (tag.id === id ? { ...tag, expanded: !tag.expanded } : tag)));
  };

  const startEditingTag = (id: string, currentName: string) => {
    setEditingTagId(id);
    setEditingName(currentName);
  };

  const saveTagName = (id: string) => {
    if (editingName.trim()) {
      setTags((prev) => prev.map((tag) => (tag.id === id ? { ...tag, name: editingName.trim() } : tag)));
    }
    setEditingTagId(null);
    setEditingName("");
  };

  const updateTagColor = (id: string, color: string) => {
    setTags((prev) => prev.map((tag) => (tag.id === id ? { ...tag, color } : tag)));
  };

  const handleTagDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // 調試：輸出拖放信息
    console.log("Drag end:", { activeId, overId, activeData: active.data.current });

    // 檢查是否拖動的是檔案（從 tag 中的檔案或 preview 中的檔案）
    if (activeId.startsWith("file-") || activeId.startsWith("preview-file-")) {
      const activeData = active.data.current;
      if (!activeData) {
        console.log("No active data");
        return;
      }

      const fileName = activeData.fileName as string;
      const sourceTagId = activeData.sourceTagId as string | null;

      console.log("File drag:", { fileName, sourceTagId, overId });

      // 檢查是否拖放到 tag 上
      let targetTagId: string | null = null;

      // 首先檢查 over.data 中是否有 tagId
      const overData = over.data.current;
      if (overData && overData.type === 'tag-drop-zone' && overData.tagId) {
        targetTagId = overData.tagId as string;
        console.log("Found tag from over.data, targetTagId:", targetTagId);
      } else if (overId.startsWith("tag-drop-")) {
        targetTagId = overId.replace("tag-drop-", "");
        console.log("Found tag-drop, targetTagId:", targetTagId);
      } else {
        // 檢查 overId 是否是某個 tag 的 id
        const targetTag = tags.find(tag => tag.id === overId);
        if (targetTag) {
          targetTagId = overId;
          console.log("Found tag by id, targetTagId:", targetTagId);
        } else {
          console.log("No matching tag found for overId:", overId, "overData:", overData);
        }
      }

      if (targetTagId) {
        console.log("Moving file:", { fileName, from: sourceTagId, to: targetTagId });
        setTags((prevTags) => {
          return prevTags.map((tag) => {
            // 從源 tag 中移除檔案（如果有的話，且不是拖放到同一個 tag）
            if (sourceTagId && tag.id === sourceTagId && tag.id !== targetTagId) {
              console.log("Removing from source tag:", tag.id);
              return {
                ...tag,
                items: tag.items.filter((item) => item !== fileName),
              };
            }

            // 添加到目標 tag（如果檔案不在該 tag 中）
            if (tag.id === targetTagId && !tag.items.includes(fileName)) {
              console.log("Adding to target tag:", tag.id);
              return {
                ...tag,
                items: [...tag.items, fileName],
              };
            }

            return tag;
          });
        });
      } else {
        console.log("No target tag found");
      }
    } else {
      // 拖動的是 tag 本身，進行排序
      // 只有在 overId 是 tag.id 且不是檔案拖放時才進行排序
      const isTagId = tags.some(tag => tag.id === overId);
      if (isTagId && activeId !== overId && !activeId.startsWith("file-") && !activeId.startsWith("preview-file-")) {
        setTags((items) => {
          const oldIndex = items.findIndex((item) => item.id === activeId);
          const newIndex = items.findIndex((item) => item.id === overId);

          if (oldIndex !== -1 && newIndex !== -1) {
            return arrayMove(items, oldIndex, newIndex);
          }
          return items;
        });
      }
    }
  };

  // 處理 API Key 輸入
  const handleApiKeySubmit = () => {
    if (!apiKeyInput.trim()) {
      alert('請輸入 Gemini API Key');
      return;
    }
    const apiKey = apiKeyInput.trim();
    setGeminiApiKey(apiKey);
    setShowApiKeyDialog(false);
    setApiKeyInput("");

    // 執行待處理的操作（使用 setTimeout 確保 sessionStorage 已更新）
    const action = pendingAction;
    setPendingAction(null);

    setTimeout(() => {
      if (action === "generate") {
        handleAIGenerateTags();
      } else if (action === "assign") {
        handleAIAssignTags();
      }
    }, 0);
  };

  // AI Generate Tag 功能（現在會同時分配檔案）
  const handleAIGenerateTags = async () => {
    if (isGeneratingTags) return;

    // 檢查是否有 API Key
    if (!hasGeminiApiKey()) {
      setPendingAction("generate");
      setShowApiKeyDialog(true);
      return;
    }

    setIsGeneratingTags(true);
    try {
      // 獲取桌面上的所有檔案
      const desktopFiles = items.map(item => ({
        id: item.id,
        label: item.label,
        type: item.type,
      }));

      if (desktopFiles.length === 0) {
        alert('桌面上沒有檔案可以分析');
        return;
      }

      // 調用 Gemini API 生成標籤並同時分配檔案
      const result = await generateAndAssignTags(desktopFiles);

      // 將生成的標籤添加到現有標籤列表（排除 "ALL" 標籤）
      const existingTagNames = tags.filter(t => t.id !== 'all').map(t => t.name.toLowerCase());
      const newTags = result.tags
        .filter(tag => !existingTagNames.includes(tag.name.toLowerCase()))
        .map(tag => ({
          id: `tag-${Date.now()}-${Math.random()}`,
          name: tag.name,
          color: tag.color || '#fb923c',
          items: [],
          expanded: false,
        }));

      if (newTags.length > 0) {
        // 先添加新標籤
        setTags(prev => {
          // 保留 "ALL" 標籤在第一位，其他標籤在後面
          const allTag = prev.find(t => t.id === 'all');
          const otherTags = prev.filter(t => t.id !== 'all');
          return allTag ? [allTag, ...otherTags, ...newTags] : [...otherTags, ...newTags];
        });

        // 然後應用分配結果
        setTimeout(() => {
          setTags(prev => {
            return prev.map(tag => {
              if (tag.id === 'all') {
                // 更新 ALL 標籤，包含所有桌面檔案
                const allFileNames = items.map(item => item.label);
                return { ...tag, items: allFileNames };
              }

              // 找到對應的分配結果
              const assignment = result.assignments.find(a => a.tagName === tag.name);
              if (assignment && assignment.files.length > 0) {
                // 合併現有檔案和新分配的檔案，去重
                const mergedItems = Array.from(new Set([...tag.items, ...assignment.files]));
                return { ...tag, items: mergedItems };
              }

              return tag;
            });
          });

          // 統計分配結果
          const totalAssignments = result.assignments.reduce((sum, a) => sum + a.files.length, 0);
          const uniqueFilesAssigned = new Set(
            result.assignments.flatMap(a => a.files)
          ).size;

          alert(`成功生成 ${newTags.length} 個新標籤並分配檔案！\n\n共對 ${uniqueFilesAssigned} 個檔案分配了 ${totalAssignments} 個標籤。`);
        }, 0);
      } else {
        alert('沒有生成新的標籤（可能所有標籤都已存在）');
      }
    } catch (error) {
      console.error('生成標籤時發生錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      alert(`生成標籤時發生錯誤：\n${errorMessage}\n\n請確認：\n.env 文件已正確設置`);
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // AI Assign Tag 功能
  const handleAIAssignTags = async () => {
    if (isAssigningTags) return;

    // 檢查是否有 API Key
    if (!hasGeminiApiKey()) {
      setPendingAction("assign");
      setShowApiKeyDialog(true);
      return;
    }

    // 排除 "ALL" 標籤
    const existingTags = tags.filter(t => t.id !== 'all');

    if (existingTags.length === 0) {
      alert('請先創建至少一個標籤（除了 ALL）');
      return;
    }

    setIsAssigningTags(true);
    try {
      // 獲取桌面上的所有檔案
      const desktopFiles = items.map(item => ({
        id: item.id,
        label: item.label,
        type: item.type,
      }));

      if (desktopFiles.length === 0) {
        alert('桌面上沒有檔案可以分配');
        return;
      }

      // 準備現有標籤資訊（只包含名稱和現有檔案）
      const tagsForAPI = existingTags.map(tag => ({
        name: tag.name,
        items: tag.items,
      }));

      // 調用 Gemini API 分配檔案
      const assignments = await assignFilesToTags(desktopFiles, tagsForAPI);

      // 更新標籤，將檔案分配到對應的標籤下
      setTags(prev => {
        return prev.map(tag => {
          if (tag.id === 'all') {
            // 更新 ALL 標籤，包含所有桌面檔案
            const allFileNames = items.map(item => item.label);
            return { ...tag, items: allFileNames };
          }

          // 找到對應的分配結果
          const assignment = assignments.find(a => a.tagName === tag.name);
          if (assignment && assignment.files.length > 0) {
            // 合併現有檔案和新分配的檔案，去重
            const mergedItems = Array.from(new Set([...tag.items, ...assignment.files]));
            return { ...tag, items: mergedItems };
          }

          return tag;
        });
      });

      // 統計分配結果
      const totalAssignments = assignments.reduce((sum, a) => sum + a.files.length, 0);
      const uniqueFilesAssigned = new Set(
        assignments.flatMap(a => a.files)
      ).size;

      alert(`成功分配完成！\n\n共對 ${uniqueFilesAssigned} 個檔案分配了 ${totalAssignments} 個標籤。`);
    } catch (error) {
      console.error('分配檔案時發生錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      console.log('errorMessage: ', errorMessage);
      alert(`分配檔案時發生錯誤：\n${errorMessage}\n\n請確認：\n1. .env 文件已正確設置\n`);
    } finally {
      setIsAssigningTags(false);
    }
  };

  // Generate dynamic subject options based on actual tags and file types
  const dynamicSubjectOptions = useMemo(() => {
    return getSubjectOptionsWithTags(tags, items, fstringPatterns, timeConditions);
  }, [tags, items, fstringPatterns, timeConditions]);

  // Generate dynamic action options based on folders and zip names
  const dynamicActionOptions = useMemo(() => {
    return getActionOptionsWithFolders(folders, zipNames);
  }, [folders, zipNames]);

  // Use RulesPanel component instead of inline JSX
  const ruleList = (
    <RulesPanel
      rules={rules}
      selectedSubject={subjectSelection}
      selectedAction={actionSelection}
      subjectOptions={dynamicSubjectOptions}
      actionOptions={dynamicActionOptions}
      isPreviewMode={isPreviewMode}
      openRuleMenu={openRuleMenu}
      ruleMenuRef={ruleMenuRef}
      onSelectSubject={setSubjectSelection}
      onSelectAction={setActionSelection}
      onRenameFolder={handleRenameFolder}
      onAddFolder={handleAddFolder}
      onDeleteFolder={handleDeleteFolder}
      onAddFstringPattern={handleAddFstringPattern}
      onDeleteFstringPattern={handleDeleteFstringPattern}
      onAddTimeCondition={handleAddTimeCondition}
      onDeleteTimeCondition={handleDeleteTimeCondition}
      onAddZipName={handleAddZipName}
      onDeleteZipName={handleDeleteZipName}
      onAddRule={handleAddRule}
      onSaveRule={handleSaveRule}
      onEditRule={handleEditRule}
      onRemoveRule={handleRemoveRule}
      onDragEnd={handleRuleDragEnd}
      onToggleMenu={(id) => setOpenRuleMenu(prev => prev === id ? null : id)}
      onPreview={handlePreview}
      onApply={handleApply}
      isApplying={isApplying}
    />
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (savedMenuRef.current && !savedMenuRef.current.contains(targetNode)) {
        setOpenSavedMenu(null);
      }
      if (ruleMenuRef.current && !ruleMenuRef.current.contains(targetNode)) {
        setOpenRuleMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <DndContext onDragEnd={handleTagDragEnd}>
      <div className="h-full flex flex-col bg-[#d8d8d8] p-4 gap-4 text-gray-900">
        <div className="flex flex-1 gap-4 min-h-0">
          <div className="flex-4 flex flex-col min-w-[520px]">
            <div className="h-full rounded-2xl overflow-hidden shadow-inner border border-gray-500 bg-linear-to-b from-gray-800 to-gray-700 relative">
              {selectedRegion && (
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2"
                  title="清除選中區域"
                >
                  <X size={16} />
                  清除區域
                </button>
              )}
              <DesktopPreview
                previewItems={previewItems}
                isPreviewMode={isPreviewMode}
                selectedRegion={selectedRegion}
                onRegionChange={setSelectedRegion}
                selectedItemIds={selectedItemIds}
              />
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl border border-gray-300 shadow overflow-visible min-w-[400px] flex flex-col">
            <div className="bg-gray-100 border-b border-gray-200 flex">
              <button
                onClick={() => setTab("tag")}
                className={`cursor-pointer active:scale-95 flex-1 py-3 text-center font-semibold ${tab === "tag" ? "bg-white border-b-2 border-white" : "text-gray-600"
                  }`}
              >
                Tag
              </button>
              <button
                onClick={() => setTab("rule")}
                className={`cursor-pointer active:scale-95 flex-1 py-3 text-center font-semibold ${tab === "rule" ? "bg-white border-b-2 border-white" : "text-gray-600"
                  }`}
              >
                Rules
              </button>
              <button
                onClick={() => setTab("history")}
                className={`cursor-pointer active:scale-95 flex-1 py-3 text-center font-semibold ${tab === "history" ? "bg-white border-b-2 border-white" : "text-gray-600"
                  }`}
              >
                History
              </button>
              <button
                onClick={() => setTab("saved")}
                className={`cursor-pointer active:scale-95 flex-1 py-3 text-center font-semibold ${tab === "saved" ? "bg-white border-b-2 border-white" : "text-gray-600"
                  }`}
              >
                Saved
              </button>
            </div>

            <div className={`flex-1 ${tab === "rule" ? "overflow-visible" : "overflow-hidden"}`}>
              {tab === "tag" && (
                <TagsPanel
                  tags={tags}
                  editingTagId={editingTagId}
                  editingName={editingName}
                  isGeneratingTags={isGeneratingTags}
                  isAssigningTags={isAssigningTags}
                  onCreateTag={createNewTag}
                  onDeleteTag={deleteTag}
                  onToggleExpand={toggleTagExpand}
                  onStartEdit={startEditingTag}
                  onSaveEdit={saveTagName}
                  onEditChange={setEditingName}
                  onColorChange={updateTagColor}
                  onRemoveFile={removeFileFromTag}
                  onGenerateTags={handleAIGenerateTags}
                  onAssignTags={handleAIAssignTags}
                  onDeleteAllTags={deleteAllTags}
                />
              )}

              {tab === "rule" && ruleList}

              {tab === "history" && (
                <HistoryPanel
                  historyItems={historyItems}
                  onToggleStar={toggleHistoryStar}
                  onDeleteItem={deleteHistoryItem}
                  onRollback={handleRollback}
                />
              )}

              {tab === "saved" && (
                <SavedRulesPanel
                  savedRules={savedRules}
                  openSavedMenu={openSavedMenu}
                  savedMenuRef={savedMenuRef}
                  onToggleMenu={(id) => setOpenSavedMenu(prev => prev === id ? null : id)}
                  onAddToApplied={addSavedToApplied}
                  onDelete={deleteSavedRule}
                />
              )}
            </div>
          </div>
        </div>

        {/* API Key 輸入對話框 */}
        {showApiKeyDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">輸入 Gemini API Key</h2>
                <button
                  onClick={() => {
                    setShowApiKeyDialog(false);
                    setApiKeyInput("");
                    setPendingAction(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                要使用 AI 功能，請輸入您的 Gemini API Key。此 Key 將僅存儲在本次會話中，刷新頁面後會清除。
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleApiKeySubmit();
                    }
                  }}
                  placeholder="請輸入您的 Gemini API Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowApiKeyDialog(false);
                    setApiKeyInput("");
                    setPendingAction(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleApiKeySubmit}
                  className="flex-1 px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors"
                >
                  確認
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                提示：您可以在{" "}
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-500 underline"
                >
                  Google AI Studio
                </a>{" "}
                獲取 API Key
              </p>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
