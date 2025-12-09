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
 * Extract unique file extensions from desktop items
 */
function extractFileExtensions(items: Array<{ label: string; type: string; path?: string }>): string[] {
    const extensions = new Set<string>();

    items.forEach(item => {
        // Use path if available, fallback to label
        const source = item.path || item.label;
        const lastDotIndex = source.lastIndexOf('.');

        // Extract extension if there is a dot and it's not at the start or end
        if (lastDotIndex > 0 && lastDotIndex < source.length - 1) {
            const extension = source.substring(lastDotIndex).toLowerCase(); // Include the dot

            // Filter out invalid extensions:
            // - Must have at least 2 characters after the dot
            // - Must not be purely numeric (like .1, .2, .10)
            const extWithoutDot = extension.substring(1);
            if (extWithoutDot.length >= 2 && !/^\d+$/.test(extWithoutDot)) {
                extensions.add(extension);
            }
        }
    });

    // Convert to array and sort alphabetically
    return Array.from(extensions).sort((a, b) => a.localeCompare(b));
}

/**
 * Generate dynamic subject options based on actual tags and file types
 */
export function getSubjectOptionsWithTags(
    tags: Array<{ name: string }>,
    items: Array<{ label: string; type: string; path?: string }>
): HierarchyNode[] {
    // Extract actual file extensions from desktop items
    const fileExtensions = extractFileExtensions(items);

    // Create file type children: extensions + folder indicator
    const fileTypeChildren: HierarchyNode[] = [];

    // Add dynamic extensions first
    if (fileExtensions.length > 0) {
        fileExtensions.forEach(ext => {
            fileTypeChildren.push({ label: ext });
        });
    }

    // Add folder indicator
    fileTypeChildren.push({ label: "/" });

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
            children: fileTypeChildren,
        },
        { label: "f-string" },
    ];
}

