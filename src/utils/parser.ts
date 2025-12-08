import type { DesktopItem } from '../context/DesktopContext';

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
      currentItem.type = 'file'; // Default type
      continue;
    }

    // Match Position: (x, y)
    const posMatch = trimmedLine.match(/^位置: \((\d+), (\d+)\)/);
    if (posMatch) {
      currentItem.x = parseInt(posMatch[1], 10);
      currentItem.y = parseInt(posMatch[2], 10);
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
    items.push(currentItem as DesktopItem);
  }

  return items;
}
