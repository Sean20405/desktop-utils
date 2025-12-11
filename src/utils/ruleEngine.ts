import type { DesktopItem } from '../context/DesktopContext';
import type { TagItem } from '../components/OrganizerTypes';
import { GRID_WIDTH, GRID_HEIGHT, GRID_START_X, GRID_START_Y } from '../constants/gridConstants';

export interface RuleExecutionResult {
    items: DesktopItem[];
    description: string;
}

export interface RuleContext {
    items: DesktopItem[];
    tags?: TagItem[];
    selectedRegion?: { x: number; y: number; width: number; height: number } | null;
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
    // Support both flat format ("Sort by name") and hierarchical format ("Sort > Sort by name")
    if (action === "Sort by name" || action === "Sort > Sort by name") {
        return sortItems(filteredItems, items, 'name', context.selectedRegion);
    }

    if (action === "Sort by last accessed time" || action === "Sort > Sort by last accessed time") {
        return sortItems(filteredItems, items, 'lastAccessed', context.selectedRegion);
    }

    if (action === "Sort by last modified time" || action === "Sort > Sort by last modified time") {
        return sortItems(filteredItems, items, 'lastModified', context.selectedRegion);
    }

    if (action === "Sort by type" || action === "Sort > Sort by type") {
        return sortItems(filteredItems, items, 'type', context.selectedRegion);
    }

    if (action === "Sort by file size" || action === "Sort > Sort by file size") {
        return sortItems(filteredItems, items, 'fileSize', context.selectedRegion);
    }

    // Handle "Put in folder" action
    if (action.startsWith('Put in "') && action.endsWith('" folder')) {
        const folderName = action.slice(8, -8);
        return putInFolder(filteredItems, items, folderName, context.selectedRegion);
    }

    // Handle "Delete" action
    if (action === "Delete") {
        return deleteItems(filteredItems);
    }

