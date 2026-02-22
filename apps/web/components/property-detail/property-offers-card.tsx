import { Sparkles } from "lucide-react";

function item(label: string, value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;
  return { label, value: String(value) };
}

export function PropertyOffersCard({
  bedrooms,
  bathrooms,
  floorArea,
  propertyType,
  furnished,
  parking,
  extras,
  createdAt,
  updatedAt,
}: {
  bedrooms?: number | null;
  bathrooms?: number | null;
  floorArea?: number | null;
  propertyType: string;
  furnished?: string | null;
  parking?: number | null;
  extras: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}) {
  const items = [
    item("Bedrooms", bedrooms),
    item("Bathrooms", bathrooms),
    item("Floor area", floorArea ? `${Math.round(floorArea)} m2` : null),
    item("Property type", propertyType.replaceAll("_", " ").toLowerCase()),
    furnished && furnished !== "NONE" ? item("Furnished", furnished) : null,
    parking ? item("Parking", parking) : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-500" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          What this property offers
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((entry) => (
          <div
            key={entry.label}
            className="rounded-xl border border-border bg-background px-3 py-2"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {entry.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {entry.value}
            </p>
          </div>
        ))}
      </div>

      {extras.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {extras.map((extra) => (
            <span
              key={extra}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300"
            >
              {extra}
            </span>
          ))}
        </div>
      ) : null}

      {createdAt || updatedAt ? (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {createdAt ? (
            <span>Added {new Date(createdAt).toLocaleDateString()}</span>
          ) : null}
          {updatedAt ? (
            <span>Updated {new Date(updatedAt).toLocaleDateString()}</span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
