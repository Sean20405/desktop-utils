import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useDesktop } from "../context/DesktopContext";
import { DndContext, type DragEndEvent, useDraggable } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { generateTagsFromFiles, assignFilesToTags, hasGeminiApiKey, setGeminiApiKey } from "../utils/geminiApi";
import { executeRule, parseRuleText } from "../utils/ruleEngine";
import type { SimpleRule, HistoryEntry } from './OrganizerTypes';
import type { DesktopItem } from '../context/DesktopContext';
import { HistoryPanel } from './OrganizerHistory';
import { TagsPanel } from './OrganizerTag';
import { RulesPanel, SavedRulesSection } from './OrganizerRule';


// Draggable Preview File Component
function DraggablePreviewFile({
  item,
  scale,
}: {
  item: { id: string; label: string; x: number; y: number; imageUrl?: string };
  scale: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `preview-file-${item.id}`,
    data: {
      fileName: item.label,
      sourceTagId: null, // 來自 preview，不是來自任何 tag
    },
  });

  const resolveIconUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const base = import.meta.env.BASE_URL || "/";
    return `${base}${url.replace(/^\//, "")}`;
  };

  const iconSrc = resolveIconUrl(item.imageUrl);
  const dragStyle = CSS.Translate.toString(transform);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="absolute cursor-grab active:cursor-grabbing"
      style={{
        left: item.x * scale,
        top: item.y * scale,
        transform: dragStyle ? `${dragStyle} scale(${scale})` : `scale(${scale})`,
        transformOrigin: "top left",
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="w-16 h-16 flex items-center justify-center bg-white/25 backdrop-blur rounded-lg border border-white/30 shadow-md">
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={item.label}
            className="w-12 h-12 object-contain drop-shadow pointer-events-none"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = `${import.meta.env.BASE_URL || "/"}icons/organizer.svg`;
            }}
          />
        ) : (
          <div className="w-10 h-10 bg-gray-300 rounded" />
        )}
      </div>
      <div className="mt-1 text-white text-xs text-center drop-shadow font-semibold">{item.label}</div>
    </div>
  );
}

