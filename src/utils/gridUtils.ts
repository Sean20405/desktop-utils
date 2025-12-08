import { GRID_WIDTH, GRID_HEIGHT, GRID_START_X, GRID_START_Y } from '../constants/gridConstants';

/**
 * Find the nearest available grid position to the target position
 * Prevents icons from overlapping by checking all occupied positions
 */
export function findNearestAvailablePosition(
    targetX: number,
    targetY: number,
    currentIconId: string,
    allItems: Array<{ id: string; x: number; y: number }>
): { x: number; y: number } {
    // Create a set of occupied positions (excluding current icon)
    const occupiedPositions = new Set(
        allItems
            .filter(item => item.id !== currentIconId)
            .map(item => `${item.x},${item.y}`)
    );

    // Snap to grid first
    const snappedX = Math.round((targetX - GRID_START_X) / GRID_WIDTH) * GRID_WIDTH + GRID_START_X;
    const snappedY = Math.round((targetY - GRID_START_Y) / GRID_HEIGHT) * GRID_HEIGHT + GRID_START_Y;

    // Check if target position is available
    const targetKey = `${snappedX},${snappedY}`;
    if (!occupiedPositions.has(targetKey)) {
        return { x: snappedX, y: snappedY };
    }

    // Target is occupied, find nearest available position using BFS
    const checked = new Set([targetKey]);
    const queue: Array<{ x: number; y: number; distance: number }> = [];

    // Add adjacent positions to queue
    const directions = [
        { dx: 0, dy: -1 },  // up
        { dx: 0, dy: 1 },   // down
        { dx: -1, dy: 0 },  // left
        { dx: 1, dy: 0 },   // right
        { dx: -1, dy: -1 }, // top-left
        { dx: 1, dy: -1 },  // top-right
        { dx: -1, dy: 1 },  // bottom-left
        { dx: 1, dy: 1 },   // bottom-right
    ];

    for (const dir of directions) {
        const newX = snappedX + dir.dx * GRID_WIDTH;
        const newY = snappedY + dir.dy * GRID_HEIGHT;
        const key = `${newX},${newY}`;

        if (!checked.has(key)) {
            checked.add(key);
            const distance = Math.sqrt(
                Math.pow(newX - snappedX, 2) + Math.pow(newY - snappedY, 2)
            );
            queue.push({ x: newX, y: newY, distance });
        }
    }

    // Sort by distance
    queue.sort((a, b) => a.distance - b.distance);

    // Search for available position
    for (const pos of queue) {
        const key = `${pos.x},${pos.y}`;
        if (!occupiedPositions.has(key) && pos.x >= GRID_START_X && pos.y >= GRID_START_Y) {
            return { x: pos.x, y: pos.y };
        }

        // Add neighbors to search
        for (const dir of directions) {
            const newX = pos.x + dir.dx * GRID_WIDTH;
            const newY = pos.y + dir.dy * GRID_HEIGHT;
            const newKey = `${newX},${newY}`;

            if (!checked.has(newKey) && newX >= GRID_START_X && newY >= GRID_START_Y) {
                checked.add(newKey);
                const distance = Math.sqrt(
                    Math.pow(newX - snappedX, 2) + Math.pow(newY - snappedY, 2)
                );
                queue.push({ x: newX, y: newY, distance });
                queue.sort((a, b) => a.distance - b.distance);
            }
        }
    }

    // Fallback: return snapped position (shouldn't happen in practice)
    return { x: snappedX, y: snappedY };
}
