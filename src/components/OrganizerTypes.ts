import type { DesktopItem } from '../context/DesktopContext';

export type HierarchyNode = {
    label: string;
    children?: HierarchyNode[]
};

export type SimpleRule = {
    id: string;
    text: string
    name?: string // 規則自訂名稱
    rules?: SimpleRule[]; // 新增：用於儲存一整組規則的陣列
    selectedRegion?: { x: number; y: number; width: number; height: number } | null; // 區域選取信息
};

export type HistoryEntry = {
    id: string;
    time: string;
    title: string;
    starred: boolean;
    thumbnail?: string;
    items: DesktopItem[];
};

export type TagItem = {
    id: string;
    name: string;
    color: string;
    items: string[];
    expanded: boolean
};
