/**
 * Helper to construct image URLs from relative paths.
 */
import { getPublicApiBaseUrl } from "@/lib/api-base-url";

export function getImageUrl(relativeUrl: string | null | undefined): string {
  if (!relativeUrl) {
    return "https://images.unsplash.com/photo-1600596542815-2a4d9f0152e3?auto=format&fit=crop&w=800&q=80";
  }

  const apiBaseUrl = getPublicApiBaseUrl();
  const apiRoot = apiBaseUrl ? apiBaseUrl.replace(/\/v1$/, "") : null;

  const resolveUploadsPath = (path: string) => {
    if (!apiBaseUrl) {
      return path;
    }
    if (path.startsWith("/v1/uploads")) {
      return `${apiRoot}${path}`;
    }
    if (path.startsWith("/uploads")) {
      return `${apiBaseUrl}${path}`;
    }
    return path;
  };

  if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
    if (relativeUrl.includes("/uploads/")) {
      const urlObj = new URL(relativeUrl);
      return resolveUploadsPath(urlObj.pathname + urlObj.search);
    }
    return relativeUrl;
  }

  const path = relativeUrl.startsWith("/") ? relativeUrl : `/${relativeUrl}`;
  return resolveUploadsPath(path);
}
