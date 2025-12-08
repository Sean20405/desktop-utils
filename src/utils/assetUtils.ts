/**
 * Resolves the correct asset URL based on the environment base path.
 * This is necessary for deployments on sub-paths (like GitHub Pages).
 */
export const getAssetUrl = (path: string | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;
  
  const baseUrl = import.meta.env.BASE_URL;

  // Avoid double-prefixing if the path already contains the base URL
  if (path.startsWith(baseUrl)) {
    return path;
  }

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  return `${baseUrl}${cleanPath}`;
};
