import type { DesktopItem } from '../context/DesktopContext';
import type { TagItem } from '../components/OrganizerTypes';

export interface RuleExecutionResult {
    items: DesktopItem[];
    description: string;
}

export interface RuleContext {
    items: DesktopItem[];
    tags?: TagItem[];
}

export interface RuleParams {
    // For "Put in folder"
    folderName?: string;
    // For "Tags > [tagName]"
    tagName?: string;
    // For "f-string"
    pattern?: string;
    // For "Time > ..."
    timeField?: 'lastAccessed' | 'lastModified' | 'createdTime';
    timeValue?: number;
    timeUnit?: 'day' | 'month' | 'year';
}

/**
 * Execute a rule based on subject and action
 */
export function executeRule(
    subject: string,
    action: string,
    context: RuleContext,
    params?: RuleParams
): RuleExecutionResult | null {
    const { items, tags } = context;

    // Step 1: Filter items based on subject
    let filteredItems = filterItemsBySubject(subject, items, tags, params);

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
    if (action.startsWith('Put in "') && action.endsWith('" folder')) {
        const folderName = action.slice(8, -8);
        return putInFolder(filteredItems, items, folderName);
    }

    return null;
}

/**
 * Filter items based on subject criteria
 */
function filterItemsBySubject(
    subject: string,
    items: DesktopItem[],
    tags?: TagItem[],
    params?: RuleParams
): DesktopItem[] {
    // Handle "All files"
    if (subject === "All files") {
        return items;
    }

    // Handle "File Type > [type]"
    if (subject.startsWith("File Type > ")) {
        const fileType = subject.replace("File Type > ", "");
        return filterByFileType(items, fileType);
    }

    // Handle "Tags > [tagName]"
    if (subject.startsWith("Tags > ")) {
        const tagName = subject.replace("Tags > ", "");
        return filterByTag(items, tagName, tags || []);
    }

    // Handle "f-string"
    if (subject === "f-string" && params?.pattern) {
        return filterByPattern(items, params.pattern);
    }

    // Handle "Time > ..."
    if (subject.startsWith("Time > ")) {
        if (params?.timeField && params?.timeValue && params?.timeUnit) {
            return filterByTime(items, params.timeField, params.timeValue, params.timeUnit);
        }
    }

    return items;
}

/**
 * Filter items by file type
 */
function filterByFileType(items: DesktopItem[], fileType: string): DesktopItem[] {
    return items.filter(item => item.type === fileType);
}

/**
 * Filter items by tag
 */
function filterByTag(items: DesktopItem[], tagName: string, tags: TagItem[]): DesktopItem[] {
    const tag = tags.find(t => t.name === tagName);
    if (!tag) return [];

    return items.filter(item => tag.items.includes(item.label));
}

/**
 * Filter items by pattern matching (supports * and ?)
 */
function filterByPattern(items: DesktopItem[], pattern: string): DesktopItem[] {
    // Convert pattern to regex
    const regexPattern = pattern
        .replace(/\./g, '\\.')  // Escape dots
        .replace(/\*/g, '.*')   // * becomes .*
        .replace(/\?/g, '.');   // ? becomes .

    const regex = new RegExp(`^${regexPattern}$`, 'i'); // Case insensitive

    return items.filter(item => regex.test(item.label));
}

/**
 * Filter items by time
 */
function filterByTime(
    items: DesktopItem[],
    timeField: 'lastAccessed' | 'lastModified' | 'createdTime',
    value: number,
    unit: 'day' | 'month' | 'year'
): DesktopItem[] {
    const now = new Date();
    const threshold = calculateThreshold(now, value, unit);

    return items.filter(item => {
        const itemDate = new Date(item[timeField] || '');
        return itemDate >= threshold;
    });
}

/**
 * Calculate threshold date for time filtering
 */
function calculateThreshold(now: Date, value: number, unit: 'day' | 'month' | 'year'): Date {
    const threshold = new Date(now);

    switch (unit) {
        case 'day':
            threshold.setDate(threshold.getDate() - value);
            break;
        case 'month':
            threshold.setMonth(threshold.getMonth() - value);
            break;
        case 'year':
            threshold.setFullYear(threshold.getFullYear() - value);
            break;
    }

    return threshold;
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
    const sortedTargetItems = [...targetItems].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.label.localeCompare(b.label);

            case 'lastAccessed':
            case 'lastModified': {
                const dateA = new Date(a[sortBy] || 0).getTime();
                const dateB = new Date(b[sortBy] || 0).getTime();
                return dateB - dateA;
            }

            case 'type':
                return a.type.localeCompare(b.type);

            case 'fileSize': {
                const sizeA = a.fileSize || 0;
                const sizeB = b.fileSize || 0;
                return sizeB - sizeA;
            }

            default:
                return 0;
        }
    });

    const startX = 20;
    const startY = 20;
    const gridSpacingX = 90;
    const gridSpacingY = 90;
    const iconsPerRow = 10;

    const occupiedPositions = new Set(
        allItems
            .filter(item => !targetItems.some(target => target.id === item.id))
            .map(item => `${item.x},${item.y}`)
    );

    let currentRow = 0;
    let currentCol = 0;

    function findNextAvailablePosition(): { row: number; col: number } {
        while (true) {
            const x = startX + currentCol * gridSpacingX;
            const y = startY + currentRow * gridSpacingY;
            const posKey = `${x},${y}`;

            if (!occupiedPositions.has(posKey)) {
                return { row: currentRow, col: currentCol };
            }

            currentCol++;
            if (currentCol >= iconsPerRow) {
                currentCol = 0;
                currentRow++;
            }
        }
    }

    const arrangedTargetItems = sortedTargetItems.map((item) => {
        const { row, col } = findNextAvailablePosition();
        const x = startX + col * gridSpacingX;
        const y = startY + row * gridSpacingY;

        occupiedPositions.add(`${x},${y}`);

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

    const nonTargetItems = allItems.filter(
        item => !targetItems.some(target => target.id === item.id)
    );

    const resultItems = [...arrangedTargetItems, ...nonTargetItems];

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
 * Put files into a folder
 */
function putInFolder(
    targetItems: DesktopItem[],
    allItems: DesktopItem[],
    folderName: string
): RuleExecutionResult {
    let folderItem = allItems.find(
        item => item.type === 'folder' && item.label === folderName
    );

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

    const nonTargetItems = allItems.filter(
        item => !targetItems.some(target => target.id === item.id)
    );

    const folderExists = nonTargetItems.some(item => item.id === folderItem.id);
    const resultItems = folderExists ? nonTargetItems : [...nonTargetItems, folderItem];

    return {
        items: resultItems,
        description: `Put ${targetItems.length} file(s) into "${folderName}" folder`,
    };
}

/**
 * Parse a rule text to extract subject and action
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
