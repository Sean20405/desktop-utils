export type HierarchyNode = {
    label: string;
    children?: HierarchyNode[]
};

export type SimpleRule = {
    id: string;
    text: string
};

export type HistoryEntry = {
    id: string;
    time: string;
    title: string;
    starred: boolean;
    thumbnail?: string
};

export type TagItem = {
    id: string;
    name: string;
    color: string;
    items: string[];
    expanded: boolean
};
