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
