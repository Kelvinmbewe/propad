export function normalizeApiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

export function getPublicApiBaseUrl(): string | null {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL;
  return baseUrl ? normalizeApiBaseUrl(baseUrl) : null;
}

export function getRequiredPublicApiBaseUrl(): string {
  const baseUrl = getPublicApiBaseUrl();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be configured.");
  }
  return baseUrl;
}
