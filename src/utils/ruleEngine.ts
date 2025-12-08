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
        return sortByName(filteredItems, items);
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
 * Sort items by name and arrange in grid, avoiding overlaps with existing items
 */
function sortByName(
    targetItems: DesktopItem[],
    allItems: DesktopItem[]
): RuleExecutionResult {
    // Sort only the target items alphabetically
    const sortedTargetItems = [...targetItems].sort((a, b) =>
        a.label.localeCompare(b.label)
    );

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

    return {
        items: resultItems,
        description: `Sorted ${arrangedTargetItems.length} files alphabetically by name`,
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
