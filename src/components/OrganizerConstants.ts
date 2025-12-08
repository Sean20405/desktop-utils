import type { HierarchyNode } from './OrganizerTypes';

export const subjectOptions: HierarchyNode[] = [
    { label: "All files" },
    {
        label: "Tags",
        children: [{ label: "LLM generate" }],
    },
    {
        label: "Time",
        children: [
            { label: "Last Accessed" },
            { label: "Create Time" },
            { label: "Last Modified" },
        ],
    },
    {
        label: "File Type",
        children: [
            { label: "app" },
            { label: "folder" },
            { label: "settings" },
            { label: "file" },
            { label: "image" },
        ],
    },
    { label: "f-string" },
];

export const actionOptions: HierarchyNode[] = [
    {
        label: "Sort",
        children: [
            { label: "Sort by name" },
            { label: "Sort by last accessed time" },
            { label: "Sort by last modified time" },
            { label: "Sort by type" },
            { label: "Sort by file size" },
        ],
    },
    { label: "Put in folder" },
    { label: "Delete" },
    { label: "zip" },
];

/**
 * Generate dynamic action options based on user-created folders
 */
export function getActionOptionsWithFolders(folders: string[]): HierarchyNode[] {
    // Create children for "Put in folder": existing folders + input field
    const putInFolderChildren: HierarchyNode[] = [
        ...folders.map(folder => ({ label: folder })),
        { label: '__INPUT__' }, // Special marker for input field rendering
    ];

    return [
        {
            label: "Sort",
            children: [
                { label: "Sort by name" },
                { label: "Sort by last accessed time" },
                { label: "Sort by last modified time" },
                { label: "Sort by type" },
                { label: "Sort by file size" },
            ],
        },
        {
            label: "Put in folder",
            children: putInFolderChildren,
        },
        { label: "Delete" },
        { label: "zip" },
    ];
}

/**
 * Generate dynamic subject options based on actual tags
 */
export function getSubjectOptionsWithTags(tags: Array<{ name: string }>): HierarchyNode[] {
    return [
        { label: "All files" },
        {
            label: "Tags",
            children: tags.length > 0
                ? tags.map(tag => ({ label: tag.name }))
                : [{ label: "LLM generate" }],
        },
        {
            label: "Time",
            children: [
                { label: "Last Accessed" },
                { label: "Create Time" },
                { label: "Last Modified" },
            ],
        },
        {
            label: "File Type",
            children: [
                { label: "app" },
                { label: "folder" },
                { label: "settings" },
                { label: "file" },
                { label: "image" },
            ],
        },
        { label: "f-string" },
    ];
}
