import Link from "next/link";

export function NearbyPartners({ data }: { data: any }) {
  const agencies = (data?.agencies ?? []).slice(0, 4);
  const agents = (data?.agents ?? []).slice(0, 4);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Nearby partners
      </h3>
      <div className="mt-3 space-y-2">
        {agencies.map((agency: any) => (
          <Link
            key={`agency-${agency.id}`}
            href={`/profiles/companies/${agency.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm hover:border-emerald-300"
          >
            <span className="font-medium text-foreground">{agency.name}</span>
            <span className="text-xs text-muted-foreground">
              Trust {Math.round(Number(agency.trustScore ?? 0))}
            </span>
          </Link>
        ))}
        {agents.map((agent: any) => (
          <Link
            key={`agent-${agent.id}`}
            href={`/profiles/users/${agent.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm hover:border-emerald-300"
          >
            <span className="font-medium text-foreground">{agent.name}</span>
            <span className="text-xs text-muted-foreground">
              Trust {Math.round(Number(agent.trustScore ?? 0))}
            </span>
          </Link>
        ))}
        {!agencies.length && !agents.length ? (
          <p className="text-sm text-muted-foreground">
            No nearby partners available yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
