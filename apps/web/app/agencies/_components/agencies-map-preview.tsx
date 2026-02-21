"use client";

import dynamic from "next/dynamic";

const AgenciesMapPreviewCanvas = dynamic(
  () =>
    import("@/app/agencies/_components/agencies-map-preview-canvas").then(
      (module) => module.AgenciesMapPreviewCanvas,
    ),
  { ssr: false },
);

export function AgenciesMapPreview({
  center,
  items,
}: {
  center: { lat: number; lng: number };
  items: any[];
}) {
  const markers = (items ?? [])
    .map((item) => ({
      id: item.id,
      lat: Number(item?.location?.lat),
      lng: Number(item?.location?.lng),
      trustScore: Number(item?.trustScore ?? 0),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lng) &&
        item.lat !== 0 &&
        item.lng !== 0,
    )
    .slice(0, 40);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Nearby map preview
      </h3>
      <div className="mt-3">
        {markers.length ? (
          <AgenciesMapPreviewCanvas center={center} markers={markers} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted px-4 py-6 text-sm text-muted-foreground">
            Map pins will appear when agencies with geocoded listings are in
            range.
          </div>
        )}
      </div>
    </section>
  );
}