function DesktopPreview({ previewItems }: { previewItems: DesktopItem[] }) {
  const { background } = useDesktop();

  // Keep preview proportional to a 1920x1080 desktop but scaled down without stretching layout.
  const { scale, previewWidth, previewHeight } = useMemo(() => {
    const baseWidth = 1920;
    const baseHeight = 1080;
    const scale = 0.32;
    return {
      scale,
      previewWidth: baseWidth * scale,
      previewHeight: baseHeight * scale,
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-slate-900/30 border border-gray-500 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
      <div
        className="relative rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10"
        style={{
          width: previewWidth,
          height: previewHeight,
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {previewItems.map((item) => (
          <DraggablePreviewFile key={item.id} item={item} scale={scale} />
        ))}
      </div>
    </div>
  );
}

export function OrganizerApp() {
  const [tab, setTab] = useState<"rule" | "tag" | "history">("rule");

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
      { id: "rule-1", text: 'All files with tag "game" + put in "game" folder' },
      { id: "rule-2", text: 'All files of type .txt + put in "text file" folder' },
    ];
  });

  // Load saved rules from localStorage or use default
  const [savedRules, setSavedRules] = useState<SimpleRule[]>(() => {
    const savedRulesData = localStorage.getItem('organizerSavedRules');
    if (savedRulesData) {
      try {
        return JSON.parse(savedRulesData);
      } catch (e) {
        console.error('Failed to parse saved rules data:', e);
      }
    }
    return [
      { id: "saved-1", text: 'All files with tag "game" + put in "game" folder' },
      { id: "saved-2", text: 'All files with tag "NYCU" + put in "NYCU" folder' },
    ];
  });
  const [openSavedMenu, setOpenSavedMenu] = useState<string | null>(null);
  const [openRuleMenu, setOpenRuleMenu] = useState<string | null>(null);
  const savedMenuRef = useRef<HTMLDivElement | null>(null);
  const ruleMenuRef = useRef<HTMLDivElement | null>(null);
  const [subjectSelection, setSubjectSelection] = useState<string>("");
  const [actionSelection, setActionSelection] = useState<string>("");
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([
    {
      id: "h-1",
      time: "2025/10/23 10:50",
      title: "Rules: sort game in date",
      starred: true,
    },
    {
      id: "h-2",
      time: "2025/10/23 08:50",
      title: "Rules: another rule",
      starred: false,
    },
    {
      id: "h-3",
      time: "2025/10/22 20:10",
      title: "Rules: cleanup docs",
      starred: true,
    },
  ]);
  const [tags, setTags] = useState<{ id: string; name: string; color: string; items: string[]; expanded: boolean }[]>([
    // 預設標籤已註解，可以通過 AI Generate Tag 或手動創建標籤
    // {
    //   id: "all",
    //   name: "ALL",
    //   color: "#fb923c",
    //   items: ["Game 1", "Game 2", "Game 3", "Game 4", "doc 1", "doc 2"],
    //   expanded: true,
    // },
    // {
    //   id: "games",
    //   name: "Games",
    //   color: "#60a5fa",
    //   items: ["Game 1", "Game 2", "Game 3", "Game 4"],
    //   expanded: false,
    // },
    // {
    //   id: "file-related",
    //   name: "File Related",
    //   color: "#4ade80",
    //   items: ["doc 1", "doc 2"],
    //   expanded: false,
    // },
  ]);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isAssigningTags, setIsAssigningTags] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [pendingAction, setPendingAction] = useState<"generate" | "assign" | null>(null);
  const { items, setItems } = useDesktop();

  // Preview state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewItems, setPreviewItems] = useState<DesktopItem[]>(items);

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
  useEffect(() => {
    localStorage.setItem('organizerSavedRules', JSON.stringify(savedRules));
  }, [savedRules]);

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
    const text = `${subjectSelection} + ${actionSelection}`;
    setRules((prev) => [...prev, { id: `rule-${Date.now()}`, text }]);
    setSubjectSelection("");
    setActionSelection("");
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const handleSaveRule = () => {
    if (!rules.length && !subjectSelection && !actionSelection) return;
    const lastRule = rules.length ? rules[rules.length - 1].text : `${subjectSelection} + ${actionSelection}`;
    setSavedRules((prev) => [{ id: `saved-${Date.now()}`, text: lastRule }, ...prev]);
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

  const addSavedToApplied = (text: string) => {
    setRules((prev) => [...prev, { id: `rule-${Date.now()}`, text }]);
  };

  const deleteSavedRule = (id: string) => {
    setSavedRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  // Handle Preview
  const handlePreview = () => {
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
        const result = executeRule(parsed.subject, parsed.action, resultItems);
        if (result) {
          resultItems = result.items;
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
  const handleApply = () => {
    if (rules.length === 0) {
      alert('請先添加至少一個規則');
      return;
    }

    // Execute all rules in order
    let resultItems = [...items];
    const descriptions: string[] = [];

    for (const rule of rules) {
      const parsed = parseRuleText(rule.text);
      if (parsed) {
        const result = executeRule(parsed.subject, parsed.action, resultItems);
        if (result) {
          resultItems = result.items;
          descriptions.push(result.description);
        }
      }
    }

    if (descriptions.length > 0) {
      // Apply to actual desktop
      setItems(resultItems);
      setPreviewItems(resultItems);
      setIsPreviewMode(false);

      // Add to history
      const now = new Date();
      const timeStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newHistoryEntry: HistoryEntry = {
        id: `h-${Date.now()}`,
        time: timeStr,
        title: `Rules: ${descriptions.join(', ')}`,
        starred: false,
      };
      setHistoryItems((prev) => [newHistoryEntry, ...prev]);

      alert('規則已成功應用!');
    } else {
      alert('無法執行這些規則，請檢查規則格式');
    }
  };

  const createNewTag = () => {
    let baseName = "NewTag";
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

  // AI Generate Tag 功能
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
      // 獲取桌面上的所有檔案（排除 "ALL" 標籤）
      const desktopFiles = items.map(item => ({
        id: item.id,
        label: item.label,
        type: item.type,
      }));

      if (desktopFiles.length === 0) {
        alert('桌面上沒有檔案可以分析');
        return;
      }

      // 調用 Gemini API 生成標籤
      const generatedTags = await generateTagsFromFiles(desktopFiles);

      // 將生成的標籤添加到現有標籤列表（排除 "ALL" 標籤）
      const existingTagNames = tags.filter(t => t.id !== 'all').map(t => t.name.toLowerCase());
      const newTags = generatedTags
        .filter(tag => !existingTagNames.includes(tag.name.toLowerCase()))
        .map(tag => ({
          id: `tag-${Date.now()}-${Math.random()}`,
          name: tag.name,
          color: tag.color || '#fb923c',
          items: [],
          expanded: true,
        }));

      if (newTags.length > 0) {
        setTags(prev => {
          // 保留 "ALL" 標籤在第一位，其他標籤在後面
          const allTag = prev.find(t => t.id === 'all');
          const otherTags = prev.filter(t => t.id !== 'all');
          return allTag ? [allTag, ...otherTags, ...newTags] : [...otherTags, ...newTags];
        });
        alert(`成功生成 ${newTags.length} 個新標籤！`);
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

  // Use RulesPanel component instead of inline JSX
  const ruleList = (
    <RulesPanel
      rules={rules}
      selectedSubject={subjectSelection}
      selectedAction={actionSelection}
      openRuleMenu={openRuleMenu}
      ruleMenuRef={ruleMenuRef}
      onSelectSubject={setSubjectSelection}
      onSelectAction={setActionSelection}
      onAddRule={handleAddRule}
      onSaveRule={handleSaveRule}
      onEditRule={handleEditRule}
      onRemoveRule={handleRemoveRule}
      onDragEnd={handleRuleDragEnd}
      onToggleMenu={(id) => setOpenRuleMenu(prev => prev === id ? null : id)}
      onPreview={handlePreview}
      onApply={handleApply}
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
          <div className="flex-[1.2] flex flex-col gap-3 min-w-[520px]">
            <div className="h-[360px] rounded-2xl overflow-hidden shadow-inner border border-gray-500 bg-gradient-to-b from-gray-800 to-gray-700">
              <DesktopPreview previewItems={previewItems} />
            </div>

            <SavedRulesSection
              savedRules={savedRules}
              openSavedMenu={openSavedMenu}
              savedMenuRef={savedMenuRef}
              onToggleMenu={(id) => setOpenSavedMenu(prev => prev === id ? null : id)}
              onAddToApplied={addSavedToApplied}
              onDelete={deleteSavedRule}
            />
          </div>

          <div className="flex-[1] bg-white rounded-2xl border border-gray-300 shadow overflow-visible min-w-[400px] flex flex-col">
            <div className="bg-gray-100 border-b border-gray-200 flex">
              <button
                onClick={() => setTab("rule")}
                className={`cursor-pointer active:scale-95 flex-1 py-3 text-center font-semibold ${tab === "rule" ? "bg-white border-b-2 border-white" : "text-gray-600"
                  }`}
              >
                Rules
              </button>
              <button
                onClick={() => setTab("tag")}
                className={`cursor-pointer active:scale-95 flex-1 py-3 text-center font-semibold ${tab === "tag" ? "bg-white border-b-2 border-white" : "text-gray-600"
                  }`}
              >
                Tag
              </button>
              <button
                onClick={() => setTab("history")}
                className={`cursor-pointer active:scale-95 flex-1 py-3 text-center font-semibold ${tab === "history" ? "bg-white border-b-2 border-white" : "text-gray-600"
                  }`}
              >
                History
              </button>
            </div>

            <div className={`flex-1 ${tab === "rule" ? "overflow-visible" : "overflow-hidden"}`}>
              {tab === "rule" && ruleList}

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
                  onDragEnd={handleTagDragEnd}
                  onGenerateTags={handleAIGenerateTags}
                  onAssignTags={handleAIAssignTags}
                />
              )}

              {tab === "history" && (
                <HistoryPanel
                  historyItems={historyItems}
                  onToggleStar={toggleHistoryStar}
                  onDeleteItem={deleteHistoryItem}
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