    // Handle "Zip" action - similar to Put in folder
    if (action.startsWith('Zip in "') && action.endsWith('" folder')) {
        const folderName = action.slice(8, -8);
        return zipItems(filteredItems, items, folderName, context.selectedRegion);
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

    // Handle "F-string: [pattern]" (new format with uppercase F)
    if (subject.startsWith("F-string: ")) {
        const pattern = subject.replace("F-string: ", "");
        return filterByPattern(items, pattern);
    }

    // Handle "Time > ..." (new format with within/over and date)
    if (subject.startsWith("Time > ")) {
        // Parse the time filter from the subject string
        // Format: "Time > [timeField] [within|over] [date]"
        // Example: "Time > Last Accessed within 2024-12-10"
        const timeStr = subject.replace("Time > ", "");
        const parts = timeStr.split(" ");

        if (parts.length >= 3) {
            // Extract time field (could be multi-word like "Last Accessed")
            let timeField: 'lastAccessed' | 'lastModified' | 'createdTime' | undefined;
            let mode: 'within' | 'over' | undefined;
            let dateStr: string | undefined;

            // Find the mode keyword (within or over)
            const modeIndex = parts.findIndex(p => p === 'within' || p === 'over');
            if (modeIndex !== -1) {
                mode = parts[modeIndex] as 'within' | 'over';
                dateStr = parts.slice(modeIndex + 1).join(" ");

                // Determine time field from the words before mode
                const fieldName = parts.slice(0, modeIndex).join(" ");
                if (fieldName === "Last Accessed") {
                    timeField = 'lastAccessed';
                } else if (fieldName === "Create Time") {
                    timeField = 'createdTime';
                } else if (fieldName === "Last Modified") {
                    timeField = 'lastModified';
                }

                if (timeField && mode && dateStr) {
                    return filterByTimeDate(items, timeField, mode, dateStr);
                }
            }
        }

        // Fallback: check if params are provided (backward compatibility)
        if (params?.timeField && params?.timeValue && params?.timeUnit) {
            return filterByTime(items, params.timeField, params.timeValue, params.timeUnit);
        }
    }

    return items;
}

/**
 * Extract file extension from a desktop item using path or label
 */
function getFileExtension(item: DesktopItem): string {
    // Use path if available, fallback to label
    const source = item.path || item.label;
    const lastDotIndex = source.lastIndexOf('.');
    if (lastDotIndex > 0 && lastDotIndex < source.length - 1) {
        return source.substring(lastDotIndex); // Include the dot, e.g., ".jpg"
    }
    return '';
}

/**
 * Filter items by file type (handles both extensions like ".jpg" and types like "app")
 */
function filterByFileType(items: DesktopItem[], fileType: string): DesktopItem[] {
    // Check if fileType is "/" (folder indicator)
    if (fileType === "/") {
        return items.filter(item => item.type === "folder");
    }

    // Check if fileType is an extension (starts with a dot)
    if (fileType.startsWith('.')) {
        // Filter by file extension from path or label
        // IMPORTANT: Never filter folders by extension, even if folder name contains a dot
        return items.filter(item => {
            if (item.type === 'folder') return false;  // Folders are excluded
            const extension = getFileExtension(item);
            return extension.toLowerCase() === fileType.toLowerCase();
        });
    }

    // Otherwise, filter by the type field (app, folder, settings, file, image, etc.)
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
 * Filter items by time using date string and within/over mode
 */
function filterByTimeDate(
    items: DesktopItem[],
    timeField: 'lastAccessed' | 'lastModified' | 'createdTime',
    mode: 'within' | 'over',
    dateStr: string
): DesktopItem[] {
    const targetDate = new Date(dateStr);
    const now = new Date();

    // Validate date
    if (isNaN(targetDate.getTime())) {
        console.warn(`Invalid date: ${dateStr}`);
        return items;
    }

    return items.filter(item => {
        const itemDate = new Date(item[timeField] || '');
        if (isNaN(itemDate.getTime())) {
            return false;
        }

        if (mode === 'within') {
            // Files modified/accessed between targetDate and now
            return itemDate >= targetDate && itemDate <= now;
        } else {
            // Files modified/accessed before targetDate (over X time ago)
            return itemDate < targetDate;
        }
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
    sortBy: SortField,
    region?: { x: number; y: number; width: number; height: number } | null
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

            case 'type': {
                // Sort by file extension instead of type field
                const extA = getFileExtension(a);
                const extB = getFileExtension(b);

                // If both have extensions, compare them
                if (extA && extB) {
                    return extA.toLowerCase().localeCompare(extB.toLowerCase());
                }

                // Files without extension come after files with extension
                // But folders (type === 'folder') come first
                if (a.type === 'folder' && b.type !== 'folder') return -1;
                if (a.type !== 'folder' && b.type === 'folder') return 1;

                // If one has extension and other doesn't, extension comes first
                if (extA && !extB) return -1;
                if (!extA && extB) return 1;

                // If both don't have extensions, sort by type field as fallback
                return a.type.localeCompare(b.type);
            }

            case 'fileSize': {
                const sizeA = a.fileSize || 0;
                const sizeB = b.fileSize || 0;
                return sizeB - sizeA;
            }

            default:
                return 0;
        }
    });

    // Use centralized grid constants
    // Icons fill vertically first (column-by-column layout like Windows)
    const iconsPerCol = 8;    // Maximum rows per column

    const occupiedPositions = new Set(
        allItems
            .filter(item => !targetItems.some(target => target.id === item.id))
            .map(item => `${item.x},${item.y}`)
    );

    // If region is specified, calculate starting position within region
    let startRow = 0;
    let startCol = 0;
    let maxRow = iconsPerCol;
    let maxCol = 100; // Default max columns

    if (region) {
        // Calculate grid positions within the region
        startCol = Math.floor((region.x - GRID_START_X) / GRID_WIDTH);
        startRow = Math.floor((region.y - GRID_START_Y) / GRID_HEIGHT);
        const endCol = Math.floor((region.x + region.width - GRID_START_X) / GRID_WIDTH);
        const endRow = Math.floor((region.y + region.height - GRID_START_Y) / GRID_HEIGHT);

        // Ensure we don't go negative
        startCol = Math.max(0, startCol);
        startRow = Math.max(0, startRow);
        maxCol = endCol + 1;
        maxRow = endRow + 1;
    }

    let currentRow = startRow;
    let currentCol = startCol;

    function findNextAvailablePosition(): { row: number; col: number } | null {
        let attempts = 0;
        const maxAttempts = region ? (maxRow - startRow) * (maxCol - startCol) : 1000;

        while (attempts < maxAttempts) {
            const x = GRID_START_X + currentCol * GRID_WIDTH;
            const y = GRID_START_Y + currentRow * GRID_HEIGHT;
            const posKey = `${x},${y}`;

            // If region is specified, check if position (including icon size) is completely within region bounds
            if (region) {
                // Check if the entire icon (100x110px) fits within the region
                const iconRight = x + GRID_WIDTH;
                const iconBottom = y + GRID_HEIGHT;

                if (x < region.x || iconRight > region.x + region.width ||
                    y < region.y || iconBottom > region.y + region.height) {
                    // Position is outside region, skip it
                    currentRow++;
                    if (currentRow >= maxRow) {
                        currentRow = startRow;
                        currentCol++;
                        if (currentCol >= maxCol) {
                            // No more positions in region, return null (don't fallback to entire grid)
                            return null;
                        }
                    }
                    attempts++;
                    continue;
                }
            }

            if (!occupiedPositions.has(posKey)) {
                return { row: currentRow, col: currentCol };
            }

            // Move down first (vertical-first layout like Windows)
            currentRow++;
            if (currentRow >= maxRow) {
                currentRow = startRow;
                currentCol++;
                if (currentCol >= maxCol) {
                    // If region specified, don't fallback to entire grid - return null
                    if (region) {
                        return null;
                    }
                    // No more positions available
                    return null;
                }
            }
            attempts++;
        }

        // If region specified and we've exhausted all attempts, return null
        // Don't fallback to entire grid - we want to keep files within the region
        return null;
    }

    const arrangedTargetItems = sortedTargetItems.map((item) => {
        const position = findNextAvailablePosition();
        if (!position) {
            // If no position found, keep original position
            return item;
        }

        const { row, col } = position;
        const x = GRID_START_X + col * GRID_WIDTH;
        const y = GRID_START_Y + row * GRID_HEIGHT;

        occupiedPositions.add(`${x},${y}`);

        // Move to next position for next item
        currentRow = row;
        currentCol = col;

        // Move down first (vertical-first layout like Windows)
        currentRow++;
        if (region) {
            if (currentRow >= maxRow) {
                currentRow = startRow;
                currentCol++;
                if (currentCol >= maxCol) {
                    // Fallback to entire grid
                    currentRow = 0;
                    currentCol = 0;
                }
            }
        } else {
            if (currentRow >= iconsPerCol) {
                currentRow = 0;
                currentCol++;
            }
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
 * Find first available grid position
 * @param allItems - All items to check for occupied positions
 * @param region - Optional region to limit search within (x, y, width, height)
 */
function findFirstAvailablePosition(
    allItems: DesktopItem[],
    region?: { x: number; y: number; width: number; height: number } | null
): { x: number; y: number } {
    const iconsPerCol = 8;   // Maximum rows per column
    const maxColumns = 100;  // Maximum columns to search
    const occupiedPositions = new Set(
        allItems.map(item => `${item.x},${item.y}`)
    );

    // If region is specified, search within the region first
    if (region) {
        // Calculate grid positions within the region
        const startCol = Math.floor((region.x - GRID_START_X) / GRID_WIDTH);
        const endCol = Math.floor((region.x + region.width - GRID_START_X) / GRID_WIDTH);
        const startRow = Math.floor((region.y - GRID_START_Y) / GRID_HEIGHT);
        const endRow = Math.floor((region.y + region.height - GRID_START_Y) / GRID_HEIGHT);

        // Search within region bounds
        for (let col = Math.max(0, startCol); col <= endCol; col++) {
            for (let row = Math.max(0, startRow); row <= endRow; row++) {
                const x = GRID_START_X + col * GRID_WIDTH;
                const y = GRID_START_Y + row * GRID_HEIGHT;

                // Check if position is within region bounds
                if (x >= region.x && x <= region.x + region.width &&
                    y >= region.y && y <= region.y + region.height) {
                    const posKey = `${x},${y}`;
                    if (!occupiedPositions.has(posKey)) {
                        return { x, y };
                    }
                }
            }
        }
    }

    // If no region or no position found in region, search entire grid
    for (let col = 0; col < maxColumns; col++) {
        for (let row = 0; row < iconsPerCol; row++) {
            const x = GRID_START_X + col * GRID_WIDTH;
            const y = GRID_START_Y + row * GRID_HEIGHT;
            const posKey = `${x},${y}`;

            if (!occupiedPositions.has(posKey)) {
                return { x, y };
            }
        }
    }

    // Fallback to far right of grid
    return { x: GRID_START_X + maxColumns * GRID_WIDTH, y: GRID_START_Y };
}

/**
 * Delete selected items
 */
function deleteItems(targetItems: DesktopItem[]): RuleExecutionResult {
    console.log(`[deleteItems] Deleting ${targetItems.length} items`);

    return {
        items: [], // Return empty array - all target items are deleted
        description: `Deleted ${targetItems.length} file(s)`,
    };
}

/**
 * Zip files into a folder (similar to putInFolder but with .zip extension and locked icon)
 */
function zipItems(
    targetItems: DesktopItem[],
    allItems: DesktopItem[],
    folderName: string,
    region?: { x: number; y: number; width: number; height: number } | null
): RuleExecutionResult {
    console.log(`[zipItems] Processing zip: "${folderName}.zip"`);
    console.log(`[zipItems] Total items before: ${allItems.length}, Target items: ${targetItems.length}`);
    if (region) {
        console.log(`[zipItems] Region: (${region.x}, ${region.y}) ${region.width}x${region.height}`);
    }

    const zipFileName = `${folderName}.zip`;
    let zipItem = allItems.find(
        item => item.type === 'folder' && item.label === zipFileName
    );

    console.log(`[zipItems] Zip "${zipFileName}" exists:`, !!zipItem);

    // Calculate non-target items first (items that will remain after this operation)
    const nonTargetItems = allItems.filter(
        item => !targetItems.some(target => target.id === item.id)
    );

    console.log(`[zipItems] Non-target items: ${nonTargetItems.length}`);

    if (!zipItem) {
        // When finding position for new zip, exclude target items
        const position = findFirstAvailablePosition(nonTargetItems, region);
        zipItem = {
            id: `zip-${Date.now()}`,
            label: zipFileName,
            type: 'folder',
            x: position.x,
            y: position.y,
            imageUrl: '/folder-locked.png', // Locked folder icon
            lastAccessed: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            createdTime: new Date().toISOString(),
            fileSize: targetItems.reduce((sum, item) => sum + (item.fileSize || 0), 0),
        };
        console.log(`[zipItems] Created new zip at (${position.x}, ${position.y})`);
    }

    // Build result: keep all non-target items and ensure the zip is included
    const resultItems = [...nonTargetItems];

    // Always ensure the zip is in the result
    const zipAlreadyIncluded = nonTargetItems.some(item => item.id === zipItem!.id);
    if (!zipAlreadyIncluded) {
        resultItems.push(zipItem!);
    }

    console.log(`[zipItems] Result: ${resultItems.length} items total`);

    return {
        items: resultItems,
        description: `Zipped ${targetItems.length} file(s) into "${zipFileName}"`,
    };
}

/**
 * Put files into a folder
 */
function putInFolder(
    targetItems: DesktopItem[],
    allItems: DesktopItem[],
    folderName: string,
    region?: { x: number; y: number; width: number; height: number } | null
): RuleExecutionResult {
    console.log(`[putInFolder] Processing folder: "${folderName}"`);
    console.log(`[putInFolder] Total items before: ${allItems.length}, Target items: ${targetItems.length}`);
    if (region) {
        console.log(`[putInFolder] Region: (${region.x}, ${region.y}) ${region.width}x${region.height}`);
    }

    let folderItem = allItems.find(
        item => item.type === 'folder' && item.label === folderName
    );

    console.log(`[putInFolder] Folder "${folderName}" exists:`, !!folderItem);

    // Calculate non-target items first (items that will remain after this operation)
    const nonTargetItems = allItems.filter(
        item => !targetItems.some(target => target.id === item.id)
    );

    console.log(`[putInFolder] Non-target items: ${nonTargetItems.length}`);
    console.log(`[putInFolder] Non-target folders:`, nonTargetItems.filter(i => i.type === 'folder').map(i => i.label));

    if (!folderItem) {
        // When finding position for new folder, exclude target items
        // because they will be removed/moved and shouldn't block placement
        // If region is specified, try to place folder within the region
        const position = findFirstAvailablePosition(nonTargetItems, region);
        folderItem = {
            id: `folder-${Date.now()}`,
            label: folderName,
            type: 'folder',
            x: position.x,
            y: position.y,
            imageUrl: '/icons/documents.svg',
            lastAccessed: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            createdTime: new Date().toISOString(),
            fileSize: 0,
        };
        console.log(`[putInFolder] Created new folder at (${position.x}, ${position.y})`);
    }

    // Build result: keep all non-target items and ensure the folder is included
    // Start with non-target items
    const resultItems = [...nonTargetItems];

    // Always ensure the destination folder is in the result
    // Check if folder is already in nonTargetItems (by id)
    const folderAlreadyIncluded = nonTargetItems.some(item => item.id === folderItem.id);
    if (!folderAlreadyIncluded) {
        resultItems.push(folderItem);
    }

    console.log(`[putInFolder] Result: ${resultItems.length} items total`);
    console.log(`[putInFolder] Result folders:`, resultItems.filter(i => i.type === 'folder').map(i => i.label));

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
