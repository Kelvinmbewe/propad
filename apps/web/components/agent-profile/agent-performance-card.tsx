export function AgentPerformanceCard({ stats }: { stats: any }) {
  const format = (value: number | null) =>
    typeof value === "number" && Number.isFinite(value)
      ? `US$${Math.round(value).toLocaleString()}`
      : "N/A";

  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Performance
      </h3>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Average sale price</span>
          <span className="font-semibold">
            {format(stats?.averageSalePrice ?? null)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Average rent</span>
          <span className="font-semibold">
            {format(stats?.averageRentPrice ?? null)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Listings last 30d</span>
          <span className="font-semibold">{stats?.listingsLast30d ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Active listings</span>
          <span className="font-semibold">{stats?.activeListings ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Verified listings</span>
          <span className="font-semibold">{stats?.verifiedListings ?? 0}</span>
        </div>
      </div>
    </section>
  );
}
