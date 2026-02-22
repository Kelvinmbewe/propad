export const PROPERTY_PLACEHOLDER_IMAGE = "/icons/property-placeholder.svg";

export function propertyImageOrPlaceholder(url?: string | null) {
  if (!url || !url.trim()) return PROPERTY_PLACEHOLDER_IMAGE;
  return url;
}
