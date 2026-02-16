import Link from "next/link";

export function NearbyAgentsCard({ data }: { data: any }) {
  const agents = data?.agents ?? [];
  const agencies = data?.agencies ?? [];
  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Nearby partners
      </h3>
      <div className="mt-3 space-y-2">
        {agents.slice(0, 5).map((agent: any) => (
          <Link
            key={agent.id}
            href={`/profiles/users/${agent.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm hover:border-emerald-300"
          >
            <span className="font-medium text-foreground">
              {agent.name ?? "Agent"}
            </span>
            <span className="text-xs text-muted-foreground">
              {agent.verifiedListingsCount ?? 0} listings
            </span>
          </Link>
        ))}
        {agencies.slice(0, 3).map((agency: any) => (
          <Link
            key={agency.id}
            href={`/profiles/companies/${agency.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm hover:border-emerald-300"
          >
            <span className="font-medium text-foreground">
              {agency.name ?? "Agency"}
            </span>
            <span className="text-xs text-muted-foreground">
              {agency.verifiedListingsCount ?? 0} listings
            </span>
          </Link>
        ))}
        {!agents.length && !agencies.length ? (
          <p className="text-sm text-muted-foreground">
            No nearby partners available right now.
          </p>
        ) : null}
      </div>
    </section>
  );
}
