import type { HierarchyNode } from './OrganizerTypes';

export const subjectOptions: HierarchyNode[] = [
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

export const actionOptions: HierarchyNode[] = [
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
