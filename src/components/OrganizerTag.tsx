import { ChevronDown, GripVertical, X, Plus, Loader2, Trash2 } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDesktop } from "../context/DesktopContext";
import { getAssetUrl } from "../utils/assetUtils";
import type { TagItem } from './OrganizerTypes';

// Draggable File Item Component
function DraggableFileItem({
    fileName,
    tagColor,
    sourceTagId,
    onDelete,
}: {
    fileName: string;
    tagColor: string;
    sourceTagId: string;
    onDelete?: () => void;
}) {
    const { items } = useDesktop();
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `file-${sourceTagId}-${fileName}`,
        data: {
            fileName,
            sourceTagId,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onDelete?.();
    };

    // 根據檔案名稱找到對應的桌面項目
    const desktopItem = items.find(item => item.label === fileName);

    // Use getAssetUrl to resolve icon URL consistently
    const iconSrc = desktopItem?.imageUrl ? getAssetUrl(desktopItem.imageUrl) : null;

    return (
        <div
            ref={setNodeRef}
            style={{ backgroundColor: tagColor + "40", ...style }}
            className="relative group px-2 py-2 rounded-lg text-sm cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity flex flex-col items-center gap-1 min-w-[60px] max-w-[80px]"
        >
            <div {...listeners} {...attributes} className="flex flex-col items-center gap-1 w-full">
                {iconSrc ? (
                    <img
                        src={iconSrc}
                        alt={fileName}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = "none";
                        }}
                    />
                ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded" />
                )}
                <span className="text-xs text-center line-clamp-2 break-words w-full">{fileName}</span>
            </div>
            {onDelete && (
                <button
                    onClick={handleDelete}
                    className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-full"
                    title="從此標籤中移除"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <X size={12} />
                </button>
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
    onRemoveFile,
}: {
    tag: TagItem;
    onToggleExpand: () => void;
    onStartEdit: () => void;
    onDelete: () => void;
    onColorChange: (color: string) => void;
    isEditing: boolean;
    editValue: string;
    onEditChange: (value: string) => void;
    onSaveEdit: () => void;
    onRemoveFile: (fileName: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tag.id });
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `tag-drop-${tag.id}`,
        data: {
            tagId: tag.id,
            type: 'tag-drop-zone',
        },
    });

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

            <div
                ref={setDroppableRef}
                className={`transition-colors min-h-[20px] ${isOver ? "bg-blue-50 border-2 border-blue-300 border-dashed border-t-0 rounded-b-lg" : ""
                    }`}
            >
                {tag.expanded ? (
                    <div className="px-3 pb-3 pt-0">
                        {tag.items.length > 0 ? (
                            <div className="flex gap-2 flex-wrap p-2 bg-gray-50 rounded">
                                {tag.items.map((item, idx) => (
                                    <DraggableFileItem
                                        key={idx}
                                        fileName={item}
                                        tagColor={tag.color}
                                        sourceTagId={tag.id}
                                        onDelete={() => onRemoveFile(item)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-2 bg-gray-50 rounded text-sm text-gray-400 text-center border-2 border-dashed border-gray-200">
                                拖放檔案到此處
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="px-3 pb-3 pt-0 min-h-[20px]" />
                )}
            </div>
        </div>
    );
}

type TagsPanelProps = {
    tags: TagItem[];
    editingTagId: string | null;
    editingName: string;
    isGeneratingTags: boolean;
    isAssigningTags: boolean;
    onCreateTag: () => void;
    onDeleteTag: (id: string) => void;
    onToggleExpand: (id: string) => void;
    onStartEdit: (id: string, currentName: string) => void;
    onSaveEdit: (id: string) => void;
    onEditChange: (value: string) => void;
    onColorChange: (id: string, color: string) => void;
    onRemoveFile: (tagId: string, fileName: string) => void;
    // Note: onDragEnd is NOT needed here - drag handling is done via DndContext in OrganizerApp
    onGenerateTags: () => void;
    onAssignTags: () => void;
};

export function TagsPanel({
    tags,
    editingTagId,
    editingName,
    isGeneratingTags,
    isAssigningTags,
    onCreateTag,
    onDeleteTag,
    onToggleExpand,
    onStartEdit,
    onSaveEdit,
    onEditChange,
    onColorChange,
    onRemoveFile,
    onGenerateTags,
    onAssignTags,
}: TagsPanelProps) {
    return (
        <div className="flex flex-col h-full gap-4 p-4 overflow-hidden">
            <button
                onClick={onCreateTag}
                className="cursor-pointer active:scale-95 w-full py-3 bg-orange-400 text-white rounded-lg hover:bg-orange-500 flex items-center justify-center gap-2 font-medium shadow"
            >
                <Plus size={20} /> Create New Tag
            </button>

            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="font-semibold mb-3 text-sm">All Tags ({tags.length})</div>
                <SortableContext items={tags.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2">
                        {tags.map((tag) => (
                            <SortableTagItem
                                key={tag.id}
                                tag={tag}
                                onToggleExpand={() => onToggleExpand(tag.id)}
                                onStartEdit={() => onStartEdit(tag.id, tag.name)}
                                onDelete={() => onDeleteTag(tag.id)}
                                onColorChange={(color) => onColorChange(tag.id, color)}
                                isEditing={editingTagId === tag.id}
                                editValue={editingName}
                                onEditChange={onEditChange}
                                onSaveEdit={() => onSaveEdit(tag.id)}
                                onRemoveFile={(fileName) => onRemoveFile(tag.id, fileName)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </div>

            <div className="flex gap-3 pt-3 border-t shrink-0">
                <button
                    onClick={onGenerateTags}
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
                    onClick={onAssignTags}
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
    );
}
