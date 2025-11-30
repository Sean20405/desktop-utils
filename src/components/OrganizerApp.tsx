import React, { useMemo, useState } from "react";
import { ChevronDown, Star, Trash2 } from "lucide-react";
import { useDesktop } from "../context/DesktopContext";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";

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

export function OrganizerApp() {
  const [tab, setTab] = useState<"rule" | "tag" | "history">("rule");
  const [rules, setRules] = useState<{ id: string; text: string; type: "category" | "action" }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<{ text: string; type: "category" | "action" } | null>(null);

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
              <button className="px-6 py-2 border rounded-lg bg-white hover:bg-gray-50">Save</button>
              <button className="px-6 py-2 border rounded-lg bg-white hover:bg-gray-50">Preview</button>
              <button className="px-6 py-2 border rounded-lg bg-white hover:bg-gray-50">Run</button>
            </div>
          </div>

          {/* Right side – Tabs */}
          <div className="w-96 border rounded-xl p-3 flex flex-col overflow-auto">

            {/* Tabs */}
            <div className="flex mb-4 border-b">
              <button
                onClick={() => setTab("rule")}
                className={`flex-1 py-2 text-center ${tab === "rule" ? 'bg-orange-100 font-semibold' : ''}`}
              >
                Rule
              </button>
              <button
                onClick={() => setTab("tag")}
                className={`flex-1 py-2 text-center ${tab === "tag" ? 'bg-orange-100 font-semibold' : ''}`}
              >
                Tag
              </button>
              <button
                onClick={() => setTab("history")}
                className={`flex-1 py-2 text-center ${tab === "history" ? 'bg-orange-100 font-semibold' : ''}`}
              >
                History
              </button>
            </div>

            {/* ===== RULE PAGE ===== */}
            {tab === "rule" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center border rounded-lg p-2">
                  <input className="flex-1 outline-none" placeholder="save rule" />
                  <ChevronDown size={18} />
                </div>

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
              </div>
            )}

            {/* ===== TAG PAGE ===== */}
            {tab === "tag" && (
              <div className="flex flex-col h-full">

                {/* ALL Tags */}
                <div className="flex flex-col border-b pb-3 mb-3">
                  <div className="font-semibold mb-2">ALL</div>
                  <div className="flex gap-2 flex-wrap">
                    {["Game 1", "Game 2", "Game 3", "Game 4", "doc 1", "doc 2"].map((t, i) => (
                      <div key={i} className="px-3 py-1 bg-orange-200 rounded-lg">{t}</div>
                    ))}
                  </div>
                </div>

                {/* Game category */}
                <div className="flex flex-col border-b pb-3 mb-3">
                  <div className="font-semibold mb-2">Games</div>
                  <div className="flex gap-2 flex-wrap">
                    {["Game 1", "Game 2", "Game 3", "Game 4"].map((t, i) => (
                      <div key={i} className="px-3 py-1 bg-blue-200 rounded-lg">{t}</div>
                    ))}
                  </div>
                </div>

                {/* File category */}
                <div className="flex flex-col pb-3">
                  <div className="font-semibold mb-2">File related</div>
                  <div className="flex gap-2 flex-wrap">
                    {["doc 1", "doc 2"].map((t, i) => (
                      <div key={i} className="px-3 py-1 bg-green-200 rounded-lg">{t}</div>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="mt-auto flex gap-3">
                  <button className="flex-1 py-2 border rounded-lg bg-white">AI Generate Tag</button>
                  <button className="flex-1 py-2 border rounded-lg bg-white">AI Assign Tag</button>
                </div>

                <button className="mt-3 p-2 text-red-600 border rounded-lg flex items-center justify-center gap-2">
                  <Trash2 size={18} /> Delete Tag
                </button>
              </div>
            )}

            {/* ===== HISTORY PAGE ===== */}
            {tab === "history" && (
              <div className="flex flex-col gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">2025/10/23 {i === 1 ? "10:50" : "08:50"}</div>
                      <Star size={20} className={i === 1 ? "text-yellow-500" : "text-gray-400"} />
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      Rules: {i === 1 ? "sort game in date" : "another rule"}
                    </div>

                    <div className="w-full h-20 bg-gray-200 rounded mb-3" />

                    <button className="px-4 py-2 border rounded-lg bg-white">
                      Rollback
                    </button>
                  </div>
                ))}

                <button className="text-red-600 flex items-center justify-center gap-2 border rounded-lg py-2">
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
    </DndContext>
  );
}
