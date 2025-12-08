import { useState, useEffect, useRef } from "react";
import { ChevronDown, GripVertical, MoreVertical, Plus } from "lucide-react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HierarchyNode, SimpleRule } from './OrganizerTypes';
import { subjectOptions as defaultSubjectOptions, actionOptions } from './OrganizerConstants';

// Hierarchy List Component
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

// Hierarchical Dropdown Component
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
    folderName?: string;
    subjectOptions?: HierarchyNode[];  // Dynamic subject options
    openRuleMenu: string | null;
    ruleMenuRef: React.RefObject<HTMLDivElement | null>;
    onSelectSubject: (value: string) => void;
    onSelectAction: (value: string) => void;
    onFolderNameChange: (name: string) => void;
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
    folderName,
    subjectOptions,
    openRuleMenu,
    ruleMenuRef,
    onSelectSubject,
    onSelectAction,
    onFolderNameChange,
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

            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
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
                    options={actionOptions}
                    onSelect={onSelectAction}
                    align="right"
                />
                {selectedAction === 'Put in "__" folder named' && (
                    <input
                        type="text"
                        placeholder="Folder name"
                        value={folderName || ''}
                        onChange={(e) => onFolderNameChange(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                )}
                <button
                    onClick={onAddRule}
                    className="cursor-pointer active:scale-95 w-12 h-10 rounded-lg bg-white border border-gray-300 shadow-inner flex items-center justify-center hover:bg-gray-100"
                    title="Add rule"
                >
                    <Plus size={20} />
                </button>
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
                    className="cursor-pointer active:scale-95 flex-1 py-2 border border-gray-400 rounded-lg bg-white hover:bg-gray-50 shadow-inner"
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

// Saved Rules Section Component
type SavedRulesSectionProps = {
    savedRules: SimpleRule[];
    openSavedMenu: string | null;
    savedMenuRef: React.RefObject<HTMLDivElement | null>;
    onToggleMenu: (id: string) => void;
    onAddToApplied: (text: string) => void;
    onDelete: (id: string) => void;
};

export function SavedRulesSection({
    savedRules,
    openSavedMenu,
    savedMenuRef,
    onToggleMenu,
    onAddToApplied,
    onDelete,
}: SavedRulesSectionProps) {
    return (
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
                                onClick={() => onToggleMenu(rule.id)}
                                className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer active:scale-95"
                                title="More"
                            >
                                <MoreVertical size={16} />
                            </button>
                            {openSavedMenu === rule.id && (
                                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                                    <button
                                        onClick={() => {
                                            onAddToApplied(rule.text);
                                            onToggleMenu(rule.id);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                                    >
                                        Add to "To be Applied"
                                    </button>
                                    <button
                                        onClick={() => {
                                            onDelete(rule.id);
                                            onToggleMenu(rule.id);
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
    );
}
