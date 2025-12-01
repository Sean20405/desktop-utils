import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Star, Trash2, X, Plus, GripVertical } from "lucide-react";
import { useDesktop } from "../context/DesktopContext";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function DesktopPreview() {
  const { items } = useDesktop();

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
    <div className="w-full h-full relative border rounded-lg overflow-hidden bg-slate-800/80 shadow-inner flex items-center justify-center">
      <div
        className="relative rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10"
        style={{
          width: previewWidth,
          height: previewHeight,
          backgroundImage:
            'url("https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&q=80&w=2070")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Desktop icons */}
        {items.map((item) => (
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
            <div className="w-16 h-16 flex items-center justify-center bg-white/15 backdrop-blur rounded-lg border border-white/10 shadow">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.label} className="w-12 h-12 object-contain" />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded" />
              )}
            </div>
            <div className="mt-1 text-white text-xs text-center drop-shadow">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DraggableItem({ id, children, type }: { id: string; children: React.ReactNode; type: "category" | "action" }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id,
    data: { type, text: children },
  });

  const style = isDragging ? { opacity: 0.5 } : undefined;
  const bgClass = type === "category" ? "bg-blue-100 hover:bg-blue-200" : "bg-orange-200 hover:bg-orange-300";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 rounded-lg text-sm cursor-grab active:cursor-grabbing ${bgClass}`}
    >
      {children}
    </div>
  );
}

function RuleBlock({ id, text, type }: { id: string; text: string; type: "category" | "action" }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `rule-${id}`,
    data: { type, text, isFromEditor: true, ruleId: id },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap cursor-grab active:cursor-grabbing ${type === "category" ? "bg-blue-100 border border-blue-200" : "bg-orange-200 border border-orange-300"
        }`}
    >
      {text}
    </div>
  );
}

