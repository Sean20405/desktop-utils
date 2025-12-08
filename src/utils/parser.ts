import type { DesktopItem } from '../context/DesktopContext';

/**
 * Generate random timestamp within a given range
 * @param daysAgo - Number of days ago from now
 * @param maxDaysRange - Maximum range in days from the daysAgo point
 */
function generateRandomTimestamp(daysAgo: number, maxDaysRange: number = 30): string {
  const now = new Date();
  const minTime = now.getTime() - (daysAgo + maxDaysRange) * 24 * 60 * 60 * 1000;
  const maxTime = now.getTime() - daysAgo * 24 * 60 * 60 * 1000;
  const randomTime = minTime + Math.random() * (maxTime - minTime);
  return new Date(randomTime).toISOString();
}

/**
 * Generate random file size based on item type
 * @param type - Type of the desktop item
 */
function generateRandomFileSize(type: string): number {
  switch (type) {
    case 'folder':
      return 0; // Folders have 0 size
    case 'app':
      // Apps: 100KB to 5MB
      return Math.floor(100 * 1024 + Math.random() * (5 * 1024 * 1024 - 100 * 1024));
    case 'image':
      // Images: 500KB to 5MB
      return Math.floor(500 * 1024 + Math.random() * (5 * 1024 * 1024 - 500 * 1024));
    case 'file':
    default:
      // Files: 1KB to 10MB
      return Math.floor(1024 + Math.random() * (10 * 1024 * 1024 - 1024));
  }
}

/**
 * Detect item type based on label and other properties
 */
function detectItemType(label: string): string {
  const lowerLabel = label.toLowerCase();

  // Check if it's a folder
  if (lowerLabel.includes('folder') || lowerLabel.includes('資料夾') || lowerLabel.includes('文件夾')) {
    return 'folder';
  }

  // Check if it's an image
  if (lowerLabel.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i)) {
    return 'image';
  }

  // Check if it's an app
  if (lowerLabel.match(/\.(exe|app|lnk)$/i) ||
    !lowerLabel.includes('.')) {
    return 'app';
  }

  return 'file';
}

export function parseDesktopInfo(
  textContent: string,
  imageMap: Map<string, string>
): DesktopItem[] {
  const items: DesktopItem[] = [];
  const lines = textContent.split(/\r?\n/);

  let currentItem: Partial<DesktopItem> = {};

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('-----------------------------------')) {
      if (currentItem.id && currentItem.label) {
        // Detect type if not already set
        if (!currentItem.type || currentItem.type === 'file') {
          currentItem.type = detectItemType(currentItem.label);
        }

        // Generate timestamps
        const createdDaysAgo = Math.floor(Math.random() * 90); // Created 0-90 days ago
        const modifiedDaysAgo = Math.floor(Math.random() * createdDaysAgo); // Modified after creation
        const accessedDaysAgo = Math.floor(Math.random() * modifiedDaysAgo); // Accessed after modification

        currentItem.createdTime = generateRandomTimestamp(createdDaysAgo, 30);
        currentItem.lastModified = generateRandomTimestamp(modifiedDaysAgo, 10);
        currentItem.lastAccessed = generateRandomTimestamp(accessedDaysAgo, 5);

        // Generate file size
        currentItem.fileSize = generateRandomFileSize(currentItem.type);

        items.push(currentItem as DesktopItem);
      }
      currentItem = {};
      continue;
    }

    // Match [ID] Name
    const idMatch = trimmedLine.match(/^\[(\d+)\] (.+)$/);
    if (idMatch) {
      currentItem.id = idMatch[1];
      currentItem.label = idMatch[2].trim();
      currentItem.type = 'file'; // Default type, will be refined later
      continue;
    }

    // Match Position: (x, y)
    const posMatch = trimmedLine.match(/^位置: \((\d+), (\d+)\)/);
    if (posMatch) {
      currentItem.x = parseInt(posMatch[1], 10);
      currentItem.y = parseInt(posMatch[2], 10);
      continue;
    }

    // Match Path: ...
    const pathMatch = trimmedLine.match(/^路徑: (.+)$/);
    if (pathMatch) {
      currentItem.path = pathMatch[1].trim();
      continue;
    }

    // Match Icon: ... (Icon file: filename)
    const iconMatch = trimmedLine.match(/^圖示: .*\(Icon file: (.+)\)/);
    if (iconMatch) {
      const iconFilename = iconMatch[1];
      if (imageMap.has(iconFilename)) {
        currentItem.imageUrl = imageMap.get(iconFilename);
      }
    }
  }

  // Add last item if exists
  if (currentItem.id && currentItem.label) {
    // Detect type if not already set
    if (!currentItem.type || currentItem.type === 'file') {
      currentItem.type = detectItemType(currentItem.label);
    }

    // Generate timestamps
    const createdDaysAgo = Math.floor(Math.random() * 90);
    const modifiedDaysAgo = Math.floor(Math.random() * createdDaysAgo);
    const accessedDaysAgo = Math.floor(Math.random() * modifiedDaysAgo);

    currentItem.createdTime = generateRandomTimestamp(createdDaysAgo, 30);
    currentItem.lastModified = generateRandomTimestamp(modifiedDaysAgo, 10);
    currentItem.lastAccessed = generateRandomTimestamp(accessedDaysAgo, 5);

    // Generate file size
    currentItem.fileSize = generateRandomFileSize(currentItem.type);

    items.push(currentItem as DesktopItem);
  }

  return items;
}
