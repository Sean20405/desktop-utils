import type { DesktopItem } from '../context/DesktopContext';

export interface RuleExecutionResult {
    items: DesktopItem[];
    description: string;
}

/**
 * Execute a rule based on subject and action
 */
export function executeRule(
    subject: string,
    action: string,
    items: DesktopItem[]
): RuleExecutionResult | null {
    // Step 1: Filter items based on subject
    let filteredItems = filterItemsBySubject(subject, items);

    // Step 2: Execute action on filtered items
    if (action === "Sort by name") {
        return sortItems(filteredItems, items, 'name');
    }

    if (action === "Sort by last accessed time") {
        return sortItems(filteredItems, items, 'lastAccessed');
    }

    if (action === "Sort by last modified time") {
        return sortItems(filteredItems, items, 'lastModified');
    }

    if (action === "Sort by type") {
        return sortItems(filteredItems, items, 'type');
    }

    if (action === "Sort by file size") {
        return sortItems(filteredItems, items, 'fileSize');
    }

    // Handle "Put in folder" action
    // Extract folder name from action text like 'Put in "MyFolder" folder'
    if (action.startsWith('Put in "') && action.endsWith('" folder')) {
        const folderName = action.slice(8, -8); // Extract text between quotes (fixed: was 9)
        return putInFolder(filteredItems, items, folderName);
    }

    // Add more actions here as needed
    return null;
}

/**
 * Filter items based on subject criteria
 */
function filterItemsBySubject(subject: string, items: DesktopItem[]): DesktopItem[] {
    // Handle "All files"
    if (subject === "All files") {
        return items;
    }

    // Handle "File Type > [type]"
    if (subject.startsWith("File Type > ")) {
        const fileType = subject.replace("File Type > ", "");
        return filterByFileType(items, fileType);
    }

    // Default: return all items
    return items;
}

/**
 * Filter items by file type
 */
function filterByFileType(items: DesktopItem[], fileType: string): DesktopItem[] {
    return items.filter(item => item.type === fileType);
}

/**
 * Sort items by specified field and arrange in grid, avoiding overlaps with existing items
 */
type SortField = 'name' | 'lastAccessed' | 'lastModified' | 'type' | 'fileSize';

function sortItems(
    targetItems: DesktopItem[],
    allItems: DesktopItem[],
    sortBy: SortField
): RuleExecutionResult {
    // Sort the target items based on the specified field
    const sortedTargetItems = [...targetItems].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.label.localeCompare(b.label);

            case 'lastAccessed':
            case 'lastModified': {
                const dateA = new Date(a[sortBy] || 0).getTime();
                const dateB = new Date(b[sortBy] || 0).getTime();
                return dateB - dateA; // Newest first
            }

            case 'type':
                return a.type.localeCompare(b.type);

            case 'fileSize': {
                const sizeA = a.fileSize || 0;
                const sizeB = b.fileSize || 0;
                return sizeB - sizeA; // Largest first
            }

            default:
                return 0;
        }
    });

    // Grid configuration
    const startX = 20;
    const startY = 20;
    const gridSpacingX = 90;
    const gridSpacingY = 90;
    const iconsPerRow = 10;

    // Find the next available grid position
    // Check all existing items to find the lowest unoccupied spot
    const occupiedPositions = new Set(
        allItems
            .filter(item => !targetItems.some(target => target.id === item.id))
            .map(item => `${item.x},${item.y}`)
    );

    let currentRow = 0;
    let currentCol = 0;

    // Find first available position
    function findNextAvailablePosition(): { row: number; col: number } {
        while (true) {
            const x = startX + currentCol * gridSpacingX;
            const y = startY + currentRow * gridSpacingY;
            const posKey = `${x},${y}`;

            if (!occupiedPositions.has(posKey)) {
                return { row: currentRow, col: currentCol };
            }

            // Move to next grid position
            currentCol++;
            if (currentCol >= iconsPerRow) {
                currentCol = 0;
                currentRow++;
            }
        }
    }

    // Arrange sorted items starting from the first available position
    const arrangedTargetItems = sortedTargetItems.map((item) => {
        const { row, col } = findNextAvailablePosition();
        const x = startX + col * gridSpacingX;
        const y = startY + row * gridSpacingY;

        // Mark this position as occupied
        occupiedPositions.add(`${x},${y}`);

        // Move to next position for next item
        currentCol++;
        if (currentCol >= iconsPerRow) {
            currentCol = 0;
            currentRow++;
        }

        return {
            ...item,
            x,
            y,
        };
    });

    // Keep non-target items in their original positions
    const nonTargetItems = allItems.filter(
        item => !targetItems.some(target => target.id === item.id)
    );

    const resultItems = [...arrangedTargetItems, ...nonTargetItems];

    // Generate description based on sort field
    const descriptions: Record<SortField, string> = {
        name: 'alphabetically by name',
        lastAccessed: 'by last accessed time',
        lastModified: 'by last modified time',
        type: 'by type',
        fileSize: 'by file size'
    };

    return {
        items: resultItems,
        description: `Sorted ${arrangedTargetItems.length} files ${descriptions[sortBy]}`,
    };
}

/**
 * Put files into a folder (creates folder if it doesn't exist, hides files)
 */
function putInFolder(
    targetItems: DesktopItem[],
    allItems: DesktopItem[],
    folderName: string
): RuleExecutionResult {
    // Check if folder already exists
    let folderItem = allItems.find(
        item => item.type === 'folder' && item.label === folderName
    );

    // If folder doesn't exist, create it
    if (!folderItem) {
        folderItem = {
            id: `folder-${Date.now()}`,
            label: folderName,
            type: 'folder',
            x: 20,
            y: 20,
            imageUrl: '/icons/documents.svg',
            lastAccessed: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            createdTime: new Date().toISOString(),
            fileSize: 0,
        };
    }

    // Remove target items from the desktop (hide them)
    const nonTargetItems = allItems.filter(
        item => !targetItems.some(target => target.id === item.id)
    );

    // Ensure folder is in the result
    const folderExists = nonTargetItems.some(item => item.id === folderItem.id);
    const resultItems = folderExists ? nonTargetItems : [...nonTargetItems, folderItem];

    return {
        items: resultItems,
        description: `Put ${targetItems.length} file(s) into "${folderName}" folder`,
    };
}

/**
 * Parse a rule text to extract subject and action
 * Example: "All files + Sort by name" => { subject: "All files", action: "Sort by name" }
 */
export function parseRuleText(ruleText: string): { subject: string; action: string } | null {
    const parts = ruleText.split('+').map(p => p.trim());
    if (parts.length !== 2) {
        return null;
    }
    return {
        subject: parts[0],
        action: parts[1],
    };
}
