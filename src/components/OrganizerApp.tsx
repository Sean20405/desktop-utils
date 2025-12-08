import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, GripVertical, MoreVertical, Star, Trash2, X, Plus, Loader2 } from "lucide-react";
import { useDesktop } from "../context/DesktopContext";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { generateTagsFromFiles, assignFilesToTags, hasGeminiApiKey, setGeminiApiKey } from "../utils/geminiApi";

type HierarchyNode = { label: string; children?: HierarchyNode[] };

const subjectOptions: HierarchyNode[] = [
  {
    label: "Tags",
    children: [{ label: "LLM generate" }],
  },
  {
    label: "Time",
    children: [
      {
        label: "Last Accessed",
        children: [{ label: "within [n] [day|month|year]" }],
      },
      { label: "Create Time" },
      { label: "Last Modified" },
    ],
  },
  {
    label: "File Type",
    children: [{ label: "PDF" }, { label: "DOCS" }, { label: "PPTX" }, { label: "..." }],
  },
  { label: "f-string (e.g. hw*_report.pdf)" },
];

const actionOptions: HierarchyNode[] = [
  { label: 'Put in "__" folder named' },
  {
    label: "Sort by __ starting {x,y} in __ direction (push away obstacles)",
    children: [
      { label: "alphabetic order" },
      { label: "last accessed time" },
      { label: "last modified time" },
      { label: "type" },
      { label: "file size" },
    ],
  },
  { label: "Delete" },
  { label: "zip" },
];

function DesktopPreview() {
  const { items, background } = useDesktop();

  const resolveIconUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const base = import.meta.env.BASE_URL || "/";
    return `${base}${url.replace(/^\//, "")}`;
  };

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
        {items.map((item) => {
          const iconSrc = resolveIconUrl(item.imageUrl);
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: item.x * scale,
                top: item.y * scale,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <div className="w-16 h-16 flex items-center justify-center bg-white/25 backdrop-blur rounded-lg border border-white/30 shadow-md">
                {iconSrc ? (
                  <img
                    src={iconSrc}
                    alt={item.label}
                    className="w-12 h-12 object-contain drop-shadow"
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
        })}
      </div>
    </div>
  );
}

