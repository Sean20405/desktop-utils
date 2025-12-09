import { useState, useEffect, useRef } from "react";
import { ChevronDown, GripVertical, MoreVertical, Plus, X } from "lucide-react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HierarchyNode, SimpleRule } from './OrganizerTypes';
import { subjectOptions as defaultSubjectOptions, actionOptions as defaultActionOptions } from './OrganizerConstants';

// Hierarchy List Component
function HierarchyList({
    nodes,
    path,
    onSelect,
    onRename,
    isEditableFolder,
    onAddFolder,
    onDeleteFolder,
    level = 0,
}: {
    nodes: HierarchyNode[];
    path?: string;
    onSelect: (value: string) => void;
    onRename?: (oldValue: string, newValue: string) => void;
    isEditableFolder?: (path: string, label: string) => boolean;
    onAddFolder?: (folderName: string) => void;
    onDeleteFolder?: (folderName: string) => void;
    level?: number;
}) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [editingNode, setEditingNode] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<string>("");
    const [newFolderName, setNewFolderName] = useState<string>("");

    const toggleExpand = (nodeKey: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeKey)) {
                next.delete(nodeKey);
            } else {
                next.add(nodeKey);
            }
            return next;
        });
    };

    const startEditing = (nodeKey: string, label: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingNode(nodeKey);
        setEditingValue(label);
    };

    const saveEditing = (currentValue: string) => {
        if (editingValue.trim() && editingValue !== currentValue.split(' > ').pop()) {
            const oldLabel = currentValue.split(' > ').pop() || currentValue;
            onRename?.(oldLabel, editingValue.trim());
        }
        setEditingNode(null);
        setEditingValue("");
    };

    const cancelEditing = () => {
        setEditingNode(null);
        setEditingValue("");
    };

    const handleAddNewFolder = () => {
        if (newFolderName.trim() && onAddFolder) {
            onAddFolder(newFolderName.trim());
            setNewFolderName("");
        }
    };

    return (
        <div className="space-y-1">
            {nodes.map((node, idx) => {
                const currentValue = path ? `${path} > ${node.label}` : node.label;
                const hasChildren = !!node.children?.length;
                const nodeKey = `${currentValue}-${idx}`;
                const isExpanded = expandedNodes.has(nodeKey);
                const isEditing = editingNode === nodeKey;
                const canEdit = !hasChildren && isEditableFolder?.(path || "", node.label);

                // Special handling for input field node
                const isInputNode = node.label === '__INPUT__';

                // Skip rendering the special __INPUT__ marker as a regular item
                if (isInputNode) {
                    return (
                        <div key={nodeKey} className="pt-2 border-t border-gray-200" style={{ paddingLeft: level ? 6 : 0 }}>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="新資料夾名稱..."
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleAddNewFolder();
                                        }
                                    }}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    onClick={handleAddNewFolder}
                                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 active:scale-95 transition-all"
                                    type="button"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={nodeKey} className="flex flex-col gap-0.5" style={{ paddingLeft: level ? 6 : 0 }}>
                        <div className="flex items-center gap-1">
                            {hasChildren ? (
                                <button
                                    onClick={() => toggleExpand(nodeKey)}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                                    title={isExpanded ? "Collapse" : "Expand"}
                                >
                                    {isExpanded ? (
                                        <ChevronDown size={16} className="text-gray-600 transition-transform" />
                                    ) : (
                                        <ChevronDown size={16} className="text-gray-600 transition-transform -rotate-90" />
                                    )}
                                </button>
                            ) : (
                                <span className="text-gray-400 leading-6 ml-1 flex-shrink-0">•</span>
                            )}
                            {hasChildren ? (
                                <span
                                    className={`flex-1 text-left px-2 py-1 text-sm ${level === 0 ? "text-gray-900 font-semibold" : "text-gray-800"} leading-6 whitespace-normal break-words`}
                                >
                                    {node.label}
                                </span>
                            ) : canEdit && isEditing ? (
                                <input
                                    type="text"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onBlur={() => saveEditing(currentValue)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            saveEditing(currentValue);
                                        } else if (e.key === 'Escape') {
                                            cancelEditing();
                                        }
                                    }}
                                    autoFocus
                                    className="flex-1 px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <div
                                    className={`flex-1 flex items-center px-2 py-1 rounded-md ${!canEdit ? 'hover:bg-gray-50 cursor-pointer' : ''} transition-colors`}
                                >
                                    <span
                                        onClick={(e) => {
                                            if (canEdit) {
                                                startEditing(nodeKey, node.label, e);
                                            } else {
                                                onSelect(currentValue);
                                            }
                                        }}
                                        className={`text-sm ${level === 0 ? "text-gray-900 font-semibold" : "text-gray-800"} leading-6 whitespace-normal break-words ${canEdit ? 'cursor-text hover:text-blue-600' : 'cursor-pointer'} flex-1`}
                                    >
                                        {node.label}
                                    </span>
                                    {path === "Put in folder" && onDeleteFolder && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteFolder(node.label);
                                            }}
                                            className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                            title="刪除資料夾"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        {hasChildren && isExpanded && (
                            <div className="ml-5 pl-3 border-l border-dashed border-gray-200 animate-in slide-in-from-top-1 duration-200">
                                <HierarchyList
                                    nodes={node.children!}
                                    path={currentValue}
                                    onSelect={onSelect}
                                    onRename={onRename}
                                    isEditableFolder={isEditableFolder}
                                    onAddFolder={onAddFolder}
                                    onDeleteFolder={onDeleteFolder}
                                    level={level + 1}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Hierarchical Dropdown Component
function HierarchicalDropdown({
    title,
    placeholder,
    selected,
    options,
    onSelect,
    onRename,
    isEditableFolder,
    onAddFolder,
    onDeleteFolder,
    align = "left",
}: {
    title: string;
    placeholder: string;
    selected?: string;
    options: HierarchyNode[];
    onSelect: (value: string) => void;
    onRename?: (oldValue: string, newValue: string) => void;
    isEditableFolder?: (path: string, label: string) => boolean;
    onAddFolder?: (folderName: string) => void;
    onDeleteFolder?: (folderName: string) => void;
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
                            onRename={onRename}
                            isEditableFolder={isEditableFolder}
                            onAddFolder={onAddFolder}
                            onDeleteFolder={onDeleteFolder}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Sortable Rule Item Component
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

/// Rules Panel Component
type RulesPanelProps = {
    rules: SimpleRule[];
    selectedSubject?: string;
    selectedAction?: string;
    subjectOptions?: HierarchyNode[];  // Dynamic subject options
    actionOptions?: HierarchyNode[];  // Dynamic action options
    isPreviewMode?: boolean;  // Preview mode indicator
    openRuleMenu: string | null;
    ruleMenuRef: React.RefObject<HTMLDivElement | null>;
    onSelectSubject: (value: string) => void;
    onSelectAction: (value: string) => void;
    onRenameFolder?: (oldName: string, newName: string) => void;
    onAddFolder?: (folderName: string) => void;
    onDeleteFolder?: (folderName: string) => void;
    onAddRule: () => void;
    onSaveRule: () => void;
    onEditRule: (id: string) => void;
    onRemoveRule: (id: string) => void;
    onDragEnd: (event: DragEndEvent) => void;
    onToggleMenu: (id: string) => void;
    onPreview: () => void;
    onApply: () => void;
};

export function RulesPanel({
    rules,
    selectedSubject,
    selectedAction,
    subjectOptions,
    actionOptions,
    isPreviewMode,
    openRuleMenu,
    ruleMenuRef,
    onSelectSubject,
    onSelectAction,
    onRenameFolder,
    onAddFolder,
    onDeleteFolder,
    onAddRule,
    onSaveRule,
    onEditRule,
    onRemoveRule,
    onDragEnd,
    onToggleMenu,
    onPreview,
    onApply,
}: RulesPanelProps) {
    return (
        <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
                <div className="text-lg font-semibold text-gray-800">To be Applied</div>
                <div className="text-xs uppercase tracking-wide text-gray-500">(Executed in order)</div>
            </div>

            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3 mb-3">
                    <HierarchicalDropdown
                        title="Subject"
                        placeholder="Subject"
                        selected={selectedSubject}
                        options={subjectOptions || defaultSubjectOptions}
                        onSelect={onSelectSubject}
                        align="left"
                    />
                    <HierarchicalDropdown
                        title="Action"
                        placeholder="Action"
                        selected={selectedAction}
                        options={actionOptions || defaultActionOptions}
                        onSelect={onSelectAction}
                        onRename={onRenameFolder}
                        onAddFolder={onAddFolder}
                        onDeleteFolder={onDeleteFolder}
                        align="right"
                    />
                    <button
                        onClick={onAddRule}
                        className="cursor-pointer active:scale-95 w-12 h-10 rounded-lg bg-white border border-gray-300 shadow-inner flex items-center justify-center hover:bg-gray-100 flex-shrink-0"
                        title="Add rule"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-white">
                <DndContext onDragEnd={onDragEnd}>
                    <SortableContext items={rules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                        {rules.map((rule) => (
                            <SortableRuleItem
                                key={rule.id}
                                rule={rule}
                                isMenuOpen={openRuleMenu === rule.id}
                                onToggleMenu={() => onToggleMenu(rule.id)}
                                onEdit={() => {
                                    onEditRule(rule.id);
                                    onToggleMenu(rule.id);
                                }}
                                onDelete={() => {
                                    onRemoveRule(rule.id);
                                    onToggleMenu(rule.id);
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
                    onClick={onSaveRule}
                    className="cursor-pointer active:scale-95 flex-1 py-2 border border-gray-400 rounded-lg bg-white hover:bg-gray-50 shadow-inner"
                >
                    Save
                </button>
                <button
                    onClick={onPreview}
                    className={`cursor-pointer active:scale-95 flex-1 py-2 border rounded-lg shadow-inner transition-colors ${isPreviewMode
                        ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
                        : 'bg-white border-gray-400 hover:bg-gray-50'
                        }`}
                >
                    Preview
                </button>
                <button
                    onClick={onApply}
                    className="cursor-pointer active:scale-95 flex-1 py-2 border border-gray-400 rounded-lg bg-white hover:bg-gray-50 shadow-inner"
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

// Saved Rule Item Component (Not draggable)
function SavedRuleItem({
    rule,
    isMenuOpen,
    onToggleMenu,
    onAddToApplied,
    onDelete,
    menuRef,
}: {
    rule: SimpleRule;
    isMenuOpen: boolean;
    onToggleMenu: () => void;
    onAddToApplied: () => void;
    onDelete: () => void;
    menuRef: React.RefObject<HTMLDivElement | null>;
}) {
// 判斷是否為群組
    const isGroup = rule.rules && rule.rules.length > 0;
    const ruleCount = isGroup ? rule.rules!.length : 1;

    return (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm px-3 py-3 flex items-start justify-between relative group hover:border-blue-300 transition-colors">
            <div className="flex flex-col gap-1 w-full min-w-0">
                {/* 標題與規則數量 */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800 truncate" title={rule.name || rule.text}>
                        {rule.name || rule.text}
                    </span>
                    {isGroup && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium flex-shrink-0">
                            {ruleCount} rules
                        </span>
                    )}
                </div>

                {/* 規則內容預覽 */}
                <div className="text-xs text-gray-500 flex flex-col gap-0.5 pl-1 border-l-2 border-gray-100">
                    {isGroup ? (
                        rule.rules!.slice(0, 3).map((r, idx) => (
                            <div key={idx} className="truncate">• {r.text}</div>
                        ))
                    ) : (
                        rule.name && rule.name !== rule.text && <div className="truncate">{rule.text}</div>
                    )}
                    {isGroup && rule.rules!.length > 3 && (
                        <div className="text-gray-400 pl-2">... and {rule.rules!.length - 3} more</div>
                    )}
                </div>
            </div>

            <div className="relative flex-shrink-0 ml-2">
                <button onClick={onToggleMenu} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                    <MoreVertical size={16} />
                </button>
                {isMenuOpen && (
                    <div ref={menuRef} className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-20">
                        <button
                            onClick={onAddToApplied}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                        >
                            Add to "To be Applied"
                        </button>
                        <button
                            onClick={onDelete}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Saved Rules Panel Component
type SavedRulesPanelProps = {
    savedRules: SimpleRule[];
    openSavedMenu: string | null;
    savedMenuRef: React.RefObject<HTMLDivElement | null>;
    onToggleMenu: (id: string) => void;
    onAddToApplied: (rule: SimpleRule) => void; // 修改這裡：接收整個 rule 物件
    onDelete: (id: string) => void;
};

export function SavedRulesPanel({
    savedRules,
    openSavedMenu,
    savedMenuRef,
    onToggleMenu,
    onAddToApplied,
    onDelete,
}: SavedRulesPanelProps) {
    return (
        <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
                <div className="text-lg font-semibold text-gray-800">Saved Rules</div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-white">
                {savedRules.map((rule) => (
                    <SavedRuleItem
                        key={rule.id}
                        rule={rule}
                        isMenuOpen={openSavedMenu === rule.id}
                        onToggleMenu={() => onToggleMenu(rule.id)}
                        onAddToApplied={() => {
                            onAddToApplied(rule); // 修改這裡：傳遞整個 rule 物件
                            onToggleMenu(rule.id);
                        }}
                        onDelete={() => {
                            onDelete(rule.id);
                            onToggleMenu(rule.id);
                        }}
                        menuRef={openSavedMenu === rule.id ? savedMenuRef : { current: null }}
                    />
                ))}
                {!savedRules.length && <div className="text-sm text-gray-500">No saved rules.</div>}
            </div>
        </div>
    );
}
