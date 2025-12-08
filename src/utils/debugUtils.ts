import { parseDesktopInfo } from './parser';
import type { DesktopItem } from '../context/DesktopContext';

export async function loadDebugData(): Promise<{ items: DesktopItem[], size: { width: number, height: number } }> {
  // Load text file
  const textModules = import.meta.glob('../data/desktop_icon_info/Desktop_Icons_Info.txt', { query: '?raw', import: 'default' });
  const textPath = Object.keys(textModules)[0];
  
  if (!textPath) {
    throw new Error('Debug data file not found');
  }

  const textContent = await textModules[textPath]() as string;

  // Load images
  const imageModules = import.meta.glob('../data/desktop_icon_info/*.{png,jpg,ico,svg}', { eager: true });
  
  const imageMap = new Map<string, string>();
  
  for (const path in imageModules) {
    const fileName = path.split('/').pop();
    if (fileName) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const imageUrl = (imageModules[path] as any).default;
      imageMap.set(fileName, imageUrl);
    }
  }

  const items = parseDesktopInfo(textContent, imageMap);
  
  const width = 1920;
  const height = 1080;

  // Add Organizer app
  items.push({
    id: 'organizer',
    label: 'Desktop Organizer',
    type: 'app',
    x: width / 2 - 40,
    y: height / 2 - 55,
  });

  return { items, size: { width, height } };
}