function HierarchyList({
  nodes,
  path,
  onSelect,
  level = 0,
}: {
  nodes: HierarchyNode[];
  path?: string;
  onSelect: (value: string) => void;
  level?: number;
}) {
  return (
    <div className="space-y-1">
      {nodes.map((node, idx) => {
        const currentValue = path ? `${path} > ${node.label}` : node.label;
        const hasChildren = !!node.children?.length;

        return (
          <div key={`${currentValue}-${idx}`} className="flex flex-col gap-1" style={{ paddingLeft: level ? 6 : 0 }}>
            <button
              onClick={() => onSelect(currentValue)}
              className="flex items-start gap-2 text-left px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-400 leading-6">•</span>
              <span
                className={`text-sm ${level === 0 ? "text-gray-900 font-semibold" : "text-gray-800"} leading-6 whitespace-normal break-words`}
              >
                {node.label}
              </span>
            </button>
            {hasChildren && (
              <div className="ml-5 pl-3 border-l border-dashed border-gray-200">
                <HierarchyList nodes={node.children!} path={currentValue} onSelect={onSelect} level={level + 1} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HierarchicalDropdown({
  title,
  placeholder,
  selected,
  options,
  onSelect,
  align = "left",
}: {
  title: string;
  placeholder: string;
  selected?: string;
  options: HierarchyNode[];
  onSelect: (value: string) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-full px-4 py-2 bg-white hover:bg-gray-50 shadow-inner"
      >
        <span className={`text-sm ${selected ? "text-gray-900" : "text-gray-500"}`}>{selected || placeholder}</span>
        <ChevronDown size={18} className="text-gray-500" />
      </button>

      {open && (
        <div
          className={`absolute z-20 mt-2 min-w-full w-[420px] max-w-[720px] max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl ${align === "right" ? "right-0 left-auto" : "left-0 right-auto"
            }`}
        >
          <div className="px-3 py-2 text-sm font-semibold text-gray-900 border-b border-gray-200 bg-white">{title}</div>
          <div className="px-2 py-2">
            <HierarchyList
              nodes={options}
              onSelect={(value) => {
                onSelect(value);
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Sortable Tag Item Component
function SortableTagItem({
  tag,
  onToggleExpand,
  onStartEdit,
  onDelete,
  onColorChange,
  isEditing,
  editValue,
  onEditChange,
  onSaveEdit,
}: {
  tag: { id: string; name: string; color: string; items: string[]; expanded: boolean };
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  onSaveEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-white shadow-sm">
      <div className="flex items-center gap-2 p-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded">
          <GripVertical size={18} className="text-gray-400" />
        </div>

        <button
          onClick={onToggleExpand}
          className="cursor-pointer p-1 hover:bg-gray-100 rounded transition-transform"
          style={{ transform: tag.expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <ChevronDown size={18} />
        </button>

        <div className="relative">
          <div
            onClick={() => {
              const input = document.getElementById(`color-${tag.id}`) as HTMLInputElement;
              input?.click();
            }}
            className="w-6 h-6 rounded-full cursor-pointer border-2 border-white shadow-md hover:scale-110 transition-transform"
            style={{ backgroundColor: tag.color }}
            title="Change color"
          />
          <input
            id={`color-${tag.id}`}
            type="color"
            value={tag.color}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute opacity-0 w-0 h-0"
          />
        </div>

        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
            className="flex-1 px-2 py-1 border rounded outline-none focus:border-orange-400"
            autoFocus
          />
        ) : (
          <div onClick={onStartEdit} className="flex-1 font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
            {tag.name}
          </div>
        )}

        <div className="text-sm text-gray-500">({tag.items.length})</div>

        <button
          onClick={onDelete}
          className="cursor-pointer active:scale-95 p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
          title="Delete tag"
        >
          <X size={18} />
        </button>
      </div>

      {tag.expanded && tag.items.length > 0 && (
        <div className="px-3 pb-3 pt-0">
          <div className="flex gap-2 flex-wrap p-2 bg-gray-50 rounded">
            {tag.items.map((item, idx) => (
              <div key={idx} className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: tag.color + "40" }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SortableRuleItem({
  rule,
  isMenuOpen,
  onToggleMenu,
  onEdit,
  onDelete,
  menuRef,
}: {
  rule: SimpleRule;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-gray-200 bg-white shadow-sm px-3 py-2 flex items-start justify-between relative"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>
        <span className="text-sm text-gray-800">{rule.text}</span>
      </div>

      <div className="relative">
        <button
          onClick={onToggleMenu}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 cursor-pointer active:scale-95"
          title="More"
        >
          <MoreVertical size={16} />
        </button>
        {isMenuOpen && (
          <div ref={menuRef} className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg z-20">
            <button onClick={onEdit} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
              Edit
            </button>
            <button
              onClick={onDelete}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type SimpleRule = { id: string; text: string };
type HistoryEntry = { id: string; time: string; title: string; starred: boolean; thumbnail?: string };

export function OrganizerApp() {
  const [tab, setTab] = useState<"rule" | "tag" | "history">("rule");
  const [rules, setRules] = useState<SimpleRule[]>([
    { id: "rule-1", text: 'All files with tag "game" + put in "game" folder' },
    { id: "rule-2", text: 'All files of type .txt + put in "text file" folder' },
  ]);
  const [savedRules, setSavedRules] = useState<SimpleRule[]>([
    { id: "saved-1", text: 'All files with tag "game" + put in "game" folder' },
    { id: "saved-2", text: 'All files with tag "NYCU" + put in "NYCU" folder' },
  ]);
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
  const { items } = useDesktop();

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

    if (over && active.id !== over.id) {
      setTags((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
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

      const totalAssigned = assignments.reduce((sum, a) => sum + a.files.length, 0);
      alert(`成功將 ${totalAssigned} 個檔案分配到標籤！`);
    } catch (error) {
      console.error('分配檔案時發生錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      console.log('errorMessage: ', errorMessage);
      alert(`分配檔案時發生錯誤：\n${errorMessage}\n\n請確認：\n1. .env 文件已正確設置\n`);
    } finally {
      setIsAssigningTags(false);
    }
  };

  const ruleList = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="text-lg font-semibold text-gray-800">To be Applied</div>
        <div className="text-xs uppercase tracking-wide text-gray-500">(Executed in order)</div>
      </div>

      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
        <HierarchicalDropdown
          title="Subject"
          placeholder="Subject"
          selected={subjectSelection}
          options={subjectOptions}
          onSelect={setSubjectSelection}
          align="left"
        />
        <HierarchicalDropdown
          title="Action"
          placeholder="Action"
          selected={actionSelection}
          options={actionOptions}
          onSelect={setActionSelection}
          align="right"
        />
        <button
          onClick={handleAddRule}
          className="cursor-pointer active:scale-95 w-12 h-10 rounded-lg bg-white border border-gray-300 shadow-inner flex items-center justify-center hover:bg-gray-100"
          title="Add rule"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-white">
        <DndContext onDragEnd={handleRuleDragEnd}>
          <SortableContext items={rules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            {rules.map((rule) => (
              <SortableRuleItem
                key={rule.id}
                rule={rule}
                isMenuOpen={openRuleMenu === rule.id}
                onToggleMenu={() => setOpenRuleMenu((prev) => (prev === rule.id ? null : rule.id))}
                onEdit={() => {
                  handleEditRule(rule.id);
                  setOpenRuleMenu(null);
                }}
                onDelete={() => {
                  handleRemoveRule(rule.id);
                  setOpenRuleMenu(null);
                }}
                menuRef={openRuleMenu === rule.id ? ruleMenuRef : { current: null }}
              />
            ))}
          </SortableContext>
        </DndContext>
        {!rules.length && <div className="text-sm text-gray-500">No rules yet.</div>}
      </div>

      <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 flex gap-3">
        <button
          onClick={handleSaveRule}
          className="cursor-pointer active:scale-95 flex-1 py-2 border border-gray-400 rounded-lg bg-white hover:bg-gray-50 shadow-inner"
        >
          Save
        </button>
        <button className="cursor-pointer active:scale-95 flex-1 py-2 border border-gray-400 rounded-lg bg-white hover:bg-gray-50 shadow-inner">
          Preview
        </button>
        <button className="cursor-pointer active:scale-95 flex-1 py-2 border border-gray-400 rounded-lg bg-white hover:bg-gray-50 shadow-inner">
          Apply
        </button>
      </div>
    </div>
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
    <div className="h-full flex flex-col bg-[#d8d8d8] p-4 gap-4 text-gray-900">
      <div className="flex flex-1 gap-4 min-h-0">
        <div className="flex-[1.2] flex flex-col gap-3 min-w-[520px]">
          <div className="h-[360px] rounded-2xl overflow-hidden shadow-inner border border-gray-500 bg-gradient-to-b from-gray-800 to-gray-700">
            <DesktopPreview />
          </div>

          <div className="rounded-2xl border border-gray-500 bg-[#c4c4c4] shadow-inner flex flex-col overflow-hidden min-h-[220px]">
            <div className="px-4 py-2 border-b border-gray-500 bg-[#b5b5b5] text-sm font-semibold font-mono text-gray-800">
              Saved Rules
            </div>
            <div className="p-3 space-y-2 overflow-y-auto max-h-64" ref={savedMenuRef}>
              {savedRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg border border-gray-300 bg-white shadow-sm px-3 py-2 flex items-center justify-between relative"
                >
                  <span className="text-sm text-gray-800">{rule.text}</span>
                  <div className="relative">
                    <button
                      onClick={() => setOpenSavedMenu((prev) => (prev === rule.id ? null : rule.id))}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer active:scale-95"
                      title="More"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openSavedMenu === rule.id && (
                      <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                        <button
                          onClick={() => {
                            addSavedToApplied(rule.text);
                            setOpenSavedMenu(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                        >
                          Add to "To be Applied"
                        </button>
                        <button
                          onClick={() => {
                            deleteSavedRule(rule.id);
                            setOpenSavedMenu(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!savedRules.length && <div className="text-sm text-gray-600">No saved rules.</div>}
            </div>
          </div>
        </div>

        <div className="flex-[1] bg-white rounded-2xl border border-gray-300 shadow overflow-visible min-w-[400px] flex flex-col">
          <div className="bg-gray-100 border-b border-gray-200 flex">
            <button
              onClick={() => setTab("rule")}
              className={`cursor-pointer active:scale-95 flex-1 py-3 text-center font-semibold ${
                tab === "rule" ? "bg-white border-b-2 border-white" : "text-gray-600"
              }`}
            >
              Rules
            </button>
            <button
              onClick={() => setTab("tag")}
              className={`cursor-pointer active:scale-95 flex-1 py-3 text-center font-semibold ${
                tab === "tag" ? "bg-white border-b-2 border-white" : "text-gray-600"
              }`}
            >
              Tag
            </button>
            <button
              onClick={() => setTab("history")}
              className={`cursor-pointer active:scale-95 flex-1 py-3 text-center font-semibold ${
                tab === "history" ? "bg-white border-b-2 border-white" : "text-gray-600"
              }`}
            >
              History
            </button>
          </div>

          <div className={`flex-1 ${tab === "rule" ? "overflow-visible" : "overflow-hidden"}`}>
            {tab === "rule" && ruleList}

            {tab === "tag" && (
              <div className="flex flex-col h-full gap-4 p-4 overflow-hidden">
                <button
                  onClick={createNewTag}
                  className="cursor-pointer active:scale-95 w-full py-3 bg-orange-400 text-white rounded-lg hover:bg-orange-500 flex items-center justify-center gap-2 font-medium shadow"
                >
                  <Plus size={20} /> Create New Tag
                </button>

                <DndContext onDragEnd={handleTagDragEnd}>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="font-semibold mb-3 text-sm">All Tags ({tags.length})</div>
                    <SortableContext items={tags.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-col gap-2">
                        {tags.map((tag) => (
                          <SortableTagItem
                            key={tag.id}
                            tag={tag}
                            onToggleExpand={() => toggleTagExpand(tag.id)}
                            onStartEdit={() => startEditingTag(tag.id, tag.name)}
                            onDelete={() => deleteTag(tag.id)}
                            onColorChange={(color) => updateTagColor(tag.id, color)}
                            isEditing={editingTagId === tag.id}
                            editValue={editingName}
                            onEditChange={setEditingName}
                            onSaveEdit={() => saveTagName(tag.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                </DndContext>

                <div className="flex gap-3 pt-3 border-t shrink-0">
                  <button
                    onClick={handleAIGenerateTags}
                    disabled={isGeneratingTags || isAssigningTags}
                    className="cursor-pointer active:scale-95 flex-1 py-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isGeneratingTags ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>生成中...</span>
                      </>
                    ) : (
                      'AI Generate Tag'
                    )}
                  </button>
                  <button
                    onClick={handleAIAssignTags}
                    disabled={isGeneratingTags || isAssigningTags}
                    className="cursor-pointer active:scale-95 flex-1 py-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAssigningTags ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>分配中...</span>
                      </>
                    ) : (
                      'AI Assign Tag'
                    )}
                  </button>
                </div>

                <button className="cursor-pointer active:scale-95 p-2 text-red-600 border rounded-lg flex items-center justify-center gap-2 hover:bg-red-50 shrink-0">
                  <Trash2 size={18} /> Delete All Tags
                </button>
              </div>
            )}

            {tab === "history" && (
              <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {historyItems.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-xl shadow-sm bg-white p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="font-semibold text-lg text-gray-800 leading-tight">{item.time}</div>
                          <Star
                            size={22}
                            className={`cursor-pointer transition-colors ${
                              item.starred ? "text-orange-400 fill-orange-400" : "text-gray-300"
                            }`}
                            onClick={() => toggleHistoryStar(item.id)}
                          />
                        </div>
                        <div className="text-sm text-gray-600">{item.title}</div>
                        <div className="w-full aspect-video rounded-md bg-gray-200 overflow-hidden">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt="History preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-200" />
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button className="cursor-pointer active:scale-95 flex-1 py-2 border rounded-lg bg-white hover:bg-gray-50">
                            Rollback
                          </button>
                          <button
                            className="cursor-pointer active:scale-95 flex-1 py-2 border rounded-lg bg-white hover:bg-red-50 text-red-600"
                            onClick={() => deleteHistoryItem(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="cursor-pointer active:scale-95 text-red-600 flex items-center justify-center gap-2 border rounded-lg py-2 shrink-0">
                  <Trash2 size={18} /> Delete All History
                </button>
              </div>
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
  );
}
