import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";

export const DEFAULT_LIMIT = 18;
export const MIN_TRUST_SCORE = 70;

export function parseNumber(value: string | null | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseBoolean(value: string | null | undefined) {
  if (!value) return undefined;
  return value === "true" || value === "1";
}

export function buildBoundsFromCenter(
  lat: number,
  lng: number,
  radiusKm: number,
) {
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    southWest: { lat: lat - latDelta, lng: lng - lngDelta },
    northEast: { lat: lat + latDelta, lng: lng + lngDelta },
  };
}

export function buildBoundsString(lat: number, lng: number, radiusKm: number) {
  const bounds = buildBoundsFromCenter(lat, lng, radiusKm);
  return [
    bounds.southWest.lat,
    bounds.southWest.lng,
    bounds.northEast.lat,
    bounds.northEast.lng,
  ]
    .map((value) => value.toFixed(6))
    .join(",");
}

export function getApiBaseUrl() {
  return getRequiredPublicApiBaseUrl();
}

export function getListingTrustScore(listing: any) {
  const trustScore = Number(
    listing?.trustScore ?? listing?.verificationScore ?? 0,
  );
  if (trustScore > 0) return trustScore;
  const level = listing?.verificationLevel ?? "NONE";
  if (level === "TRUSTED") return 90;
  if (level === "VERIFIED") return 80;
  if (level === "BASIC") return 60;
  return 0;
}

export function isPublicListing(listing: any) {
  const status = listing?.status ?? "";
  return ["VERIFIED", "PUBLISHED"].includes(status);
}

export function isVerifiedListing(listing: any, minTrust: number) {
  const level = listing?.verificationLevel ?? "NONE";
  if (["VERIFIED", "TRUSTED"].includes(level)) return true;
  return getListingTrustScore(listing) >= minTrust;
}

export function getDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2) ** 2;
  const sinLng = Math.sin(dLng / 2) ** 2;
  const c =
    2 * Math.asin(Math.sqrt(sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng));
  return earthRadius * c;
}
