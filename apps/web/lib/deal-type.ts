export type DealType = "RENT" | "SALE";

export function resolveDealTypeFromValue(value: unknown): DealType | null {
  if (value == null) return null;
  const normalized = String(value).trim().toUpperCase();
  if (normalized === "RENT") return "RENT";
  if (normalized === "SALE") return "SALE";
  return null;
}

export function resolveDealTypeFromApplicationType(
  applicationType: unknown,
): DealType {
  const normalized = String(applicationType ?? "")
    .trim()
    .toUpperCase();
  return normalized === "BUY_APPLICATION" ? "SALE" : "RENT";
}

export function formatDealTypeLabel(value: unknown): string {
  const type = resolveDealTypeFromValue(value);
  if (type === "RENT") return "Rent";
  if (type === "SALE") return "Sale";
  return "Unknown";
}
