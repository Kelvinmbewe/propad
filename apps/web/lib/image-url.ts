/**
 * Helper to construct image URLs from relative paths
 * Uses Next.js rewrites to proxy /uploads/* requests to the API, avoiding CORS/CSP issues
 */
export function getImageUrl(relativeUrl: string | null | undefined): string {
  if (!relativeUrl) {
    return 'https://images.unsplash.com/photo-1600596542815-2a4d9f0152e3?auto=format&fit=crop&w=800&q=80';
  }

  // If already a full URL (external), return as-is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    // If it's pointing to our API, convert to relative path to use rewrite
    if (relativeUrl.includes('localhost:3001') || relativeUrl.includes('/uploads/')) {
      const urlObj = new URL(relativeUrl);
      return urlObj.pathname + urlObj.search;
    }
    return relativeUrl;
  }

  // Use relative path - Next.js rewrite will proxy /uploads/* to the API
  // This avoids CORS and CSP issues since it's same-origin from browser perspective
  const path = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  return path;
}

