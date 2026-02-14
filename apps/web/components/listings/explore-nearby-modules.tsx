"use client";

export function ExploreNearbyModules({
  location,
  popularSuburbs,
  cities,
  market,
  onUseQuery,
}: {
  location: string;
  popularSuburbs: Array<{
    id: string;
    name: string;
    city?: string | null;
    count?: number;
  }>;
  cities: Array<{
    id: string;
    name: string;
    province?: string | null;
    count?: number;
  }>;
  market: {
    medianAskingPrice?: number | null;
    new30d: number;
    verifiedPercent?: number | null;
  };
  onUseQuery: (q: string) => void;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Popular nearby suburbs
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {popularSuburbs.slice(0, 10).map((area) => (
            <button
              key={area.id}
              type="button"
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700"
              onClick={() => onUseQuery(area.name)}
            >
              {area.name}
            </button>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Explore cities
        </h3>
        <div className="mt-3 grid gap-2">
          {cities.slice(0, 6).map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => onUseQuery(city.name)}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left hover:border-cyan-200 hover:bg-cyan-50"
            >
              <span className="text-sm font-medium text-slate-800">
                {city.name}
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {(city.count ?? 0).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Market snapshot
        </h3>
        <p className="mt-1 text-xs text-slate-500">{location}</p>
        <div className="mt-4 grid gap-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Median asking price
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {typeof market.medianAskingPrice === "number"
                ? `US$${Math.round(market.medianAskingPrice).toLocaleString()}`
                : "N/A"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              New listings (30 days)
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {market.new30d.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Verified share
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {typeof market.verifiedPercent === "number"
                ? `${market.verifiedPercent.toFixed(1)}%`
                : "N/A"}
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
