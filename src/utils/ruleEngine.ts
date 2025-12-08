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
    // Handle "All files" + "Sort by name"
    if (subject === "All files" && action === "Sort by name") {
        return sortAllFilesByName(items);
    }

    // Add more rule combinations here as needed
    return null;
}

/**
 * Sort all files by name alphabetically
 */
function sortAllFilesByName(items: DesktopItem[]): RuleExecutionResult {
    // Sort items alphabetically by label
    const sortedItems = [...items].sort((a, b) =>
        a.label.localeCompare(b.label)
    );

    // Arrange in a grid layout
    const startX = 20;
    const startY = 20;
    const gridSpacingX = 90; // Horizontal spacing between icons
    const gridSpacingY = 90; // Vertical spacing between icons
    const iconsPerRow = 10; // Number of icons per row

    const arrangedItems = sortedItems.map((item, index) => {
        const row = Math.floor(index / iconsPerRow);
        const col = index % iconsPerRow;

        return {
            ...item,
            x: startX + col * gridSpacingX,
            y: startY + row * gridSpacingY,
        };
    });

    return {
        items: arrangedItems,
        description: `Sorted ${arrangedItems.length} files alphabetically by name`,
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