function DroppableArea({ children, isDragging }: { children: React.ReactNode; isDragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "rule-editor",
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-24 border rounded-lg flex items-center px-4 gap-2 overflow-x-auto transition-colors duration-200 ${isOver
        ? "bg-green-50 border-green-300 ring-2 ring-green-200"
        : isDragging
          ? "bg-blue-50 border-blue-300 border-dashed ring-2 ring-blue-100"
          : "bg-gray-50 border-gray-200"
        }`}
    >
      {React.Children.count(children) === 0 && !isDragging ? (
        <div className="w-full text-center text-gray-500">Drag blocks here to build a rule</div>
      ) : (
        children
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
  onSaveEdit
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-white">
      <div className="flex items-center gap-2 p-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical size={18} className="text-gray-400" />
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={onToggleExpand}
          className="cursor-pointer p-1 hover:bg-gray-100 rounded transition-transform"
          style={{ transform: tag.expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <ChevronDown size={18} />
        </button>

        {/* Color Picker - Circular */}
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

        {/* Tag Name (Editable) */}
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyPress={(e) => e.key === 'Enter' && onSaveEdit()}
            className="flex-1 px-2 py-1 border rounded outline-none focus:border-orange-400"
            autoFocus
          />
        ) : (
          <div
            onClick={onStartEdit}
            className="flex-1 font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
          >
            {tag.name}
          </div>
        )}

        {/* Items Count */}
        <div className="text-sm text-gray-500">
          ({tag.items.length})
        </div>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="cursor-pointer active:scale-95 p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
          title="Delete tag"
        >
          <X size={18} />
        </button>
      </div>

      {/* Expanded Items */}
      {tag.expanded && tag.items.length > 0 && (
        <div className="px-3 pb-3 pt-0">
          <div className="flex gap-2 flex-wrap p-2 bg-gray-50 rounded">
            {tag.items.map((item, idx) => (
              <div
                key={idx}
                className="px-3 py-1 rounded-lg text-sm"
                style={{ backgroundColor: tag.color + '40' }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function OrganizerApp() {
  const [tab, setTab] = useState<"rule" | "tag" | "history">("rule");
  const [rules, setRules] = useState<{ id: string; text: string; type: "category" | "action" }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<{ text: string; type: "category" | "action" } | null>(null);
  const [starred, setStarred] = useState<Set<number>>(new Set([1])); // Track starred history items
  const [searchQuery, setSearchQuery] = useState("");
  const [savedRules, setSavedRules] = useState<{ id: string; name: string; blocks: string[] }[]>([
    {
      id: "saved-1",
      name: 'Move all files with tag "game" to "game" folder',
      blocks: ['All files with tag "game"', 'Move to default folder'],
    },
    {
      id: "saved-2",
      name: "Move all icons",
      blocks: ["All files", "Move to a new folder"],
    },
    {
      id: "saved-3",
      name: "Archived rule",
      blocks: ["..."],
    },
  ]);
  const [showSavedList, setShowSavedList] = useState(false);

  // Tag management with expanded data structure
  const [tags, setTags] = useState<{ id: string; name: string; color: string; items: string[]; expanded: boolean }[]>([
    {
      id: "all",
      name: "ALL",
      color: "#fb923c",
      items: ["Game 1", "Game 2", "Game 3", "Game 4", "doc 1", "doc 2"],
      expanded: true
    },
    {
      id: "games",
      name: "Games",
      color: "#60a5fa",
      items: ["Game 1", "Game 2", "Game 3", "Game 4"],
      expanded: false
    },
    {
      id: "file-related",
      name: "File Related",
      color: "#4ade80",
      items: ["doc 1", "doc 2"],
      expanded: false
    }
  ]);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const toggleStar = (id: number) => {
    setStarred(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSaveRule = () => {
    const blocks = rules.length ? rules.map((r) => r.text) : ["(empty rule)"];
    const inferredName =
      blocks.length > 1 ? `${blocks[0]} → ${blocks[1]}` : blocks[0];
    const name = inferredName || `Rule ${savedRules.length + 1}`;
    const newRule = {
      id: `saved-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      name,
      blocks,
    };
    setSavedRules((prev) => [newRule, ...prev]);
  };

  const deleteSavedRule = (id: string) => {
    setSavedRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  // Create new tag with auto-naming
  const createNewTag = () => {
    let baseName = "NewTag";
    let counter = 0;
    let newName = baseName;

    // Check for existing names and increment counter
    while (tags.some(tag => tag.name === newName)) {
      counter++;
      newName = `${baseName}${counter}`;
    }

    const newTag = {
      id: `tag-${Date.now()}`,
      name: newName,
      color: "#fb923c",
      items: [],
      expanded: true
    };
    setTags(prev => [...prev, newTag]);
  };

  const deleteTag = (id: string) => {
    setTags(prev => prev.filter(tag => tag.id !== id));
  };

  const toggleTagExpand = (id: string) => {
    setTags(prev => prev.map(tag =>
      tag.id === id ? { ...tag, expanded: !tag.expanded } : tag
    ));
  };

  const startEditingTag = (id: string, currentName: string) => {
    setEditingTagId(id);
    setEditingName(currentName);
  };

  const saveTagName = (id: string) => {
    if (editingName.trim()) {
      setTags(prev => prev.map(tag =>
        tag.id === id ? { ...tag, name: editingName.trim() } : tag
      ));
    }
    setEditingTagId(null);
    setEditingName("");
  };

  const updateTagColor = (id: string, color: string) => {
    setTags(prev => prev.map(tag =>
      tag.id === id ? { ...tag, color } : tag
    ));
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveItem(event.active.data.current as { text: string; type: "category" | "action" });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    const dragData = active.data.current;

    // 如果是從 Rule Editor 拖出來的
    if (dragData?.isFromEditor) {
      // 如果沒有放回 Rule Editor，就刪除
      if (!over || over.id !== "rule-editor") {
        setRules((prev) => prev.filter((rule) => rule.id !== dragData.ruleId));
      }
    } else {
      // 如果是從右側拖過來的新方塊
      if (over && over.id === "rule-editor") {
        const newItem = {
          id: `${active.id}-${Date.now()}`,
          text: dragData?.text,
          type: dragData?.type,
        };
        setRules((prev) => [...prev, newItem]);
      }
    }

    setActiveId(null);
    setActiveItem(null);
  };

  const categories = [
    "All files with the same tag",
    "All files of type...",
    "All files not accessed within...",
    "All files",
    "All files accessed within...",
    "All files of the same type...",
    "All files of tag..."
  ];

  const actions = [
    "Move to a new folder",
    "Each move to a new folder",
    "Move to default folder",
    "Move to most densely packed folder",
    "Sort by (criteria)"
  ];

  const filteredSavedRules = showSavedList
    ? savedRules.filter((rule) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        rule.name.toLowerCase().includes(q) ||
        rule.blocks.some((b) => b.toLowerCase().includes(q))
      );
    })
    : savedRules;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col p-3 gap-3 overflow-hidden">
        {/* Main Container */}
        <div className="flex flex-1 border rounded-xl bg-white p-3 gap-3 shadow-inner overflow-hidden">

          {/* Left side – Preview + Rule Editor */}
          <div className="flex flex-col flex-[1.05] gap-3 min-w-[520px]">
            <div className="w-full h-[340px] shrink-0">
              <DesktopPreview />
            </div>

            <div className="shrink-0">
              <DroppableArea isDragging={!!activeId}>
                {rules.map((rule) => (
                  <RuleBlock
                    key={rule.id}
                    id={rule.id}
                    text={rule.text}
                    type={rule.type}
                  />
                ))}
              </DroppableArea>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSaveRule}
                className="cursor-pointer active:scale-95 px-6 py-2 border rounded-lg bg-white hover:bg-gray-50"
              >
                Save
              </button>
              <button className="cursor-pointer active:scale-95 px-6 py-2 border rounded-lg bg-white hover:bg-gray-50">Preview</button>
              <button className="cursor-pointer active:scale-95 px-6 py-2 border rounded-lg bg-white hover:bg-gray-50">Run</button>
            </div>
          </div>

          {/* Right side – Tabs */}
          <div className="w-96 border rounded-xl p-3 flex flex-col overflow-auto">

            {/* Tabs */}
            <div className="flex mb-4 border-b">
              <button
                onClick={() => setTab("rule")}
                className={`cursor-pointer active:scale-95 flex-1 py-2 text-center ${tab === "rule" ? 'bg-orange-100 font-semibold' : ''}`}
              >
                Rule
              </button>
              <button
                onClick={() => setTab("tag")}
                className={`cursor-pointer active:scale-95 flex-1 py-2 text-center ${tab === "tag" ? 'bg-orange-100 font-semibold' : ''}`}
              >
                Tag
              </button>
              <button
                onClick={() => setTab("history")}
                className={`cursor-pointer active:scale-95 flex-1 py-2 text-center ${tab === "history" ? 'bg-orange-100 font-semibold' : ''}`}
              >
                History
              </button>
            </div>

            {/* ===== RULE PAGE ===== */}
            {tab === "rule" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center border rounded-lg p-2 gap-2">
                  <input
                    className="flex-1 outline-none"
                    placeholder={showSavedList ? "search saved rules" : "saved rules"}
                    value={showSavedList ? searchQuery : ""}
                    readOnly={!showSavedList}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (showSavedList) setSearchQuery(value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (showSavedList) {
                          // Just prevent form submits; filtering is live
                          e.preventDefault();
                        } else {
                          handleSaveRule();
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      setShowSavedList((prev) => {
                        const next = !prev;
                        if (next) {
                          setSearchQuery("");
                        }
                        return next;
                      });
                    }}
                    className="cursor-pointer active:scale-95 p-2 hover:bg-gray-100 rounded-lg border"
                    title={showSavedList ? "Hide saved rules" : "Show saved rules"}
                  >
                    {showSavedList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {showSavedList ? (
                  <div className="flex flex-col gap-2">
                    <div className="font-semibold text-sm text-gray-700">Saved Rules</div>
                    <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
                      {filteredSavedRules.length === 0 ? (
                        <div className="border rounded-lg px-3 py-2 text-sm text-gray-500 bg-white">
                          {searchQuery.trim() ? "No matches found." : "No saved rules yet."}
                        </div>
                      ) : (
                        filteredSavedRules.map((rule, idx) => (
                          <div
                            key={rule.id}
                            className="border rounded-lg px-3 py-2 bg-white shadow-[inset_0_1px_0_rgba(0,0,0,0.02)]"
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-sm text-gray-800 truncate flex-1">
                                {rule.name || rule.blocks.join(" • ")}
                              </div>
                              <span className="text-[10px] text-gray-400 shrink-0">
                                #{filteredSavedRules.length - idx}
                              </span>
                              <button
                                onClick={() => deleteSavedRule(rule.id)}
                                className="p-1 rounded hover:bg-red-50 text-red-500 shrink-0 cursor-pointer active:scale-95"
                                title="Delete saved rule"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-semibold text-sm text-gray-700">Categories</div>
                    <div className="grid grid-cols-1 gap-2">
                      {categories.map((text, idx) => (
                        <DraggableItem key={`cat-${idx}`} id={`cat-${idx}`} type="category">
                          {text}
                        </DraggableItem>
                      ))}
                    </div>

                    <div className="font-semibold text-sm mt-3 text-gray-700">Actions</div>
                    <div className="grid grid-cols-1 gap-2">
                      {actions.map((text, idx) => (
                        <DraggableItem key={`act-${idx}`} id={`act-${idx}`} type="action">
                          {text}
                        </DraggableItem>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ===== TAG PAGE ===== */}
            {tab === "tag" && (
              <div className="flex flex-col h-full gap-4">

                {/* Create New Tag Button */}
                <button
                  onClick={createNewTag}
                  className="cursor-pointer active:scale-95 w-full py-3 bg-orange-400 text-white rounded-lg hover:bg-orange-500 flex items-center justify-center gap-2 font-medium"
                >
                  <Plus size={20} /> Create New Tag
                </button>

                {/* Tags List with Drag-to-Reorder */}
                <DndContext onDragEnd={handleTagDragEnd}>
                  <div className="flex-1 overflow-y-auto">
                    <div className="font-semibold mb-3 text-sm">All Tags ({tags.length})</div>
                    <SortableContext items={tags.map(t => t.id)} strategy={verticalListSortingStrategy}>
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

                {/* AI Buttons */}
                <div className="flex gap-3 pt-3 border-t">
                  <button className="cursor-pointer active:scale-95 flex-1 py-2 border rounded-lg bg-white hover:bg-gray-50">AI Generate Tag</button>
                  <button className="cursor-pointer active:scale-95 flex-1 py-2 border rounded-lg bg-white hover:bg-gray-50">AI Assign Tag</button>
                </div>

                <button className="cursor-pointer active:scale-95 p-2 text-red-600 border rounded-lg flex items-center justify-center gap-2 hover:bg-red-50">
                  <Trash2 size={18} /> Delete All Tags
                </button>
              </div>
            )}

            {/* ===== HISTORY PAGE ===== */}
            {tab === "history" && (
              <div className="flex flex-col gap-4">
                {[1, 2].map((i) => {
                  const isStarred = starred.has(i);
                  return (
                    <div
                      key={i}
                      className={`border rounded-lg p-3 transition-colors ${isStarred ? "border-orange-400" : "border-gray-200"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">2025/10/23 {i === 1 ? "10:50" : "08:50"}</div>
                        <Star
                          size={20}
                          className={`cursor-pointer transition-colors ${isStarred ? "text-orange-400 fill-orange-400" : "text-gray-400"
                            }`}
                          onClick={() => toggleStar(i)}
                        />
                      </div>

                      <div className="text-sm text-gray-600 mb-3">
                        Rules: {i === 1 ? "sort game in date" : "another rule"}
                      </div>

                      <div className="w-full h-20 bg-gray-200 rounded mb-3" />

                      <button className="cursor-pointer active:scale-95 px-4 py-2 border rounded-lg bg-white">
                        Rollback
                      </button>
                    </div>
                  );
                })}

                <button className="cursor-pointer active:scale-95 text-red-600 flex items-center justify-center gap-2 border rounded-lg py-2">
                  <Trash2 size={18} /> Delete All History
                </button>
              </div>
            )}

          </div>
        </div>
        <DragOverlay>
          {activeId && activeItem ? (
            <div
              className={`p-2 rounded-lg text-sm shadow-lg opacity-80 ${activeItem.type === "category" ? "bg-blue-100" : "bg-orange-200"
                }`}
            >
              {activeItem.text}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext >
  );
}
