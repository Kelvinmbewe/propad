import Link from "next/link";

function buildListingLink(intent: "FOR_SALE" | "TO_RENT", area: string) {
  const query = new URLSearchParams();
  query.set("intent", intent);
  query.set("q", area);
  query.set("verifiedOnly", "true");
  return `/listings?${query.toString()}`;
}

export function QuickLinks({ city }: { city: string }) {
  const area = city || "Harare";
  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Quick links
      </h3>
      <div className="mt-3 space-y-2 text-sm">
        <Link
          href={buildListingLink("FOR_SALE", area)}
          className="block rounded-lg border border-border bg-background px-3 py-2 hover:border-emerald-300"
        >
          Properties for sale in {area}
        </Link>
        <Link
          href={buildListingLink("TO_RENT", area)}
          className="block rounded-lg border border-border bg-background px-3 py-2 hover:border-emerald-300"
        >
          Properties to rent in {area}
        </Link>
        <Link
          href={`/listings?${new URLSearchParams({ q: area, verifiedOnly: "true" }).toString()}`}
          className="block rounded-lg border border-border bg-background px-3 py-2 hover:border-emerald-300"
        >
          Verified listings near agents in {area}
        </Link>
      </div>
    </section>
  );
}
