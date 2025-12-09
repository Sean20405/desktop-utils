/**
 * Centralized grid constants for desktop layout
 * 
 * These constants define the grid system used throughout the application
 * for positioning desktop icons. All components should import and use
 * these constants to ensure consistency.
 * 
 * Grid system:
 * - Width: 100 pixels
 * - Height: 110 pixels  
 * - Starting position: (20, 20)
 * 
 * Formula for grid positions:
 * - X = GRID_START_X + (column * GRID_WIDTH)
 * - Y = GRID_START_Y + (row * GRID_HEIGHT)
 */

// Grid cell dimensions
export const GRID_WIDTH = 100;
export const GRID_HEIGHT = 110;

// Grid starting position (offset)
export const GRID_START_X = 20;
export const GRID_START_Y = 20;

// Legacy aliases for compatibility
export const gridSizeX = GRID_WIDTH;
export const gridSizeY = GRID_HEIGHT;
export const offsetX = GRID_START_X;
export const offsetY = GRID_START_Y;
export const startX = GRID_START_X;
export const startY = GRID_START_Y;
export const gapX = GRID_WIDTH;
export const gapY = GRID_HEIGHT;

/**
 * Calculate grid-aligned position from pixel coordinates
 */
export function snapToGrid(x: number, y: number): { x: number; y: number } {
    const snappedX = Math.round((x - GRID_START_X) / GRID_WIDTH) * GRID_WIDTH + GRID_START_X;
    const snappedY = Math.round((y - GRID_START_Y) / GRID_HEIGHT) * GRID_HEIGHT + GRID_START_Y;
    return { x: snappedX, y: snappedY };
}

/**
 * Get grid column and row from pixel coordinates
 */
export function getGridPosition(x: number, y: number): { col: number; row: number } {
    const col = Math.round((x - GRID_START_X) / GRID_WIDTH);
    const row = Math.round((y - GRID_START_Y) / GRID_HEIGHT);
    return { col, row };
}

/**
 * Get pixel coordinates from grid column and row
 */
export function getPixelPosition(col: number, row: number): { x: number; y: number } {
    const x = GRID_START_X + col * GRID_WIDTH;
    const y = GRID_START_Y + row * GRID_HEIGHT;
    return { x, y };
}

/**
 * Shuffle desktop items to random grid positions
 * @param items - Array of desktop items to shuffle
 * @param maxWidth - Maximum width of the desktop area
 * @param maxHeight - Maximum height of the desktop area (excluding taskbar)
 * @returns Array of items with shuffled positions
 */
export function shufflePositions<T extends { id: string; x: number; y: number }>(
    items: T[],
    maxWidth: number,
    maxHeight: number
): T[] {
    // Calculate how many grid positions fit in the available area
    const maxCols = Math.floor((maxWidth - GRID_START_X) / GRID_WIDTH);
    const maxRows = Math.floor((maxHeight - GRID_START_Y) / GRID_HEIGHT);

    // Generate all possible grid positions
    const availablePositions: { col: number; row: number }[] = [];
    for (let row = 0; row < maxRows; row++) {
        for (let col = 0; col < maxCols; col++) {
            availablePositions.push({ col, row });
        }
    }

    // Fisher-Yates shuffle algorithm
    for (let i = availablePositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
    }

    // Assign shuffled positions to items
    return items.map((item, index) => {
        if (index < availablePositions.length) {
            const { col, row } = availablePositions[index];
            const { x, y } = getPixelPosition(col, row);
            return { ...item, x, y };
        }
        // If there are more items than available positions, keep original position
        return item;
    });
}

