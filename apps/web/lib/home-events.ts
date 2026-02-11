type LocationEventType =
  | "SEARCH"
  | "VIEW_LISTING"
  | "VIEW_AGENT"
  | "VIEW_AGENCY";

export function trackLocationEvent(payload: {
  type: LocationEventType;
  locationId?: string | null;
  listingId?: string;
  agentId?: string;
  agencyId?: string;
  metadata?: Record<string, unknown>;
}) {
  fetch("/api/events/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}
