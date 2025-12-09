import { toJpeg } from 'html-to-image';
import type { DesktopItem } from '../context/DesktopContext';

export async function generateThumbnail(items: DesktopItem[]): Promise<string> {
    const desktopElement = document.getElementById('desktop-container');

    if (desktopElement) {
        try {
            // Capture the actual desktop DOM
            // Use toJpeg for smaller size, quality 0.7
            const dataUrl = await toJpeg(desktopElement, {
                quality: 0.7,
                filter: (node) => {
                    // Exclude elements with class 'desktop-icon-label'
                    if (node.classList && node.classList.contains('desktop-icon-label')) {
                        return false;
                    }
                    return true;
                },
                style: {
                    transform: 'none', // Reset any transforms
                },
                // Handle CORS for external images (like Unsplash background)
                cacheBust: true, 
            });
            return dataUrl;
        } catch (error) {
            console.error('Failed to generate thumbnail from DOM:', error);
            // Fallback to canvas generation below
        }
    }

    // Fallback: Generate synthetic thumbnail using Canvas
    const canvas = document.createElement('canvas');
    const width = 320;
    const height = 180;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Draw background
    // Use a gradient to simulate the desktop background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#374151'); // gray-700
    gradient.addColorStop(1, '#1f2937'); // gray-800
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Scale factor (assuming 1920x1080 reference)
    const scaleX = width / 1920;
    const scaleY = height / 1080;
    const scale = Math.min(scaleX, scaleY);

    // Draw items
    // We'll use simple colored rectangles to represent icons
    // This is fast and avoids loading external images
    for (const item of items) {
        const x = item.x * scale;
        const y = item.y * scale;
        const iconSize = 48 * scale; 

        // Draw icon placeholder
        if (item.type === 'folder') {
            ctx.fillStyle = '#fbbf24'; // amber-400
        } else if (item.type === 'image' || item.imageUrl) {
            ctx.fillStyle = '#60a5fa'; // blue-400
        } else {
            ctx.fillStyle = '#9ca3af'; // gray-400
        }
        
        // Draw rounded rect (simulated)
        ctx.fillRect(x, y, iconSize, iconSize);
        
        // Draw label line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(x, y + iconSize + 2, iconSize, 2);
    }

    return canvas.toDataURL('image/jpeg', 0.7);
}
