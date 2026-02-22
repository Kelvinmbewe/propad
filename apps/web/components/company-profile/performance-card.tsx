function money(value: number | null | undefined, currency = "USD") {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "--";
  }
  return `${currency} ${Math.round(value).toLocaleString()}`;
}

export function PerformanceCard({
  data,
}: {
  data: {
    avgSalePrice: number | null;
    avgRentPrice: number | null;
    listingsLast30d: number;
    listingsPerMonth: number | null;
    activeListingsCount: number;
    verifiedListingsCount: number;
  };
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Performance
      </h3>
      <div className="mt-3 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Avg sale price</span>
          <span className="font-semibold text-foreground">
            {money(data.avgSalePrice)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Avg rent</span>
          <span className="font-semibold text-foreground">
            {money(data.avgRentPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Listings last 30 days</span>
          <span className="font-semibold text-foreground">
            {data.listingsLast30d}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Listings per month</span>
          <span className="font-semibold text-foreground">
            {data.listingsPerMonth ?? "--"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Active listings</span>
          <span className="font-semibold text-foreground">
            {data.activeListingsCount}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Verified listings</span>
          <span className="font-semibold text-foreground">
            {data.verifiedListingsCount}
          </span>
        </div>
      </div>
    </section>
  );
}
